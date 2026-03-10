import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Admin, Kafka, Producer, ProducerRecord } from 'kafkajs';
import { kafkaConfig } from './kafka.config';

const TOPICS = [
  { topic: 'master-data.rekanan', numPartitions: 3, replicationFactor: 1 },
  { topic: 'master-data.events', numPartitions: 1, replicationFactor: 1 },
];

@Injectable()
export class KafkaProducerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });
    this.producer = this.kafka.producer();
    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    await this.admin.connect();
    await this.ensureTopics();
    await this.admin.disconnect();

    await this.producer.connect();
    console.log('[Kafka] Producer connected');
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    console.log('[Kafka] Producer disconnected');
  }

  private async ensureTopics(): Promise<void> {
    const existing = await this.admin.listTopics();
    const toCreate = TOPICS.filter((t) => !existing.includes(t.topic));

    if (toCreate.length > 0) {
      await this.admin.createTopics({ topics: toCreate });
      console.log(`[Kafka] Topics created: ${toCreate.map((t) => t.topic).join(', ')}`);
    } else {
      console.log(`[Kafka] Topics already exist`);
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
      await this.producer.send(record);
      process.stderr.write(`[Kafka] Event sent → topic: ${topic}, key: ${key}, eventType: ${value.eventType}\n`);
    } catch (error) {
      process.stderr.write(`[Kafka] Failed to send event to ${topic}: ${String(error)}\n`);
      // Jangan throw — Kafka failure tidak boleh break REST API
    }
  }
}
