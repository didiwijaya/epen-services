import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRekeningPenerimaDto {
  @IsNotEmpty()
  @IsInt()
  rekanan_id: number;

  @IsNotEmpty()
  @IsString()
  nama_pemilik: string;

  @IsNotEmpty()
  @IsString()
  nama_bank: string;

  @IsOptional()
  @IsString()
  cabang_bank?: string;

  @IsNotEmpty()
  @IsString()
  nomor_rekening: string;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
