import { Module } from '@nestjs/common';
import { RekeningPenerimaController } from './rekening-penerima.controller';
import { RekeningPenerimaService } from './rekening-penerima.service';

@Module({
  controllers: [RekeningPenerimaController],
  providers: [RekeningPenerimaService],
  exports: [RekeningPenerimaService],
})
export class RekeningPenerimaModule {}
