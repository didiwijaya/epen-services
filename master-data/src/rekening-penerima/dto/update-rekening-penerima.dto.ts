import { PartialType } from '@nestjs/mapped-types';
import { CreateRekeningPenerimaDto } from './create-rekening-penerima.dto';

export class UpdateRekeningPenerimaDto extends PartialType(CreateRekeningPenerimaDto) {}
