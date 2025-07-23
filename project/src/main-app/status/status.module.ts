import { Module } from '@nestjs/common';
import { StatusService } from './status.service';
import { StatusController } from './status.controller';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { AppCacheModule } from '../infrastructure/cache/cache.module';

@Module({
  imports: [PrismaModule, AppCacheModule],
  controllers: [StatusController],
  providers: [StatusService],
  exports: [StatusService],
})
export class StatusModule {}
