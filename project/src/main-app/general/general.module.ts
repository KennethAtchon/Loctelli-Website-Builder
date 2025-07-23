import { Module } from '@nestjs/common';
import { GeneralController } from './general.controller';
import { GeneralService } from './general.service';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { AppCacheModule } from '../infrastructure/cache/cache.module';

@Module({
  imports: [PrismaModule, AppCacheModule],
  controllers: [GeneralController],
  providers: [GeneralService],
})
export class GeneralModule {}
