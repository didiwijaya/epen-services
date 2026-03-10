import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { RekeningGajiService } from './rekening-gaji.service';

@Controller('rekening-gaji')
export class RekeningGajiController {
  constructor(private readonly service: RekeningGajiService) {}

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 15,
    @Query('nip') nip?: string,
    @Query('nama') nama?: string,
    @Query('bank') bank?: string,
  ) {
    const result = this.service.findAll(+page, +perPage, nip, nama, bank);
    return {
      success: true,
      message: 'Daftar rekening gaji berhasil diambil',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const data = this.service.findOne(id);
    return {
      success: true,
      message: 'Detail rekening gaji berhasil diambil',
      data,
    };
  }
}
