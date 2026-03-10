import { PartialType } from '@nestjs/mapped-types';
import { CreateRekananDto } from './create-rekanan.dto';

export class UpdateRekananDto extends PartialType(CreateRekananDto) {}
