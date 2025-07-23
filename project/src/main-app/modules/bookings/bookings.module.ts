import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../../infrastructure/prisma/prisma.module';
import { BookingHelperService } from './booking-helper.service';

@Module({
  imports: [PrismaModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingHelperService],
  exports: [BookingsService, BookingHelperService],
})
export class BookingsModule {}
