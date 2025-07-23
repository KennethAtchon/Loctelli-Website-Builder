import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import * as bcrypt from 'bcrypt';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  company?: string;
  budget?: string;
}

export interface JwtPayload {
  sub: number;
  email: string;
  role: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheService: CacheService,
  ) {}

  // Password validation function
  private validatePassword(password: string): void {
    this.logger.debug('Validating password complexity');
    
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      this.logger.warn('Password validation failed: too short');
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (!hasUpperCase) {
      this.logger.warn('Password validation failed: no uppercase letter');
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      this.logger.warn('Password validation failed: no lowercase letter');
      throw new BadRequestException('Password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      this.logger.warn('Password validation failed: no number');
      throw new BadRequestException('Password must contain at least one number');
    }
    if (!hasSpecialChar) {
      this.logger.warn('Password validation failed: no special character');
      throw new BadRequestException('Password must contain at least one special character');
    }
    
    this.logger.debug('Password validation passed');
  }

  // Email validation function
  private validateEmail(email: string): void {
    this.logger.debug(`Validating email format: ${email}`);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.logger.warn(`Email validation failed: ${email}`);
      throw new BadRequestException('Invalid email format');
    }
    
    this.logger.debug(`Email validation passed: ${email}`);
  }

  async validateUser(email: string, password: string): Promise<any> {
    this.logger.debug(`Validating user credentials for email: ${email}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        this.logger.warn(`User not found for email: ${email}`);
        return null;
      }

      this.logger.debug(`User found for email: ${email}, comparing passwords`);
      const isPasswordValid = await bcrypt.compare(password, user.password);
      
      if (isPasswordValid) {
        this.logger.debug(`Password validation successful for user: ${email}`);
        const { password, ...result } = user;
        return result;
      } else {
        this.logger.warn(`Password validation failed for user: ${email}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error validating user credentials for email: ${email}`, error.stack);
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Processing login for email: ${loginDto.email}`);
    
    // Validate email format
    this.validateEmail(loginDto.email);

    const user = await this.validateUser(loginDto.email, loginDto.password);
    
    if (!user) {
      this.logger.warn(`Login failed - invalid credentials for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      this.logger.warn(`Login failed - account deactivated for email: ${loginDto.email}`);
      throw new UnauthorizedException('Account is deactivated');
    }

    this.logger.debug(`Updating last login for user: ${loginDto.email}`);
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    this.logger.debug(`Generating JWT tokens for user: ${loginDto.email}`);
    // Reduced token expiration for better security
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    this.logger.debug(`Storing refresh token in Redis for user: ${loginDto.email}`);
    // Store refresh token in Redis with rotation
    await this.cacheService.setCache(`refresh:${user.id}`, refreshToken, 7 * 24 * 60 * 60);

    this.logger.log(`Login successful for user: ${loginDto.email} (ID: ${user.id})`);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        company: user.company,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    this.logger.log(`Processing registration for email: ${registerDto.email}`);
    
    // Validate email format
    this.validateEmail(registerDto.email);
    
    // Validate password complexity
    this.validatePassword(registerDto.password);

    this.logger.debug(`Checking if user already exists for email: ${registerDto.email}`);
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      this.logger.warn(`Registration failed - user already exists for email: ${registerDto.email}`);
      throw new ConflictException('User with this email already exists');
    }

    this.logger.debug(`Hashing password for user: ${registerDto.email}`);
    // Hash password with higher salt rounds for better security
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    this.logger.debug(`Looking for default SubAccount for user: ${registerDto.email}`);
    // Get or create default SubAccount for new users
    let defaultSubAccount = await this.prisma.subAccount.findFirst({
      where: { name: 'Default SubAccount' },
    });

    if (!defaultSubAccount) {
      this.logger.debug(`Default SubAccount not found, creating one for user: ${registerDto.email}`);
      // Create default SubAccount if it doesn't exist
      const defaultAdmin = await this.prisma.adminUser.findFirst({
        where: { role: 'super_admin' },
      });

      if (!defaultAdmin) {
        this.logger.error(`No admin available to create SubAccount for user: ${registerDto.email}`);
        throw new BadRequestException('No admin available to create SubAccount');
      }

      defaultSubAccount = await this.prisma.subAccount.create({
        data: {
          name: 'Default SubAccount',
          description: 'Default SubAccount for new users',
          createdByAdminId: defaultAdmin.id,
        },
      });
      this.logger.debug(`Created default SubAccount with ID: ${defaultSubAccount.id}`);
    }

    this.logger.debug(`Creating user in database: ${registerDto.email}`);
    const user = await this.prisma.user.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        company: registerDto.company,
        budget: registerDto.budget,
        subAccountId: defaultSubAccount.id,
      },
    });

    this.logger.log(`Registration successful for user: ${registerDto.email} (ID: ${user.id})`);
    const { password, ...result } = user;
    return result;
  }

  async logout(userId: number) {
    this.logger.log(`Processing logout for user ID: ${userId}`);
    
    try {
      // Remove refresh token from Redis
      await this.cacheService.delCache(`refresh:${userId}`);
      this.logger.log(`Logout successful for user ID: ${userId}`);
      return { message: 'Logged out successfully' };
    } catch (error) {
      this.logger.error(`Error during logout for user ID: ${userId}`, error.stack);
      throw error;
    }
  }

  async getProfile(userId: number) {
    this.logger.debug(`Retrieving profile for user ID: ${userId}`);
    
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
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

      if (!user) {
        this.logger.warn(`Profile not found for user ID: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug(`Profile retrieved successfully for user ID: ${userId}`);
      return user;
    } catch (error) {
      this.logger.error(`Error retrieving profile for user ID: ${userId}`, error.stack);
      throw error;
    }
  }

  async changePassword(userId: number, oldPassword: string, newPassword: string) {
    this.logger.log(`Processing password change for user ID: ${userId}`);
    
    // Validate new password complexity
    this.validatePassword(newPassword);

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        this.logger.warn(`Password change failed - user not found for ID: ${userId}`);
        throw new UnauthorizedException('User not found');
      }

      this.logger.debug(`Verifying old password for user ID: ${userId}`);
      // Verify old password
      const isOldPasswordValid = await bcrypt.compare(oldPassword, user.password);
      if (!isOldPasswordValid) {
        this.logger.warn(`Password change failed - incorrect old password for user ID: ${userId}`);
        throw new UnauthorizedException('Current password is incorrect');
      }

      this.logger.debug(`Checking if new password is different for user ID: ${userId}`);
      // Check if new password is different from old password
      const isNewPasswordSame = await bcrypt.compare(newPassword, user.password);
      if (isNewPasswordSame) {
        this.logger.warn(`Password change failed - new password same as old for user ID: ${userId}`);
        throw new BadRequestException('New password must be different from current password');
      }

      this.logger.debug(`Hashing new password for user ID: ${userId}`);
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 12);

      this.logger.debug(`Updating password in database for user ID: ${userId}`);
      // Update password
      await this.prisma.user.update({
        where: { id: userId },
        data: { password: hashedNewPassword },
      });

      this.logger.debug(`Invalidating refresh tokens for user ID: ${userId}`);
      // Invalidate all existing refresh tokens for this user
      await this.cacheService.delCache(`refresh:${userId}`);

      this.logger.log(`Password change successful for user ID: ${userId}`);
      return { message: 'Password changed successfully' };
    } catch (error) {
      this.logger.error(`Error changing password for user ID: ${userId}`, error.stack);
      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    this.logger.debug('Processing token refresh');
    
    try {
      this.logger.debug('Decoding refresh token');
      // Decode the refresh token to get user ID
      const decoded = this.jwtService.verify(refreshToken) as JwtPayload;
      const userId = decoded.sub;

      this.logger.debug(`Verifying refresh token from Redis for user ID: ${userId}`);
      // Verify refresh token from Redis
      const storedToken = await this.cacheService.getCache(`refresh:${userId}`);
      
      if (!storedToken || storedToken !== refreshToken) {
        this.logger.warn(`Invalid refresh token for user ID: ${userId}`);
        throw new UnauthorizedException('Invalid refresh token');
      }

      this.logger.debug(`Checking user status for user ID: ${userId}`);
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.isActive) {
        this.logger.warn(`User not found or inactive for user ID: ${userId}`);
        throw new UnauthorizedException('User not found or inactive');
      }

      const payload: JwtPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      this.logger.debug(`Generating new tokens for user ID: ${userId}`);
      // Generate new tokens with rotation
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      this.logger.debug(`Updating refresh token in Redis for user ID: ${userId}`);
      // Update refresh token in Redis (rotation)
      await this.cacheService.setCache(`refresh:${user.id}`, newRefreshToken, 7 * 24 * 60 * 60);

      this.logger.log(`Token refresh successful for user ID: ${userId}`);
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        this.logger.warn('Token refresh failed with UnauthorizedException');
        throw error;
      }
      this.logger.error('Token refresh failed with unexpected error', error.stack);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
} 