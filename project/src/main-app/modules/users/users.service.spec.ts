import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { GhlService } from '../../integrations/ghl-integrations/ghl/ghl.service';
import { NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('UsersService', () => {
  let service: UsersService;
  let prismaService: PrismaService;
  let ghlService: GhlService;

  const mockPrismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    subAccount: {
      findFirst: jest.fn(),
    },
  };

  const mockGhlService = {
    searchSubaccounts: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: GhlService,
          useValue: mockGhlService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prismaService = module.get<PrismaService>(PrismaService);
    ghlService = module.get<GhlService>(GhlService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      company: 'Test Company',
      role: 'user',
    };

    const mockCreatedUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword',
      company: 'Test Company',
      role: 'user',
    };

    it('should successfully create a user with hashed password', async () => {
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(createUserDto, 1);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDto,
          password: 'hashedPassword',
          subAccountId: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: true,
          isActive: true,
          subAccount: {
            select: { id: true, name: true }
          },
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockCreatedUser);
    });

    it('should create user without password hashing when password is empty string', async () => {
      const createUserDtoWithoutPassword = { 
        name: 'Test User',
        email: 'test@example.com',
        password: '',
        company: 'Test Company',
        role: 'user',
      };
      
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.create(createUserDtoWithoutPassword, 1);

      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          ...createUserDtoWithoutPassword,
          subAccountId: 1,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: true,
          isActive: true,
          subAccount: {
            select: { id: true, name: true }
          },
          createdAt: true,
          updatedAt: true,
        },
      });
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('findAll', () => {
    const mockUsers = [
      {
        id: 1,
        name: 'User 1',
        email: 'user1@example.com',
        strategies: [],
        leads: [],
        bookings: [],
      },
      {
        id: 2,
        name: 'User 2',
        email: 'user2@example.com',
        strategies: [],
        leads: [],
        bookings: [],
      },
    ];

    it('should return all users with related data', async () => {
      mockPrismaService.user.findMany.mockResolvedValue(mockUsers);

      const result = await service.findAll();

      expect(prismaService.user.findMany).toHaveBeenCalledWith({
        include: {
          strategies: true,
          leads: true,
          bookings: true,
        },
      });
      expect(result).toEqual(mockUsers);
    });
  });

  describe('findOne', () => {
    const mockUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      strategies: [],
      leads: [],
      bookings: [],
    };

    it('should return user with related data when user exists', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findOne(1);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          strategies: true,
          leads: true,
          bookings: true,
        },
      });
      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: {
          strategies: true,
          leads: true,
          bookings: true,
        },
      });
    });
  });

  describe('update', () => {
    const updateUserDto: UpdateUserDto = {
      name: 'Updated User',
      company: 'Updated Company',
    };

    const mockUpdatedUser = {
      id: 1,
      name: 'Updated User',
      email: 'test@example.com',
      company: 'Updated Company',
    };

    it('should successfully update user when user exists', async () => {
      mockPrismaService.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await service.update(1, updateUserDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateUserDto,
      });
      expect(result).toEqual(mockUpdatedUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.update.mockRejectedValue(new Error('User not found'));

      await expect(service.update(999, updateUserDto)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 999 },
        data: updateUserDto,
      });
    });
  });

  describe('remove', () => {
    const mockDeletedUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };

    it('should successfully delete user when user exists', async () => {
      mockPrismaService.user.delete.mockResolvedValue(mockDeletedUser);

      const result = await service.remove(1);

      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockDeletedUser);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.delete.mockRejectedValue(new Error('User not found'));

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
      expect(prismaService.user.delete).toHaveBeenCalledWith({
        where: { id: 999 },
      });
    });
  });

  describe('importGhlUsers', () => {
    const mockSubaccountsData = {
      locations: [
        {
          name: 'Location 1',
          companyId: 'company1',
          email: 'location1@example.com',
        },
        {
          name: 'Location 2',
          companyId: 'company2',
          email: 'location2@example.com',
        },
      ],
    };

    const mockCreatedUsers = [
      {
        id: 1,
        name: 'Location 1',
        email: 'location1@example.com',
        company: 'company1',
        role: 'user',
      },
      {
        id: 2,
        name: 'Location 2',
        email: 'location2@example.com',
        company: 'company2',
        role: 'user',
      },
    ];

    it('should successfully import GHL users', async () => {
      mockGhlService.searchSubaccounts.mockResolvedValue(mockSubaccountsData);
      mockPrismaService.subAccount.findFirst.mockResolvedValue({ id: 1, name: 'Default SubAccount' });
      mockPrismaService.user.findFirst.mockResolvedValue(null); // No existing users
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create
        .mockResolvedValueOnce(mockCreatedUsers[0])
        .mockResolvedValueOnce(mockCreatedUsers[1]);

      const result = await service.importGhlUsers();

      expect(ghlService.searchSubaccounts).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith('defaultPassword123', 12);
      expect(prismaService.user.create).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockCreatedUsers);
    });

    it('should skip existing users during import', async () => {
      mockGhlService.searchSubaccounts.mockResolvedValue(mockSubaccountsData);
      mockPrismaService.subAccount.findFirst.mockResolvedValue({ id: 1, name: 'Default SubAccount' });
      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // First user doesn't exist
        .mockResolvedValueOnce({ id: 1, email: 'location2@example.com' }); // Second user exists
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUsers[0]);

      const result = await service.importGhlUsers();

      expect(prismaService.user.create).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockCreatedUsers[0]]);
    });

    it('should handle locations without email', async () => {
      const subaccountsDataWithoutEmail = {
        locations: [
          {
            name: 'Location 1',
            companyId: 'company1',
            // No email
          },
        ],
      };

      mockGhlService.searchSubaccounts.mockResolvedValue(subaccountsDataWithoutEmail);
      mockPrismaService.subAccount.findFirst.mockResolvedValue({ id: 1, name: 'Default SubAccount' });
      mockPrismaService.user.findFirst.mockResolvedValue(null);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue({
        id: 1,
        name: 'Location 1',
        email: expect.stringMatching(/user-\d+@example\.com/),
        company: 'company1',
        role: 'user',
      });

      const result = await service.importGhlUsers();

      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Location 1',
          email: expect.stringMatching(/user-\d+@example\.com/),
          company: 'company1',
          role: 'user',
        }),
      });
    });

    it('should throw HttpException when GHL API fails', async () => {
      mockGhlService.searchSubaccounts.mockResolvedValue(null);

      await expect(service.importGhlUsers()).rejects.toThrow(HttpException);
      expect(ghlService.searchSubaccounts).toHaveBeenCalled();
    });

    it('should throw HttpException when GHL API returns no locations', async () => {
      mockGhlService.searchSubaccounts.mockResolvedValue({ locations: null });

      await expect(service.importGhlUsers()).rejects.toThrow(HttpException);
    });

    it('should handle and rethrow HttpException from GHL service', async () => {
      const httpException = new HttpException('GHL API Error', HttpStatus.BAD_GATEWAY);
      mockGhlService.searchSubaccounts.mockRejectedValue(httpException);

      await expect(service.importGhlUsers()).rejects.toThrow(HttpException);
    });

    it('should handle and wrap other errors', async () => {
      const error = new Error('Database connection failed');
      mockGhlService.searchSubaccounts.mockRejectedValue(error);

      await expect(service.importGhlUsers()).rejects.toThrow(HttpException);
    });
  });
});
