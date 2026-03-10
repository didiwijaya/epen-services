import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { OrganisasiService } from './organisasi.service';

@Controller('organisasi')
export class OrganisasiController {
  constructor(private readonly service: OrganisasiService) {}

  @Get()
  findAll(
    @Query('tipe') tipe?: string,
    @Query('parent_id') parentId?: number,
  ) {
    const data = this.service.findAll(tipe, parentId ? +parentId : undefined);
    return {
      success: true,
      message: 'Daftar organisasi berhasil diambil',
      data,
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const data = this.service.findOne(id);
    return {
      success: true,
      message: 'Detail organisasi berhasil diambil',
      data,
    };
  }
}
