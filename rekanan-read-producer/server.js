const mysql = require('mysql2/promise');
const { Kafka } = require('kafkajs');

// Konfigurasi MySQL read (product_read)
const dbConfig = {
  host: process.env.MYSQL_READ_HOST || 'mysql-read',
  port: Number(process.env.MYSQL_READ_PORT || '3306'),
  user: process.env.MYSQL_READ_USER || 'user',
  password: process.env.MYSQL_READ_PASSWORD || 'userpassword',
  database: process.env.MYSQL_READ_DATABASE || 'product_read',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 10_000,
};

// Konfigurasi Kafka
const kafkaBrokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
const kafka = new Kafka({
  clientId: 'rekanan-read-producer',
  brokers: kafkaBrokers,
});

const producer = kafka.producer();

/** @type {mysql.Pool | null} */
let pool = null;

// Simpan timestamp terakhir yang sudah dikirim
let lastSeenUpdatedAt = null;

// ── Simple Circuit Breaker untuk Kafka send ───────────────────────────────
const CB_FAILURE_THRESHOLD = 5;
const CB_COOLDOWN_MS = 30_000;

let cbFailureCount = 0;
let cbState = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
let cbOpenedAt = null;

function cbRecordSuccess() {
  if (cbState !== 'CLOSED') {
    console.log('[CircuitBreaker] Kafka CB → CLOSED (pemulihan berhasil)');
  }
  cbState = 'CLOSED';
  cbFailureCount = 0;
  cbOpenedAt = null;
}

function cbRecordFailure() {
  cbFailureCount++;
  if (cbFailureCount >= CB_FAILURE_THRESHOLD && cbState === 'CLOSED') {
    cbState = 'OPEN';
    cbOpenedAt = Date.now();
    console.error(
      `[CircuitBreaker] Kafka CB → OPEN (${cbFailureCount} kegagalan berturut). Fail fast aktif ${CB_COOLDOWN_MS / 1000}s.`,
    );
  }
}

function cbIsAllowed() {
  if (cbState === 'CLOSED') return true;
  if (cbState === 'OPEN') {
    if (Date.now() - cbOpenedAt >= CB_COOLDOWN_MS) {
      cbState = 'HALF_OPEN';
      cbFailureCount = 0;
      console.warn('[CircuitBreaker] Kafka CB → HALF-OPEN (mencoba pemulihan)');
      return true; // izinkan 1 trial call
    }
    return false; // masih dalam cooldown
  }
  if (cbState === 'HALF_OPEN') return true;
  return false;
}

// ── Retry helper dengan exponential backoff ───────────────────────────────
async function withRetry(fn, label, maxAttempts = 3, baseDelayMs = 500) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`[Retry] ${label} — attempt ${attempt}/${maxAttempts} gagal, retry dalam ${delay}ms: ${err.message}`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────

async function initDb() {
  pool = await mysql.createPool(dbConfig);
  console.log('[ReadProducer] Connected to MySQL read database (product_read)');
}

async function initKafka() {
  await producer.connect();
  console.log('[ReadProducer] Kafka producer connected');
}

async function fetchChangedRekanan() {
  if (!pool) throw new Error('DB pool not initialized');

  let sql = `
    SELECT id, nama, npwp, npwp_clean, kode_usaha, alamat, kota, telepon,
           email, kode_swift, status, nama_lower, created_at, updated_at
    FROM rekanan
  `;
  const params = [];
  if (lastSeenUpdatedAt) {
    sql += ' WHERE updated_at > ?';
    params.push(lastSeenUpdatedAt);
  }
  sql += ' ORDER BY updated_at ASC LIMIT 500';

  const [rows] = await pool.execute(sql, params);
  return Array.isArray(rows) ? rows : [];
}

function toEvent(row) {
  return {
    eventType: 'rekanan.read.changed',
    version: 1,
    id: row.id,
    nama: row.nama,
    npwp: row.npwp,
    kode_usaha: row.kode_usaha,
    alamat: row.alamat,
    kota: row.kota,
    telepon: row.telepon,
    email: row.email,
    kode_swift: row.kode_swift,
    status: row.status,
    updated_at: row.updated_at,
  };
}

async function pollAndPublish() {
  // 1. Fetch dari DB dengan retry
  let rows;
  try {
    rows = await withRetry(
      () => fetchChangedRekanan(),
      'fetchChangedRekanan',
      3,
      500,
    );
  } catch (err) {
    console.error('[ReadProducer] DB query gagal setelah 3x retry:', err.message);
    return;
  }

  if (rows.length === 0) return;

  // 2. Kirim ke Kafka dengan circuit breaker + retry
  if (!cbIsAllowed()) {
    console.warn('[ReadProducer] Circuit OPEN — skip Kafka send, menunggu cooldown...');
    return;
  }

  const messages = rows.map((row) => ({
    key: String(row.id),
    value: JSON.stringify(toEvent(row)),
  }));

  try {
    await withRetry(
      () =>
        producer.send({
          topic: process.env.READ_TOPIC || 'rekanan.read-model',
          messages,
        }),
      'kafkaSend',
      3,
      500,
    );

    cbRecordSuccess();
    lastSeenUpdatedAt = rows[rows.length - 1].updated_at;
    console.log(
      `[ReadProducer] Sent ${messages.length} rekanan.read-model events. lastSeen=${lastSeenUpdatedAt}`,
    );
  } catch (err) {
    cbRecordFailure();
    console.error('[ReadProducer] Kafka send gagal setelah 3x retry:', err.message);
  }
}

async function bootstrap() {
  await initDb();
  await initKafka();

  const intervalMs = Number(process.env.POLL_INTERVAL_MS || '2000');
  console.log(
    `[ReadProducer] Started. Poll interval: ${intervalMs}ms, topic: ${
      process.env.READ_TOPIC || 'rekanan.read-model'
    }`,
  );

  setInterval(pollAndPublish, intervalMs);
}

bootstrap().catch((err) => {
  console.error('[ReadProducer] Fatal error on bootstrap', err);
  process.exit(1);
});
