import { Module } from '@nestjs/common';
import { SubAccountsService } from './subaccounts.service';
import { SubAccountsController } from './subaccounts.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SubAccountsController],
  providers: [SubAccountsService],
  exports: [SubAccountsService],
})
export class SubAccountsModule {} 