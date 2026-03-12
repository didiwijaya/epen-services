import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, Producer, ProducerRecord } from 'kafkajs';
import {
  retry,
  circuitBreaker,
  timeout,
  wrap,
  handleAll,
  ExponentialBackoff,
  ConsecutiveBreaker,
  TimeoutStrategy,
  isBrokenCircuitError,
  CircuitState,
} from 'cockatiel';
import { kafkaConfig } from './kafka.config';

const TOPICS = [
  { topic: 'master-data.rekanan', numPartitions: 3, replicationFactor: 1 },
  { topic: 'master-data.events', numPartitions: 1, replicationFactor: 1 },
];

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaProducerService.name);
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;

  // ── Resilience policies ─────────────────────────────────────────────────

  /** Timeout: batalkan send jika tidak selesai dalam 5 detik */
  private readonly timeoutPolicy = timeout(5_000, TimeoutStrategy.Aggressive);

  /**
   * Retry: coba ulang hingga 3x dengan exponential backoff.
   * Jeda awal 500ms, maks 10 detik antar retry.
   */
  private readonly retryPolicy = retry(handleAll, {
    maxAttempts: 3,
    backoff: new ExponentialBackoff({ initialDelay: 500, maxDelay: 10_000 }),
  });

  /**
   * Circuit Breaker: buka circuit setelah 5 kegagalan berturut-turut.
   * Tunggu 30 detik sebelum coba HALF-OPEN.
   */
  private readonly circuitBreakerPolicy = circuitBreaker(handleAll, {
    halfOpenAfter: 30_000,
    breaker: new ConsecutiveBreaker(5),
  });

  /**
   * Combined: Circuit Breaker → Retry → Timeout (per attempt)
   *
   * Urutan ini penting:
   * - timeout    : batas 5s per percobaan (paling dalam)
   * - retry      : ulangi hingga 3x jika timeout/error
   * - circuitBreaker: catat 1 kegagalan jika semua retry habis;
   *                   langsung fail fast ketika CB OPEN (tanpa retry)
   */
  private readonly sendPolicy = wrap(
    this.circuitBreakerPolicy,
    this.retryPolicy,
    this.timeoutPolicy,
  );

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
    this.producer = this.kafka.producer();
    this.admin = this.kafka.admin();

    // Monitor perubahan status circuit breaker
    this.circuitBreakerPolicy.onBreak(() =>
      this.logger.error(
        '[CircuitBreaker] Kafka CB → OPEN — 5 kegagalan berturut. Fail fast aktif selama 30 detik.',
      ),
    );
    this.circuitBreakerPolicy.onHalfOpen(() =>
      this.logger.warn('[CircuitBreaker] Kafka CB → HALF-OPEN — mencoba pemulihan...'),
    );
    this.circuitBreakerPolicy.onReset(() =>
      this.logger.log('[CircuitBreaker] Kafka CB → CLOSED — koneksi normal kembali.'),
    );
  }

  async onModuleInit() {
    await this.admin.connect();
    await this.ensureTopics();
    await this.admin.disconnect();

    await this.producer.connect();
    this.logger.log('[Kafka] Producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    this.logger.log('[Kafka] Producer disconnected');
  }

  private async ensureTopics(): Promise<void> {
    const existing = await this.admin.listTopics();
    const toCreate = TOPICS.filter((t) => !existing.includes(t.topic));

    if (toCreate.length > 0) {
      await this.admin.createTopics({ topics: toCreate });
      this.logger.log(`[Kafka] Topics created: ${toCreate.map((t) => t.topic).join(', ')}`);
    } else {
      this.logger.log('[Kafka] Topics already exist');
    }
  }

  async sendEvent(topic: string, key: string, value: any): Promise<void> {
    const record: ProducerRecord = {
      topic,
      messages: [
        {
          key,
          value: JSON.stringify(value),
          headers: {
            'event-type': topic,
            timestamp: new Date().toISOString(),
            source: 'master-data-service',
          },
        },
      ],
    };

    try {
      await this.sendPolicy.execute(() => this.producer.send(record));
      this.logger.log(
        `[Kafka] Event sent → topic: ${topic}, key: ${key}, eventType: ${value.eventType}`,
      );
    } catch (error) {
      if (isBrokenCircuitError(error)) {
        this.logger.error(
          `[Kafka] Circuit OPEN — event dropped (topic: ${topic}, key: ${key}). Kafka mungkin down.`,
        );
      } else {
        this.logger.error(
          `[Kafka] Gagal kirim event ke ${topic} setelah 3x retry: ${String(error)}`,
        );
      }
      // Tidak throw — Kafka failure tidak boleh break REST API
    }
  }

  /** Status circuit breaker saat ini (untuk health endpoint) */
  getCircuitBreakerState(): string {
    return CircuitState[this.circuitBreakerPolicy.state] ?? 'Unknown';
  }
}
