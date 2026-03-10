import { Controller, Get, Query, ParseIntPipe } from '@nestjs/common';
import { DropdownService } from './dropdown.service';

@Controller('dropdown')
export class DropdownController {
  constructor(private readonly service: DropdownService) {}

  @Get('akun')
  getAkun(
    @Query('level') level?: number,
    @Query('parent_kode') parentKode?: string,
    @Query('search') search?: string,
  ) {
    const data = this.service.getAkun(level ? +level : undefined, parentKode, search);
    return {
      success: true,
      message: 'Daftar kode akun berhasil diambil',
      data,
    };
  }

  @Get('satuan')
  getSatuan() {
    return {
      success: true,
      message: 'Daftar satuan berhasil diambil',
      data: this.service.getSatuan(),
    };
  }

  @Get('bidang')
  getBidang() {
    return {
      success: true,
      message: 'Daftar bidang berhasil diambil',
      data: this.service.getBidang(),
    };
  }

  @Get('program')
  getProgram(@Query('bidang_id', ParseIntPipe) bidangId: number) {
    const data = this.service.getProgram(bidangId);
    return {
      success: true,
      message: 'Daftar program berhasil diambil',
      data,
    };
  }

  @Get('kegiatan')
  getKegiatan(@Query('program_id', ParseIntPipe) programId: number) {
    const data = this.service.getKegiatan(programId);
    return {
      success: true,
      message: 'Daftar kegiatan berhasil diambil',
      data,
    };
  }

  @Get('sub-kegiatan')
  getSubKegiatan(@Query('kegiatan_id', ParseIntPipe) kegiatanId: number) {
    const data = this.service.getSubKegiatan(kegiatanId);
    return {
      success: true,
      message: 'Daftar sub-kegiatan berhasil diambil',
      data,
    };
  }
}
