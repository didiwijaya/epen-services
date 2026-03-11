const express = require('express');
const cors = require('cors');
const { Kafka } = require('kafkajs');

const app = express();
const PORT = process.env.PORT || 3000;

// Konfigurasi Kafka – konsumsi read-model events
const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9094').split(',');
const kafka = new Kafka({
  clientId: 'rekanan-realtime-viewer',
  brokers: kafkaBrokers,
});

const consumer = kafka.consumer({ groupId: 'rekanan-realtime-viewer-group' });

// State rekanan di memory, merefleksikan DB read
/** @type {Record<string, any>} */
const rekananStore = {};

// Koneksi SSE aktif
/** @type {Set<import('http').ServerResponse>} */
const sseClients = new Set();

app.use(cors());
app.use(express.static(__dirname + '/public'));

// Endpoint SSE untuk push update ke browser
app.get('/events', (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  // Kirim snapshot awal dari state in-memory (cerminan DB read)
  res.write(`data: ${JSON.stringify(Object.values(rekananStore))}\n\n`);

  sseClients.add(res);
  req.on('close', () => {
    sseClients.delete(res);
  });
});

function broadcastRekanan() {
  const payload = JSON.stringify(Object.values(rekananStore));
  for (const client of sseClients) {
    client.write(`data: ${payload}\n\n`);
  }
}

async function startKafkaConsumer() {
  await consumer.connect();
  console.log('[Kafka] Consumer connected (rekanan-realtime, read-model)');

  await consumer.subscribe({
    topics: [process.env.READ_TOPIC || 'rekanan.read-model'],
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      const key = message.key?.toString();
      const valueStr = message.value?.toString() || '{}';
      let payload;
      try {
        payload = JSON.parse(valueStr);
      } catch (e) {
        console.error('[Kafka] Failed to parse message value', e);
        return;
      }

      const eventType = payload.eventType;
      console.log('='.repeat(40));
      console.log(`[Kafka] Topic: ${topic}, Partition: ${partition}`);
      console.log(`[Kafka] Key: ${key}`);
      console.log(`[Kafka] EventType: ${eventType}`);
      console.log('[Kafka] Payload:', payload);

      if (eventType === 'rekanan.read.changed') {
        const id = String(payload.id);
        rekananStore[id] = {
          id: payload.id,
          nama: payload.nama,
          npwp: payload.npwp,
          kode_usaha: payload.kode_usaha,
          status: payload.status,
        };
        broadcastRekanan();
      } else {
        console.log('[Kafka] Unknown read-model event type, ignored');
      }
    },
  });
}

app.listen(PORT, () => {
  console.log(`Rekanan realtime viewer service running on http://localhost:${PORT}`);
});

startKafkaConsumer().catch((err) => {
  console.error('[Kafka] Consumer error:', err);
  process.exit(1);
});

