import { Module } from '@nestjs/common';
import { RekeningGajiController } from './rekening-gaji.controller';
import { RekeningGajiService } from './rekening-gaji.service';

@Module({
  controllers: [RekeningGajiController],
  providers: [RekeningGajiService],
})
export class RekeningGajiModule {}
