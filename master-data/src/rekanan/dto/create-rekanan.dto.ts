import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRekananDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  nama: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/, {
    message: 'Format NPWP tidak valid. Contoh: 01.234.567.8-901.000',
  })
  npwp: string;

  @IsNotEmpty()
  @IsString()
  alamat: string;

  @IsOptional()
  @IsString()
  kode_usaha?: string;

  @IsOptional()
  @IsString()
  kota?: string;

  @IsOptional()
  @IsString()
  telepon?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  kode_swift?: string;
}
