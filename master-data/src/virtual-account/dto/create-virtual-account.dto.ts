import { IsInt, IsNotEmpty, IsString } from 'class-validator';

export class CreateVirtualAccountDto {
  @IsNotEmpty()
  @IsInt()
  skpd_id: number;

  @IsNotEmpty()
  @IsString()
  nomor_va: string;

  @IsNotEmpty()
  @IsString()
  bank: string;
}
