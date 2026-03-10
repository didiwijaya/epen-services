import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { RekeningPenerimaService } from './rekening-penerima.service';
import { CreateRekeningPenerimaDto } from './dto/create-rekening-penerima.dto';
import { UpdateRekeningPenerimaDto } from './dto/update-rekening-penerima.dto';

@Controller('rekening-penerima')
export class RekeningPenerimaController {
  constructor(private readonly service: RekeningPenerimaService) {}

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 15,
    @Query('rekanan_id') rekananId?: number,
    @Query('bank') bank?: string,
  ) {
    const result = this.service.findAll(+page, +perPage, rekananId ? +rekananId : undefined, bank);
    return {
      success: true,
      message: 'Daftar rekening penerima berhasil diambil',
      data: result.data,
      meta: result.meta,
    };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const data = this.service.findOne(id);
    return {
      success: true,
      message: 'Detail rekening penerima berhasil diambil',
      data,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateRekeningPenerimaDto) {
    const data = this.service.create(dto);
    return {
      success: true,
      message: 'Rekening penerima berhasil ditambahkan',
      data,
    };
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRekeningPenerimaDto,
  ) {
    const data = this.service.update(id, dto);
    return {
      success: true,
      message: 'Rekening penerima berhasil diupdate',
      data,
    };
  }
}
