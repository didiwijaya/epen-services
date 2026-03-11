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

async function toEvent(row) {
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
  try {
    const rows = await fetchChangedRekanan();
    if (rows.length === 0) {
      return;
    }

    const messages = [];
    for (const row of rows) {
      const event = await toEvent(row);
      messages.push({
        key: String(row.id),
        value: JSON.stringify(event),
      });
      lastSeenUpdatedAt = row.updated_at;
    }

    await producer.send({
      topic: process.env.READ_TOPIC || 'rekanan.read-model',
      messages,
    });

    console.log(
      `[ReadProducer] Sent ${messages.length} rekanan.read-model events. lastSeenUpdatedAt=${lastSeenUpdatedAt}`,
    );
  } catch (err) {
    console.error('[ReadProducer] pollAndPublish error', err);
  }
}

async function bootstrap() {
  await initDb();
  await initKafka();

  const intervalMs = Number(process.env.POLL_INTERVAL_MS || '2000');
  console.log(
    `[ReadProducer] Started. Poll interval: ${intervalMs} ms, topic: ${
      process.env.READ_TOPIC || 'rekanan.read-model'
    }`,
  );

  setInterval(pollAndPublish, intervalMs);
}

bootstrap().catch((err) => {
  console.error('[ReadProducer] Fatal error on bootstrap', err);
  process.exit(1);
});

