import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Kafka } from 'kafkajs';
import { RekananReadRepository } from './rekanan-read.repository';

const BROKERS = (process.env.KAFKA_BROKERS || 'localhost:9094').split(',');

@Injectable()
export class RekananSyncConsumerService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private consumer: ReturnType<Kafka['consumer']> | null = null;

  constructor(private readonly readRepo: RekananReadRepository) {
    this.kafka = new Kafka({
      clientId: 'master-data-rekanan-sync',
      brokers: BROKERS,
    });
  }

  async onModuleInit() {
    this.consumer = this.kafka.consumer({
      groupId: 'master-data-rekanan-read-sync-group',
    });
    await this.consumer.connect();
    await this.consumer.subscribe({
      topics: ['master-data.rekanan'],
      fromBeginning: false,
    });

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        const valueStr = message.value?.toString() || '{}';
        let payload: Record<string, unknown>;
        try {
          payload = JSON.parse(valueStr);
        } catch {
          return;
        }
        const eventType = payload.eventType as string;
        const rekananId = payload.rekananId as number;

        try {
          if (eventType === 'rekanan.deactivated') {
            await this.readRepo.setStatus(rekananId, 'nonaktif');
            console.log(`[RekananSync] Read model updated: rekanan ${rekananId} -> nonaktif`);
          }
          // rekanan.created / rekanan.updated sudah di-sync di request (syncReadModelFromWriteRow)
          // Event Kafka tidak membawa full payload (alamat, kota, dll) jadi tidak di-upsert di sini
        } catch (err) {
          console.error(`[RekananSync] Failed to sync rekanan ${rekananId}:`, err);
        }
      },
    });

    console.log('[RekananSync] Consumer subscribed to master-data.rekanan');
  }

  async onModuleDestroy() {
    if (this.consumer) {
      await this.consumer.disconnect();
      this.consumer = null;
      console.log('[RekananSync] Consumer disconnected');
    }
  }
}
