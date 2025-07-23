import { Module } from '@nestjs/common';
// import { ScheduleModule } from '@nestjs/schedule'; // DISABLED: Cron jobs temporarily disabled
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { FreeSlotCronService } from './free-slot-cron.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    // ScheduleModule.forRoot(), // DISABLED: Cron jobs temporarily disabled
    PrismaModule,
    ConfigModule,
  ],
  providers: [FreeSlotCronService],
  exports: [FreeSlotCronService],
})
export class BgProcessModule {}
