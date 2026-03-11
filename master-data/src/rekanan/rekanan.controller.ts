import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RekananService } from './rekanan.service';
import { CreateRekananDto } from './dto/create-rekanan.dto';
import { UpdateRekananDto } from './dto/update-rekanan.dto';

@Controller('rekanan')
export class RekananController {
  constructor(private readonly rekananService: RekananService) {}

  @Get()
  async findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 15,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('kode_usaha') kodeUsaha?: string,
  ) {
    const result = await this.rekananService.findAll(+page, +perPage, search, status, kodeUsaha);
    return {
      success: true,
      message: 'Daftar rekanan berhasil diambil',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get('lookup')
  async lookup(
    @Query('npwp') npwp?: string,
    @Query('nama') nama?: string,
    @Query('kode_swift') kodeSwift?: string,
  ) {
    const data = await this.rekananService.lookup(npwp, nama, kodeSwift);
    return { success: true, message: 'Lookup rekanan berhasil', data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const data = await this.rekananService.findOne(id);
    return { success: true, message: 'Detail rekanan berhasil diambil', data };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateRekananDto) {
    const data = await this.rekananService.create(dto);
    return { success: true, message: 'Rekanan berhasil ditambahkan', data };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRekananDto,
  ) {
    const data = await this.rekananService.update(id, dto);
    return { success: true, message: 'Rekanan berhasil diupdate', data };
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    await this.rekananService.softDelete(id);
    return { success: true, message: 'Rekanan berhasil dinonaktifkan' };
  }
}
