import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { VirtualAccountService } from './virtual-account.service';
import { CreateVirtualAccountDto } from './dto/create-virtual-account.dto';

@Controller('virtual-account')
export class VirtualAccountController {
  constructor(private readonly service: VirtualAccountService) {}

  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('per_page') perPage = 15,
    @Query('skpd_id') skpdId?: number,
  ) {
    const result = this.service.findAll(+page, +perPage, skpdId ? +skpdId : undefined);
    return {
      success: true,
      message: 'Daftar virtual account berhasil diambil',
      data: result.data,
      meta: result.meta,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateVirtualAccountDto) {
    const data = this.service.create(dto);
    return {
      success: true,
      message: 'Virtual account berhasil ditambahkan',
      data,
    };
  }
}
