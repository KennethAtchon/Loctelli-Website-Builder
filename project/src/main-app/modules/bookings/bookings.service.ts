import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(createBookingDto: CreateBookingDto, subAccountId: number) {
    return this.prisma.booking.create({
      data: {
        ...createBookingDto,
        subAccountId, // Add SubAccount context
      },
    });
  }

  async findAll() {
    return this.prisma.booking.findMany({
      include: {
        user: true,
        lead: true,
      },
    });
  }

  async findAllBySubAccount(subAccountId: number) {
    return this.prisma.booking.findMany({
      where: { subAccountId },
      include: {
        user: true,
        lead: true,
      },
    });
  }

  async findAllByAdmin(adminId: number) {
    // All admins can see all bookings
    return this.prisma.booking.findMany({
      include: {
        user: true,
        lead: true,
        subAccount: {
          select: { id: true, name: true }
        }
      },
    });
  }

  async findOne(id: number, userId: number, userRole: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        lead: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check if user has permission to access this booking
    if (userRole !== 'admin' && userRole !== 'super_admin' && booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    // If the booking references a user that doesn't exist, we still return the booking
    // but the user field will be null, which the frontend can handle
    return booking;
  }

  async findByUserId(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        lead: true,
      },
    });
  }

  async findByleadId(leadId: number, userId: number, userRole: string) {
    // First check if the lead belongs to the user
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    // Check if user has permission to access this lead's bookings
    if (userRole !== 'admin' && userRole !== 'super_admin' && lead.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.booking.findMany({
      where: { leadId },
      include: {
        lead: true,
      },
    });
  }

  async update(id: number, updateBookingDto: UpdateBookingDto, userId: number, userRole: string) {
    // Check if booking exists and user has permission
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check if user has permission to update this booking
    if (userRole !== 'admin' && userRole !== 'super_admin' && booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      return await this.prisma.booking.update({
        where: { id },
        data: updateBookingDto,
        include: {
          user: true,
          lead: true,
        },
      });
    } catch (error) {
      // Log the actual error for debugging
      console.error('Booking update error:', error);
      
      // Check if it's a foreign key constraint error
      if (error.code === 'P2003') {
        throw new NotFoundException('Referenced user or lead not found');
      }
      
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
  }

  async remove(id: number, userId: number, userRole: string) {
    // Check if booking exists and user has permission
    const booking = await this.prisma.booking.findUnique({
      where: { id },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }

    // Check if user has permission to delete this booking
    if (userRole !== 'admin' && userRole !== 'super_admin' && booking.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    try {
      return await this.prisma.booking.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Booking with ID ${id} not found`);
    }
  }
}
