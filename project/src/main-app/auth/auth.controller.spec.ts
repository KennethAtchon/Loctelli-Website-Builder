import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
    getProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    const loginDto = {
      email: 'test@example.com',
      password: 'Password123!',
    };

    const mockLoginResponse = {
      access_token: 'mock-access-token',
      refresh_token: 'mock-refresh-token',
      user: {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'user',
        company: 'Test Company',
      },
    };

    it('should successfully login a user', async () => {
      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockLoginResponse);
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
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

    const mockRegisterResponse = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      company: 'Test Company',
      budget: '1000-5000',
    };

    it('should successfully register a new user', async () => {
      mockAuthService.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockRegisterResponse);
    });

    it('should throw ConflictException for existing email', async () => {
      mockAuthService.register.mockRejectedValue(new ConflictException('User with this email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should throw BadRequestException for invalid password', async () => {
      mockAuthService.register.mockRejectedValue(new BadRequestException('Password must be at least 8 characters long'));

      await expect(controller.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(authService.register).toHaveBeenCalledWith(registerDto);
    });
  });

  describe('refreshToken', () => {
    const refreshTokenDto = {
      refresh_token: 'mock-refresh-token',
    };

    const mockRefreshResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
    };

    it('should successfully refresh tokens', async () => {
      mockAuthService.refreshToken.mockResolvedValue(mockRefreshResponse);

      const result = await controller.refreshToken(refreshTokenDto);

      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token);
      expect(result).toEqual(mockRefreshResponse);
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockAuthService.refreshToken.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.refreshToken(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
      expect(authService.refreshToken).toHaveBeenCalledWith(refreshTokenDto.refresh_token);
    });
  });

  describe('logout', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      role: 'user',
    };

    const mockLogoutResponse = {
      message: 'Logged out successfully',
    };

    it('should successfully logout a user', async () => {
      mockAuthService.logout.mockResolvedValue(mockLogoutResponse);

      const result = await controller.logout(mockUser);

      expect(authService.logout).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockLogoutResponse);
    });
  });

  describe('getProfile', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      role: 'user',
    };

    const mockProfileResponse = {
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
      mockAuthService.getProfile.mockResolvedValue(mockProfileResponse);

      const result = await controller.getProfile(mockUser);

      expect(authService.getProfile).toHaveBeenCalledWith(mockUser.userId);
      expect(result).toEqual(mockProfileResponse);
    });

    it('should throw UnauthorizedException for non-existent user', async () => {
      mockAuthService.getProfile.mockRejectedValue(new UnauthorizedException('User not found'));

      await expect(controller.getProfile(mockUser)).rejects.toThrow(UnauthorizedException);
      expect(authService.getProfile).toHaveBeenCalledWith(mockUser.userId);
    });
  });

  describe('changePassword', () => {
    const mockUser = {
      userId: 1,
      email: 'test@example.com',
      role: 'user',
    };

    const passwordData = {
      oldPassword: 'OldPassword123!',
      newPassword: 'NewPassword123!',
    };

    const mockChangePasswordResponse = {
      message: 'Password changed successfully',
    };

    it('should successfully change password', async () => {
      mockAuthService.changePassword.mockResolvedValue(mockChangePasswordResponse);

      const result = await controller.changePassword(mockUser, passwordData);

      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.userId,
        passwordData.oldPassword,
        passwordData.newPassword
      );
      expect(result).toEqual(mockChangePasswordResponse);
    });

    it('should throw UnauthorizedException for incorrect old password', async () => {
      mockAuthService.changePassword.mockRejectedValue(new UnauthorizedException('Current password is incorrect'));

      await expect(controller.changePassword(mockUser, passwordData)).rejects.toThrow(UnauthorizedException);
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.userId,
        passwordData.oldPassword,
        passwordData.newPassword
      );
    });

    it('should throw BadRequestException for invalid new password', async () => {
      mockAuthService.changePassword.mockRejectedValue(new BadRequestException('Password must be at least 8 characters long'));

      await expect(controller.changePassword(mockUser, passwordData)).rejects.toThrow(BadRequestException);
      expect(authService.changePassword).toHaveBeenCalledWith(
        mockUser.userId,
        passwordData.oldPassword,
        passwordData.newPassword
      );
    });
  });
}); 