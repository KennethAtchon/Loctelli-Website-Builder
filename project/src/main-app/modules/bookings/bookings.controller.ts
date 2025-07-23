import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Admin } from '../../auth/decorators/admin.decorator';
import { AdminGuard } from '../../auth/guards/admin.guard';

@Controller('booking')
@UseGuards(AdminGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Admin()
  create(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user) {
    // Admin users can create bookings for any regular user within their SubAccounts
    if (user.type === 'admin') {
      // For admin users, subAccountId should be provided in the DTO
      if (!createBookingDto.subAccountId) {
        throw new HttpException('subAccountId is required for booking creation', HttpStatus.BAD_REQUEST);
      }
      return this.bookingsService.create(createBookingDto, createBookingDto.subAccountId);
    } else {
      // Regular users can only create bookings in their own SubAccount
      return this.bookingsService.create(createBookingDto, user.subAccountId);
    }
  }

  @Get()
  @Admin()
  findAll(@CurrentUser() user, @Query('userId') userId?: string, @Query('leadId') leadId?: string, @Query('subAccountId') subAccountId?: string) {
    if (userId) {
      const parsedUserId = parseInt(userId, 10);
      if (isNaN(parsedUserId)) {
        throw new HttpException('Invalid userId parameter', HttpStatus.BAD_REQUEST);
      }
      return this.bookingsService.findByUserId(parsedUserId);
    }
    
    if (leadId) {
      const parsedleadId = parseInt(leadId, 10);
      if (isNaN(parsedleadId)) {
        throw new HttpException('Invalid leadId parameter', HttpStatus.BAD_REQUEST);
      }
      return this.bookingsService.findByleadId(parsedleadId, user.userId, user.role);
    }
    
    // Handle SubAccount filtering
    if (user.type === 'admin') {
      // Admin can view bookings in specific SubAccount or all their SubAccounts
      const parsedSubAccountId = subAccountId ? parseInt(subAccountId, 10) : undefined;
      if (parsedSubAccountId) {
        return this.bookingsService.findAllBySubAccount(parsedSubAccountId);
      } else {
        // Return all bookings from all SubAccounts owned by this admin
        return this.bookingsService.findAllByAdmin(user.userId);
      }
    } else {
      // Regular users can only view bookings in their own SubAccount
      return this.bookingsService.findAllBySubAccount(user.subAccountId);
    }
  }

  @Get(':id')
  @Admin()
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.bookingsService.findOne(id, user.userId, user.role);
  }

  @Patch(':id')
  @Admin()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user
  ) {
    return this.bookingsService.update(id, updateBookingDto, user.userId, user.role);
  }

  @Patch(':id/status')
  @Admin()
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: string },
    @CurrentUser() user
  ) {
    return this.bookingsService.update(id, { status: body.status }, user.userId, user.role);
  }

  @Delete(':id')
  @Admin()
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.bookingsService.remove(id, user.userId, user.role);
  }
}
