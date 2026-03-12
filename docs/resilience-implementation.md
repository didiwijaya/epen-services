# Implementasi Resilience Patterns — epen-services

> **Referensi:** Modul Pelatihan Microservices — *Mastering Microservices Architecture: Fundamental, Implementasi, dan Orkestrasi* (Hastari Utama, M.Cs — Yogyakarta, Maret 2026)
>
> Bagian 3: Ketahanan Sistem (Resilience) — Circuit Breaker, Retry, Timeout
> Bagian 4: Praktik Resilience — Uji Coba Ketahanan dengan Stress Test

---

## Latar Belakang

Dalam arsitektur microservices, service-service saling bergantung satu sama lain. Tanpa pola ketahanan yang tepat, kegagalan satu komponen (misalnya Kafka broker down) dapat menyebabkan **cascading failure** yang melumpuhkan seluruh sistem.

Sebelum implementasi ini, `epen-services` memiliki kondisi:

| Pattern      | Status Sebelum     |
|--------------|--------------------|
| Timeout      | ❌ Tidak ada        |
| Retry        | ❌ Tidak ada        |
| Circuit Breaker | ❌ Tidak ada     |
| Error handling | ✅ try-catch basic |
| Connection Pool | ✅ MySQL pool     |

---

## Pola yang Diimplementasikan

### 1. Timeout
Membatasi waktu maksimal setiap percobaan pengiriman event ke Kafka. Tanpa timeout, thread bisa terblokir hingga beberapa menit, menghabiskan resource.

**Konfigurasi:** 5 detik per percobaan (`TimeoutStrategy.Aggressive` — batalkan segera).

### 2. Retry dengan Exponential Backoff
Mengulang pengiriman yang gagal karena transient failure (network glitch, Kafka sedang sibuk sesaat).

**Konfigurasi:**
- Maksimal **3 percobaan**
- Backoff awal: **500ms**, maksimal: **10 detik**
- Jitter otomatis dari `ExponentialBackoff` untuk menghindari thundering herd

### 3. Circuit Breaker
Memantau tingkat kegagalan secara proaktif. Jika ambang batas tercapai, "memutus arus" sehingga semua request berikutnya langsung gagal cepat (*fail fast*) tanpa mencoba memanggil Kafka — memberi waktu recovery.

**State Machine:**

```
    ┌─────────────────────────────────────────────────────┐
    │                                                     │
    ▼                                                     │
 CLOSED ──── 5 kegagalan berturut ───► OPEN             │
 (normal)                              (fail fast 30s)   │
                                          │               │
                                    setelah 30 detik      │
                                          │               │
                                          ▼               │
                                       HALF-OPEN          │
                                    (trial call)          │
                                    /          \          │
                               gagal          berhasil ───┘
                                 │
                                 ▼
                               OPEN (cooldown ulang)
```

**Konfigurasi:**
- Buka setelah **5 kegagalan berturut-turut**
- Cooldown: **30 detik** di state OPEN
- Masuk HALF-OPEN setelah cooldown selesai

### 4. Urutan Policy (Kritis)

```
sendPolicy = wrap(circuitBreaker, retry, timeout)
```

Urutan ini penting:

```
circuitBreaker.execute(
  () => retry.execute(
    () => timeout.execute(
      () => producer.send(record)
    )
  )
)
```

| Layer | Peran |
|---|---|
| `timeout` (dalam) | Setiap percobaan dibatasi 5 detik |
| `retry` (tengah) | Ulangi hingga 3x jika timeout/error |
| `circuitBreaker` (luar) | Catat 1 failure jika semua retry habis; fail fast instan saat OPEN |

---

## File yang Diubah

### `master-data/src/kafka/kafka.producer.service.ts`

Library: [`cockatiel`](https://github.com/connor4312/cockatiel) v3.2.1

```typescript
// Policy definitions
private readonly timeoutPolicy = timeout(5_000, TimeoutStrategy.Aggressive);

private readonly retryPolicy = retry(handleAll, {
  maxAttempts: 3,
  backoff: new ExponentialBackoff({ initialDelay: 500, maxDelay: 10_000 }),
});

private readonly circuitBreakerPolicy = circuitBreaker(handleAll, {
  halfOpenAfter: 30_000,
  breaker: new ConsecutiveBreaker(5),
});

// Wrap: CB (luar) → Retry (tengah) → Timeout (dalam)
private readonly sendPolicy = wrap(
  this.circuitBreakerPolicy,
  this.retryPolicy,
  this.timeoutPolicy,
);
```

**Event listeners** untuk monitoring state transitions:
```typescript
this.circuitBreakerPolicy.onBreak(()    => logger.error('Kafka CB → OPEN'));
this.circuitBreakerPolicy.onHalfOpen(() => logger.warn('Kafka CB → HALF-OPEN'));
this.circuitBreakerPolicy.onReset(()   => logger.log('Kafka CB → CLOSED'));
```

**Method baru:** `getCircuitBreakerState()` — expose state untuk health endpoint.

---

### `master-data/src/database/database.config.ts`

Tambah `connectTimeout` agar koneksi MySQL tidak hang tanpa batas:

```typescript
connectTimeout: 10_000,  // 10 detik timeout koneksi (write & read pool)
```

---

### `rekanan-read-producer/server.js`

Karena service ini adalah plain Node.js (tanpa NestJS/TypeScript), resilience diimplementasikan secara manual:

**Retry helper:**
```javascript
async function withRetry(fn, label, maxAttempts = 3, baseDelayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      console.warn(`[Retry] ${label} — attempt ${attempt}/${maxAttempts} gagal, retry dalam ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

**Circuit breaker manual (state machine):**
```javascript
// Threshold: 5 kegagalan berturut, cooldown: 30 detik
let cbState = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
let cbFailureCount = 0;
let cbOpenedAt = null;
```

Diterapkan pada:
- **DB queries** (`fetchChangedRekanan`) — retry 3x, backoff 500ms
- **Kafka sends** (`producer.send`) — retry 3x + circuit breaker state check

---

## Hasil Pengujian

### Setup
- Tools: `curl` loop + `docker pause/unpause`
- Service: `master-data-service` (NestJS, port 8002)
- Kafka: `kafka` container

### Skenario & Hasil

#### Skenario 1 — Normal Operation (Circuit CLOSED)
```
POST /api/v1/rekanan → 201 Created ✅
LOG: [Kafka] Event sent → topic: master-data.rekanan, key: 15, eventType: rekanan.created
```

#### Skenario 2 — Kafka Down: Retry & Circuit Opens
```bash
docker pause kafka  # simulasi Kafka down
# Kirim 6 request POST berturut-turut
```

```
Request 1–5 → 201 Created ✅  (REST API tetap berjalan)
Request 1–4 LOG: [Kafka] Gagal kirim event setelah 3x retry: Operation timed out after 5000ms
Request 5   LOG: [CircuitBreaker] Kafka CB → OPEN — 5 kegagalan berturut. Fail fast aktif selama 30 detik.
```

**Observasi kritis:** Meskipun Kafka mati, semua POST request tetap **201 Created**. Kafka failure tidak mematikan REST API.

#### Skenario 3 — Fail Fast (Circuit OPEN)
```
# Kirim request saat circuit OPEN
Request 1–3 → 201 Created ✅  (instan, tanpa menunggu timeout!)
LOG: [Kafka] Circuit OPEN — event dropped (topic: master-data.rekanan, key: 24). Kafka mungkin down.
LOG: [Kafka] Circuit OPEN — event dropped (topic: master-data.rekanan, key: 25). Kafka mungkin down.
```

**Perbandingan response time:**
| Kondisi | Response Time | Alasan |
|---|---|---|
| Circuit CLOSED, Kafka normal | ~50ms | Normal |
| Circuit CLOSED, Kafka down | ~15–17 detik | Timeout (5s) × retry (3x) + backoff |
| Circuit OPEN (fail fast) | ~instan | Langsung rejected, tanpa network call |

#### Skenario 4 — Recovery (HALF-OPEN → CLOSED)
```bash
docker unpause kafka  # Kafka dihidupkan
sleep 32              # tunggu cooldown 30 detik
# Kirim 1 request
```

```
LOG: [CircuitBreaker] Kafka CB → HALF-OPEN — mencoba pemulihan...
LOG: [CircuitBreaker] Kafka CB → CLOSED — koneksi normal kembali.
LOG: [Kafka] Event sent → topic: master-data.rekanan, key: 26, eventType: rekanan.created
```

Sistem pulih **secara otomatis** tanpa restart atau intervensi manual.

### Ringkasan Test

| # | Skenario | HTTP Status | Circuit State | Keterangan |
|---|---|---|---|---|
| 1 | Normal | 201 ✅ | CLOSED | Event terkirim ke Kafka |
| 2 | Kafka down (retry) | 201 ✅ | CLOSED → OPEN | Retry 3x, lalu CB terbuka |
| 3 | Fail fast | 201 ✅ | OPEN | Instan, event di-drop |
| 4 | Recovery | 201 ✅ | HALF-OPEN → CLOSED | Pulih otomatis |

---

## Cara Monitoring Circuit Breaker

State circuit breaker dapat diakses via method `getCircuitBreakerState()` pada `KafkaProducerService`. Nilai yang dikembalikan: `"Closed"`, `"Open"`, atau `"HalfOpen"`.

Contoh integrasi ke health endpoint (opsional, untuk future work):

```typescript
// src/health/health.controller.ts
@Get('circuit-breaker')
getCircuitBreakerState() {
  return {
    kafka: this.kafkaProducer.getCircuitBreakerState(),
    timestamp: new Date().toISOString(),
  };
}
```

---

## Dependency

```json
// master-data/package.json
"cockatiel": "^3.2.1"
```

Install:
```bash
cd master-data
npm install cockatiel --legacy-peer-deps
```

---

## Kesimpulan

Implementasi ini memastikan `epen-services` tidak hanya berfungsi dalam kondisi ideal, tetapi juga **tangguh (resilient)** menghadapi skenario kegagalan nyata:

1. **Retry** — menangani transient failure secara otomatis tanpa intervensi manual
2. **Timeout** — mencegah thread leak akibat koneksi yang menggantung
3. **Circuit Breaker** — mencegah cascading failure dan menghemat resource saat dependency down
4. **Fallback** — REST API tetap melayani request meskipun Kafka sedang mati
5. **Self-healing** — sistem pulih sendiri setelah dependency kembali normal
