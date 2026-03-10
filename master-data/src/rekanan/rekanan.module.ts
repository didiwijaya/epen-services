import { Module } from '@nestjs/common';
import { RekananController } from './rekanan.controller';
import { RekananService } from './rekanan.service';
import { KafkaModule } from '../kafka/kafka.module';

@Module({
  imports: [KafkaModule],
  controllers: [RekananController],
  providers: [RekananService],
  exports: [RekananService],
})
export class RekananModule {}
