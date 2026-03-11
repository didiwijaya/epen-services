import { Module } from '@nestjs/common';
import { RekananController } from './rekanan.controller';
import { RekananService } from './rekanan.service';
import { RekananWriteRepository } from './rekanan-write.repository';
import { RekananReadRepository } from './rekanan-read.repository';
import { RekananSyncConsumerService } from './rekanan-sync.consumer';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [RekananController],
  providers: [
    RekananWriteRepository,
    RekananReadRepository,
    RekananService,
    RekananSyncConsumerService,
  ],
  exports: [RekananService],
})
export class RekananModule {}
