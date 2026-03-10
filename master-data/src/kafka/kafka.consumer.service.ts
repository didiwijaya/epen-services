import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import {
  Consumer,
  ConsumerSubscribeTopics,
  EachMessagePayload,
  Kafka,
} from 'kafkajs';
import { kafkaConfig } from './kafka.config';

@Injectable()
export class KafkaConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: Consumer;

  constructor() {
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId + '-consumer',
      brokers: kafkaConfig.brokers,
    });
    this.consumer = this.kafka.consumer({ groupId: kafkaConfig.groupId });
  }

  async onModuleInit() {
    await this.consumer.connect();
    console.log('[Kafka] Consumer connected');

    const topic: ConsumerSubscribeTopics = {
      topics: ['master-data.events'],
      fromBeginning: true,
    };
    await this.consumer.subscribe(topic);

    await this.consumer.run({
      eachMessage: async (payload: EachMessagePayload) => {
        const { topic, partition, message } = payload;
        const key = message.key?.toString();
        const value = message.value?.toString();
        const headers = message.headers;

        console.log('='.repeat(50));
        console.log(`[Kafka] Received message from topic: ${topic}`);
        console.log(`[Kafka] Partition: ${partition}`);
        console.log(`[Kafka] Key: ${key}`);
        console.log(`[Kafka] Headers:`, headers);
        console.log(`[Kafka] Value:`, JSON.parse(value || '{}'));
        console.log('='.repeat(50));

        await this.processEvent(JSON.parse(value || '{}'));
      },
    });
  }

  async onModuleDestroy() {
    await this.consumer.disconnect();
    console.log('[Kafka] Consumer disconnected');
  }

  private async processEvent(eventData: any): Promise<void> {
    const { eventType } = eventData;

    switch (eventType) {
      case 'rekanan.sync.requested':
        console.log(`[Kafka] Sync request received for rekanan: ${eventData.npwp}`);
        break;
      case 'organisasi.update.requested':
        console.log(`[Kafka] Organisasi update request from monolith: ${eventData.kode}`);
        break;
      default:
        console.log(`[Kafka] Unknown event type: ${eventType}`);
    }
  }
}
