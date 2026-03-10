import { Module } from '@nestjs/common';
import { VirtualAccountController } from './virtual-account.controller';
import { VirtualAccountService } from './virtual-account.service';

@Module({
  controllers: [VirtualAccountController],
  providers: [VirtualAccountService],
})
export class VirtualAccountModule {}
