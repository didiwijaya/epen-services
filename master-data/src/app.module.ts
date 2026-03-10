import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { KafkaModule } from './kafka/kafka.module';
import { RekananModule } from './rekanan/rekanan.module';
import { RekeningPenerimaModule } from './rekening-penerima/rekening-penerima.module';
import { RekeningGajiModule } from './rekening-gaji/rekening-gaji.module';
import { VirtualAccountModule } from './virtual-account/virtual-account.module';
import { OrganisasiModule } from './organisasi/organisasi.module';
import { DropdownModule } from './dropdown/dropdown.module';

@Module({
  imports: [
    KafkaModule,
    RekananModule,
    RekeningPenerimaModule,
    RekeningGajiModule,
    VirtualAccountModule,
    OrganisasiModule,
    DropdownModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
