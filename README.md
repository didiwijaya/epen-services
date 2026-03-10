# epen-services

Kumpulan microservices untuk platform **E-Penatausahaan 2026** Pemerintah Provinsi Jawa Tengah.
Dibangun menggunakan pendekatan **Strangler Fig Pattern** — memisahkan bounded context secara bertahap dari monolith Laravel yang ada.

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    API Gateway / SSO                     │
└──────────────┬──────────────────────────────────────────┘
               │
   ┌───────────┴────────────────────────────────┐
   │              Kafka (Message Broker)         │
   │         topic: master-data.rekanan          │
   │         topic: master-data.events           │
   └───────────┬────────────────────────────────┘
               │
┌──────────────▼──────────────┐
│   master-data-service :8001  │  ← REST API + Kafka Producer/Consumer
│   NestJS · In-memory store   │
└─────────────────────────────┘
```

### Bounded Context (Rencana 4 Service)

| Service | Port | Status | Tanggung Jawab |
|---|---|---|---|
| **master-data** | 8001 | ✅ Implemented | Data rekanan, rekening, organisasi, referensi |
| **reporting** | 8002 | 📋 OpenAPI ready | Cetak dokumen SPJ, laporan keuangan |
| **tte-tnde** | 8003 | 📋 OpenAPI ready | Tanda tangan elektronik, naskah dinas |
| **contract** | 8004 | 📋 OpenAPI ready | Manajemen kontrak & addendum |

---

## Struktur Folder

```
epen-services/
├── docker-compose.yml          # Kafka + Kafka UI + Master Data Service
├── openapi/                    # OpenAPI 3.0 contract (semua service)
│   ├── master-data-service.yaml
│   ├── reporting-service.yaml
│   ├── tte-tnde-service.yaml
│   └── contract-service.yaml
└── master-data/                # NestJS Master Data Service
    ├── Dockerfile
    ├── src/
    │   ├── main.ts
    │   ├── app.module.ts
    │   ├── kafka/              # Kafka Producer + Consumer
    │   ├── rekanan/            # CRUD rekanan/vendor
    │   ├── rekening-penerima/  # Rekening vendor
    │   ├── rekening-gaji/      # Rekening gaji pegawai
    │   ├── virtual-account/    # VA per SKPD
    │   ├── organisasi/         # Struktur bidang/SKPD/unit kerja
    │   └── dropdown/           # Referensi akun, satuan, program, kegiatan
    └── package.json
```

---

## Cara Menjalankan

### Prasyarat

- Docker & Docker Compose
- Node.js 22+ (opsional, untuk development lokal)

### 1. Jalankan semua service via Docker

```bash
docker compose up -d
```

Service yang berjalan:

| Container | URL | Keterangan |
|---|---|---|
| `master-data-service` | http://localhost:8001/api/v1 | REST API |
| `kafka` | localhost:9094 | Kafka broker (dari host) |
| `kafka-ui` | http://localhost:8090 | Monitoring Kafka |

### 2. Development lokal (tanpa Docker)

```bash
# Jalankan Kafka dulu
docker compose up -d kafka

# Masuk ke folder service
cd master-data
npm install

# Jalankan dalam mode dev
KAFKA_BROKERS=localhost:9094 npm run start:dev
```

---

## Master Data Service API

**Base URL:** `http://localhost:8001/api/v1`

### Rekanan (Vendor)

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/rekanan` | Daftar rekanan (pagination, filter search/status/kode_usaha) |
| `POST` | `/rekanan` | Tambah rekanan baru → **emit Kafka event** |
| `GET` | `/rekanan/lookup` | Lookup cepat by NPWP / nama / kode_swift |
| `GET` | `/rekanan/:id` | Detail rekanan |
| `PUT` | `/rekanan/:id` | Update rekanan → **emit Kafka event** |
| `DELETE` | `/rekanan/:id` | Soft delete (nonaktifkan) → **emit Kafka event** |

#### Contoh: Tambah Rekanan

```bash
curl -X POST http://localhost:8001/api/v1/rekanan \
  -H "Content-Type: application/json" \
  -d '{
    "nama": "CV Maju Jaya",
    "npwp": "01.234.567.8-901.000",
    "alamat": "Jl. Pemuda No. 10, Semarang",
    "kota": "Semarang",
    "email": "majujaya@example.com"
  }'
```

### Rekening Penerima

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/rekening-penerima` | Daftar (filter rekanan_id, bank) |
| `POST` | `/rekening-penerima` | Tambah rekening |
| `GET` | `/rekening-penerima/:id` | Detail |
| `PUT` | `/rekening-penerima/:id` | Update |

### Rekening Gaji

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/rekening-gaji` | Daftar (filter nip, nama, bank) |
| `GET` | `/rekening-gaji/:id` | Detail |

### Virtual Account

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/virtual-account` | Daftar (filter skpd_id) |
| `POST` | `/virtual-account` | Tambah VA |

### Organisasi

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/organisasi` | Daftar (filter tipe: bidang/skpd/unit_kerja) |
| `GET` | `/organisasi/:id` | Detail + child units |

### Dropdown / Referensi

| Method | Endpoint | Keterangan |
|---|---|---|
| `GET` | `/dropdown/akun` | Kode rekening anggaran (filter level, parent_kode) |
| `GET` | `/dropdown/satuan` | Satuan barang/jasa |
| `GET` | `/dropdown/bidang` | Bidang urusan pemerintahan |
| `GET` | `/dropdown/program` | Program (wajib: `?bidang_id=`) |
| `GET` | `/dropdown/kegiatan` | Kegiatan (wajib: `?program_id=`) |
| `GET` | `/dropdown/sub-kegiatan` | Sub-kegiatan (wajib: `?kegiatan_id=`) |

### Format Response

```json
{
  "success": true,
  "message": "Daftar rekanan berhasil diambil",
  "data": [...],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 3,
    "last_page": 1
  }
}
```

---

## Kafka Event-Driven

### Topics

| Topic | Partisi | Producer | Consumer |
|---|---|---|---|
| `master-data.rekanan` | 3 | master-data-service | Monolith, service lain |
| `master-data.events` | 1 | Monolith / service lain | master-data-service |

### Event Schema (`master-data.rekanan`)

```json
{
  "eventType": "rekanan.created",
  "version": 1,
  "rekananId": 4,
  "nama": "CV Maju Jaya",
  "npwp": "01.234.567.8-901.000",
  "kode_usaha": "6201",
  "status": "aktif",
  "timestamp": "2026-03-10T04:51:34.321Z"
}
```

Event types yang diproduksi:
- `rekanan.created` — saat `POST /rekanan`
- `rekanan.updated` — saat `PUT /rekanan/:id`
- `rekanan.deactivated` — saat `DELETE /rekanan/:id`

### Monitoring Kafka

Buka **http://localhost:8090** untuk melihat:
- Topics & messages
- Consumer groups & lag
- Partisi & offset

---

## Validasi Request

Service menggunakan `class-validator` dengan `ValidationPipe` global.

Contoh error validasi (422):

```bash
curl -X POST http://localhost:8001/api/v1/rekanan \
  -H "Content-Type: application/json" \
  -d '{"nama": "Test"}'

# Response:
{
  "message": [
    "Format NPWP tidak valid. Contoh: 01.234.567.8-901.000",
    "alamat should not be empty"
  ],
  "error": "Bad Request",
  "statusCode": 400
}
```

---

## Environment Variables

| Variable | Default | Keterangan |
|---|---|---|
| `PORT` | `8001` | Port HTTP server |
| `KAFKA_BROKERS` | `localhost:9094` | Kafka broker address |
| `NODE_ENV` | `development` | Environment |

Di Docker, `KAFKA_BROKERS` otomatis di-set ke `kafka:9092` (internal network).

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Framework | NestJS 11 (TypeScript) |
| Message Broker | Apache Kafka 3.8 (KRaft mode) |
| Kafka Client | kafkajs |
| Validation | class-validator + class-transformer |
| Container | Docker + Docker Compose |
| Storage | In-memory (no DB — fase awal migrasi) |

---

## OpenAPI / Swagger

File kontrak API tersedia di folder `openapi/`. Upload ke [Swagger Editor](https://editor.swagger.io/) atau import ke Postman.

| File | Service |
|---|---|
| `master-data-service.yaml` | Master Data Service |
| `reporting-service.yaml` | Reporting Service |
| `tte-tnde-service.yaml` | TTE/TNDE Service |
| `contract-service.yaml` | Contract Service |
