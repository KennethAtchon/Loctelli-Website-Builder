import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from './bookings.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';

describe('BookingsService', () => {
  let service: BookingsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    booking: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    lead: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<BookingsService>(BookingsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createBookingDto: CreateBookingDto = {
      userId: 1,
      leadId: 1,
      bookingType: 'call',
      details: {},
      status: 'pending',
    };

    const mockCreatedBooking = {
      id: 1,
      ...createBookingDto,
    };

    it('should create and return a booking', async () => {
      mockPrismaService.booking.create.mockResolvedValue(mockCreatedBooking);

      const result = await service.create(createBookingDto, 1);
      expect(result).toEqual(mockCreatedBooking);
      expect(prismaService.booking.create).toHaveBeenCalledWith({
        data: {
          ...createBookingDto,
          subAccountId: 1,
        },
      });
    });
  });

  describe('findAll', () => {
    const mockBookings = [
      { id: 1, userId: 1, leadId: 1, bookingType: 'call', details: {}, status: 'pending' },
      { id: 2, userId: 1, leadId: 2, bookingType: 'meeting', details: {}, status: 'confirmed' },
    ];

    it('should return an array of bookings', async () => {
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.findAll();
      expect(result).toEqual(mockBookings);
      expect(prismaService.booking.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
          lead: true,
        },
      });
    });
  });

  describe('findOne', () => {
    const mockBooking = {
      id: 1,
      userId: 1,
      leadId: 1,
      bookingType: 'call',
      details: {},
      status: 'pending',
      user: { id: 1, name: 'User 1' },
      lead: { id: 1, name: 'Lead 1' },
    };

    it('should return a booking if it exists and user has permission', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.findOne(1, 1, 'user');
      expect(result).toEqual(mockBooking);
      expect(prismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          user: true,
          lead: true,
        },
      });
    });

    it('should return a booking if user is admin', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);

      const result = await service.findOne(1, 999, 'admin');
      expect(result).toEqual(mockBooking);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const bookingWithDifferentUser = { ...mockBooking, userId: 2 };
      mockPrismaService.booking.findUnique.mockResolvedValue(bookingWithDifferentUser);

      await expect(service.findOne(1, 1, 'user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByUserId', () => {
    const mockBookings = [
      { id: 1, userId: 1, leadId: 1, bookingType: 'call', details: {}, status: 'pending' },
      { id: 2, userId: 1, leadId: 2, bookingType: 'meeting', details: {}, status: 'confirmed' },
    ];

    it('should return bookings for a specific user', async () => {
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.findByUserId(1);
      expect(result).toEqual(mockBookings);
      expect(prismaService.booking.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          lead: true,
        },
      });
    });
  });

  describe('findByleadId', () => {
    const mockLead = { id: 1, name: 'Lead 1', userId: 1 };
    const mockBookings = [
      { id: 1, userId: 1, leadId: 1, bookingType: 'call', details: {}, status: 'pending' },
    ];

    it('should return bookings for a lead if user has permission', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.findByleadId(1, 1, 'user');
      expect(result).toEqual(mockBookings);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.booking.findMany).toHaveBeenCalledWith({
        where: { leadId: 1 },
        include: {
          lead: true,
        },
      });
    });

    it('should return bookings for a lead if user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.booking.findMany.mockResolvedValue(mockBookings);

      const result = await service.findByleadId(1, 999, 'admin');
      expect(result).toEqual(mockBookings);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.findByleadId(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(service.findByleadId(1, 1, 'user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateBookingDto: UpdateBookingDto = { status: 'confirmed' };
    const mockBooking = {
      id: 1,
      userId: 1,
      leadId: 1,
      bookingType: 'call',
      details: {},
      status: 'pending',
    };
    const mockUpdatedBooking = {
      id: 1,
      userId: 1,
      leadId: 1,
      bookingType: 'call',
      details: {},
      status: 'confirmed',
      user: { id: 1, name: 'User 1' },
      lead: { id: 1, name: 'Lead 1' },
    };

    it('should update and return a booking if user has permission', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);

      const result = await service.update(1, updateBookingDto, 1, 'user');
      expect(result).toEqual(mockUpdatedBooking);
      expect(prismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.booking.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateBookingDto,
        include: {
          user: true,
          lead: true,
        },
      });
    });

    it('should update and return a booking if user is admin', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockResolvedValue(mockUpdatedBooking);

      const result = await service.update(1, updateBookingDto, 999, 'admin');
      expect(result).toEqual(mockUpdatedBooking);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateBookingDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const bookingWithDifferentUser = { ...mockBooking, userId: 2 };
      mockPrismaService.booking.findUnique.mockResolvedValue(bookingWithDifferentUser);

      await expect(service.update(1, updateBookingDto, 1, 'user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if update fails', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(1, updateBookingDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for foreign key constraint error', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      const foreignKeyError = new Error('Foreign key constraint failed');
      (foreignKeyError as any).code = 'P2003';
      mockPrismaService.booking.update.mockRejectedValue(foreignKeyError);

      await expect(service.update(1, updateBookingDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockBooking = {
      id: 1,
      userId: 1,
      leadId: 1,
      bookingType: 'call',
      details: {},
      status: 'pending',
    };
    const mockDeletedBooking = {
      id: 1,
      userId: 1,
      leadId: 1,
      bookingType: 'call',
      details: {},
      status: 'pending',
    };

    it('should delete and return a booking if user has permission', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.delete.mockResolvedValue(mockDeletedBooking);

      const result = await service.remove(1, 1, 'user');
      expect(result).toEqual(mockDeletedBooking);
      expect(prismaService.booking.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.booking.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should delete and return a booking if user is admin', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.delete.mockResolvedValue(mockDeletedBooking);

      const result = await service.remove(1, 999, 'admin');
      expect(result).toEqual(mockDeletedBooking);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const bookingWithDifferentUser = { ...mockBooking, userId: 2 };
      mockPrismaService.booking.findUnique.mockResolvedValue(bookingWithDifferentUser);

      await expect(service.remove(1, 1, 'user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if delete fails', async () => {
      mockPrismaService.booking.findUnique.mockResolvedValue(mockBooking);
      mockPrismaService.booking.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.remove(1, 1, 'user')).rejects.toThrow(NotFoundException);
    });
  });
});
