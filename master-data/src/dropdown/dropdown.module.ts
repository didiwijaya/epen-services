import { Module } from '@nestjs/common';
import { DropdownController } from './dropdown.controller';
import { DropdownService } from './dropdown.service';

@Module({
  controllers: [DropdownController],
  providers: [DropdownService],
})
export class DropdownModule {}
