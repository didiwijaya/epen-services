import { Module } from '@nestjs/common';
import { OrganisasiController } from './organisasi.controller';
import { OrganisasiService } from './organisasi.service';

@Module({
  controllers: [OrganisasiController],
  providers: [OrganisasiService],
})
export class OrganisasiModule {}
