import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;
  let cacheService: CacheService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    subAccount: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    adminUser: {
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

      const mockCacheService = {
    setCache: jest.fn(),
    getCache: jest.fn(),
    delCache: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
                  provide: CacheService,
        useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    cacheService = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateEmail', () => {
    it('should not throw for valid email', () => {
      expect(() => (service as any).validateEmail('test@example.com')).not.toThrow();
    });

    it('should throw BadRequestException for invalid email', () => {
      expect(() => (service as any).validateEmail('invalid-email')).toThrow(BadRequestException);
      expect(() => (service as any).validateEmail('test@')).toThrow(BadRequestException);
      expect(() => (service as any).validateEmail('@example.com')).toThrow(BadRequestException);
    });
  });

  describe('validatePassword', () => {
    it('should not throw for valid password', () => {
      expect(() => (service as any).validatePassword('Password123!')).not.toThrow();
    });

    it('should throw BadRequestException for short password', () => {
      expect(() => (service as any).validatePassword('Pass1!')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without uppercase', () => {
      expect(() => (service as any).validatePassword('password123!')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without lowercase', () => {
      expect(() => (service as any).validatePassword('PASSWORD123!')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without numbers', () => {
      expect(() => (service as any).validatePassword('Password!')).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for password without special characters', () => {
      expect(() => (service as any).validatePassword('Password123')).toThrow(BadRequestException);
    });
  });

  describe('validateUser', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'user',
      isActive: true,
    };

    it('should return user without password for valid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password123');

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith('password123', 'hashedPassword');
      expect(result).toEqual({
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isActive: true,
      });
    });

    it('should return null for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password123');

      expect(result).toBeNull();
    });

    it('should return null for invalid password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrongpassword');

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'hashedPassword',
      name: 'Test User',
      role: 'user',
      isActive: true,
      company: 'Test Company',
    };

    const mockTokens = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
    };

    it('should successfully login user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce(mockTokens.access_token)
        .mockReturnValueOnce(mockTokens.refresh_token);
      mockCacheService.setCache.mockResolvedValue(undefined);

      const result = await service.login(loginDto);

      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { lastLoginAt: expect.any(Date) },
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(cacheService.setCache).toHaveBeenCalledWith(
        'refresh:1',
        mockTokens.refresh_token,
        7 * 24 * 60 * 60
      );
      expect(result).toEqual({
        access_token: mockTokens.access_token,
        refresh_token: mockTokens.refresh_token,
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'user',
          company: 'Test Company',
        },
      });
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      const inactiveUser = { ...mockUser, isActive: false };
      mockPrismaService.user.findUnique.mockResolvedValue(inactiveUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for invalid email', async () => {
      await expect(service.login({ ...loginDto, email: 'invalid-email' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('register', () => {
    const registerDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      company: 'Test Company',
      budget: '1000-5000',
    };

    const mockCreatedUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      password: 'hashedPassword',
      company: 'Test Company',
      budget: '1000-5000',
    };

    it('should successfully register new user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.subAccount.findFirst.mockResolvedValue({ id: 1, name: 'Default SubAccount' });
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword');
      mockPrismaService.user.create.mockResolvedValue(mockCreatedUser);

      const result = await service.register(registerDto);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith('Password123!', 12);
      expect(prismaService.user.create).toHaveBeenCalledWith({
        data: {
          name: 'Test User',
          email: 'test@example.com',
          password: 'hashedPassword',
          company: 'Test Company',
          budget: '1000-5000',
          subAccountId: 1,
        },
      });
      expect(result).toEqual({
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        company: 'Test Company',
        budget: '1000-5000',
      });
    });

    it('should throw ConflictException for existing email', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ id: 1, email: 'test@example.com' });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException for invalid password', async () => {
      await expect(service.register({ ...registerDto, password: 'weak' })).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid email', async () => {
      await expect(service.register({ ...registerDto, email: 'invalid-email' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('logout', () => {
    it('should successfully logout user', async () => {
      mockCacheService.delCache.mockResolvedValue(undefined);

      const result = await service.logout(1);

      expect(cacheService.delCache).toHaveBeenCalledWith('refresh:1');
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('getProfile', () => {
    const mockProfile = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      role: 'user',
      company: 'Test Company',
      budget: '1000-5000',
      bookingEnabled: true,
      calendarId: 'calendar123',
      locationId: 'location123',
      lastLoginAt: new Date(),
      createdAt: new Date(),
    };

    it('should successfully get user profile', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockProfile);

      const result = await service.getProfile(1);

      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          company: true,
          budget: true,
          bookingEnabled: true,
          calendarId: true,
          locationId: true,
          lastLoginAt: true,
          createdAt: true,
        },
      });
      expect(result).toEqual(mockProfile);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getProfile(999)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      password: 'oldHashedPassword',
    };

    it('should successfully change password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // old password check
        .mockResolvedValueOnce(false); // new password different check
      (bcrypt.hash as jest.Mock).mockResolvedValue('newHashedPassword');
      mockPrismaService.user.update.mockResolvedValue(mockUser);
      mockCacheService.delCache.mockResolvedValue(undefined);

      const result = await service.changePassword(1, 'OldPassword123!', 'NewPassword123!');

      expect(bcrypt.compare).toHaveBeenCalledWith('OldPassword123!', 'oldHashedPassword');
      expect(bcrypt.compare).toHaveBeenCalledWith('NewPassword123!', 'oldHashedPassword');
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123!', 12);
      expect(prismaService.user.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { password: 'newHashedPassword' },
      });
      expect(cacheService.delCache).toHaveBeenCalledWith('refresh:1');
      expect(result).toEqual({ message: 'Password changed successfully' });
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.changePassword(999, 'OldPassword123!', 'NewPassword123!')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for incorrect old password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(1, 'WrongPassword123!', 'NewPassword123!')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException for same new password', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock)
        .mockResolvedValueOnce(true) // old password check
        .mockResolvedValueOnce(true); // new password same check

      await expect(service.changePassword(1, 'OldPassword123!', 'OldPassword123!')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid new password', async () => {
      await expect(service.changePassword(1, 'OldPassword123!', 'weak')).rejects.toThrow(BadRequestException);
    });
  });

  describe('refreshToken', () => {
    const mockDecodedToken = {
      sub: 1,
      email: 'test@example.com',
      role: 'user',
    };

    const mockUser = {
      id: 1,
      email: 'test@example.com',
      role: 'user',
      isActive: true,
    };

    const mockTokens = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      mockCacheService.getCache.mockResolvedValue('old-refresh-token');
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockJwtService.sign
        .mockReturnValueOnce(mockTokens.access_token)
        .mockReturnValueOnce(mockTokens.refresh_token);
      mockCacheService.setCache.mockResolvedValue(undefined);

      const result = await service.refreshToken('old-refresh-token');

      expect(jwtService.verify).toHaveBeenCalledWith('old-refresh-token');
      expect(cacheService.getCache).toHaveBeenCalledWith('refresh:1');
      expect(prismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(jwtService.sign).toHaveBeenCalledTimes(2);
      expect(cacheService.setCache).toHaveBeenCalledWith(
        'refresh:1',
        mockTokens.refresh_token,
        7 * 24 * 60 * 60
      );
      expect(result).toEqual(mockTokens);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshToken('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent stored token', async () => {
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      mockCacheService.getCache.mockResolvedValue(null);

      await expect(service.refreshToken('old-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for mismatched stored token', async () => {
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      mockCacheService.getCache.mockResolvedValue('different-token');

      await expect(service.refreshToken('old-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      mockCacheService.getCache.mockResolvedValue('old-refresh-token');
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.refreshToken('old-refresh-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for inactive user', async () => {
      mockJwtService.verify.mockReturnValue(mockDecodedToken);
      mockCacheService.getCache.mockResolvedValue('old-refresh-token');
      mockPrismaService.user.findUnique.mockResolvedValue({ ...mockUser, isActive: false });

      await expect(service.refreshToken('old-refresh-token')).rejects.toThrow(UnauthorizedException);
    });
  });
}); 