import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';
import * as bcrypt from 'bcrypt';

export interface AdminLoginDto {
  email: string;
  password: string;
}

export interface AdminRegisterDto {
  name: string;
  email: string;
  password: string;
  role: string;
  authCode: string;
}

export interface AdminJwtPayload {
  sub: number;
  email: string;
  role: string;
  type: 'admin';
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private cacheService: CacheService,
  ) {}

  // Password validation function
  private validatePassword(password: string): void {
    this.logger.debug('Validating admin password complexity');
    
    const minLength = 12; // Higher requirement for admin passwords
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < minLength) {
      this.logger.warn('Admin password validation failed: too short');
      throw new BadRequestException('Admin password must be at least 12 characters long');
    }
    if (!hasUpperCase) {
      this.logger.warn('Admin password validation failed: no uppercase letter');
      throw new BadRequestException('Admin password must contain at least one uppercase letter');
    }
    if (!hasLowerCase) {
      this.logger.warn('Admin password validation failed: no lowercase letter');
      throw new BadRequestException('Admin password must contain at least one lowercase letter');
    }
    if (!hasNumbers) {
      this.logger.warn('Admin password validation failed: no number');
      throw new BadRequestException('Admin password must contain at least one number');
    }
    if (!hasSpecialChar) {
      this.logger.warn('Admin password validation failed: no special character');
      throw new BadRequestException('Admin password must contain at least one special character');
    }
    
    this.logger.debug('Admin password validation passed');
  }

  // Email validation function
  private validateEmail(email: string): void {
    this.logger.debug(`Validating admin email format: ${email}`);
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.logger.warn(`Admin email validation failed: ${email}`);
      throw new BadRequestException('Invalid email format');
    }
    
    this.logger.debug(`Admin email validation passed: ${email}`);
  }

  async validateAdminUser(email: string, password: string): Promise<any> {
    this.logger.debug(`Validating admin user credentials for email: ${email}`);
    
    try {
      const adminUser = await this.prisma.adminUser.findUnique({
        where: { email },
      });

      if (!adminUser) {
        this.logger.warn(`Admin user not found for email: ${email}`);
        return null;
      }

      this.logger.debug(`Admin user found for email: ${email}, comparing passwords`);
      const isPasswordValid = await bcrypt.compare(password, adminUser.password);
      
      if (isPasswordValid) {
        this.logger.debug(`Admin password validation successful for user: ${email}`);
        const { password, ...result } = adminUser;
        return result;
      } else {
        this.logger.warn(`Admin password validation failed for user: ${email}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`Error validating admin user credentials for email: ${email}`, error.stack);
      throw error;
    }
  }

  async adminLogin(loginDto: AdminLoginDto) {
    this.logger.log(`🔐 Admin login attempt for email: ${loginDto.email}`);
    
    // Validate email format
    this.validateEmail(loginDto.email);

    const adminUser = await this.validateAdminUser(loginDto.email, loginDto.password);
    
    if (!adminUser) {
      this.logger.warn(`Admin login failed - invalid credentials for email: ${loginDto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!adminUser.isActive) {
      this.logger.warn(`Admin login failed - account deactivated for email: ${loginDto.email}`);
      throw new UnauthorizedException('Admin account is deactivated');
    }

    this.logger.debug(`Updating last login for admin: ${loginDto.email}`);
    // Update last login
    await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    });

    const payload: AdminJwtPayload = {
      sub: adminUser.id,
      email: adminUser.email,
      role: adminUser.role,
      type: 'admin',
    };

    this.logger.debug(`Generating admin JWT tokens for user: ${loginDto.email}`);
    // Reduced token expiration for better security
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    this.logger.debug(`Storing admin refresh token in Redis for user: ${loginDto.email}`);
    // Store refresh token in Redis with rotation
    const cacheDurationSeconds = 7 * 24 * 60 * 60; // 7 days in seconds
    const cacheDurationHours = cacheDurationSeconds / 3600;
    const cacheDurationDays = cacheDurationHours / 24;
    
    this.logger.log(`⏰ ADMIN REFRESH TOKEN CACHE DURATION: ${cacheDurationDays} days (${cacheDurationHours} hours, ${cacheDurationSeconds} seconds) for user: ${loginDto.email}`);
    
    try {
      await this.cacheService.setCache(`admin_refresh:${adminUser.id}`, refreshToken, cacheDurationSeconds);
      this.logger.debug(`✅ Admin refresh token stored successfully in Redis for user: ${loginDto.email}`);
      
      // Verify the token was stored correctly
              const storedToken = await this.cacheService.getCache(`admin_refresh:${adminUser.id}`);
      if (storedToken === refreshToken) {
        this.logger.debug(`✅ Admin refresh token verification successful for user: ${loginDto.email}`);
      } else {
        this.logger.error(`❌ Admin refresh token verification failed for user: ${loginDto.email}`);
      }
    } catch (error) {
      this.logger.error(`❌ Failed to store admin refresh token in Redis for user: ${loginDto.email}`, error);
      throw new Error('Failed to store refresh token');
    }

    this.logger.log(`✅ Admin login successful for user: ${loginDto.email} (ID: ${adminUser.id})`);
    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        permissions: adminUser.permissions,
      },
    };
  }

  async adminRegister(registerDto: AdminRegisterDto) {
    this.logger.log(`📝 Admin registration attempt for email: ${registerDto.email}`);
    
    // Validate email format
    this.validateEmail(registerDto.email);
    
    // Validate password complexity
    this.validatePassword(registerDto.password);

    this.logger.debug(`Validating admin role: ${registerDto.role}`);
    // Validate role
    if (!['admin', 'super_admin'].includes(registerDto.role)) {
      this.logger.warn(`Admin registration failed - invalid role: ${registerDto.role}`);
      throw new BadRequestException('Invalid admin role');
    }

    this.logger.debug(`Checking if admin already exists for email: ${registerDto.email}`);
    // Check if admin already exists
    const existingAdmin = await this.prisma.adminUser.findUnique({
      where: { email: registerDto.email },
    });

    if (existingAdmin) {
      this.logger.warn(`Admin registration failed - admin already exists for email: ${registerDto.email}`);
      throw new ConflictException('Admin with this email already exists');
    }

    this.logger.debug(`Hashing admin password for user: ${registerDto.email}`);
    // Hash password with higher salt rounds for better security
    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    this.logger.debug(`Creating admin user in database: ${registerDto.email}`);
    const adminUser = await this.prisma.adminUser.create({
      data: {
        name: registerDto.name,
        email: registerDto.email,
        password: hashedPassword,
        role: registerDto.role,
      },
    });

    this.logger.log(`✅ Admin registration successful for user: ${registerDto.email} (ID: ${adminUser.id})`);
    const { password, ...result } = adminUser;
    return result;
  }

  async createUser(adminId: number, userData: {
    name: string;
    email: string;
    password: string;
    company?: string;
    role?: string;
    subAccountId?: number;
  }) {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Get default SubAccount if not provided
    let subAccountId = userData.subAccountId;
    if (!subAccountId) {
      const defaultSubAccount = await this.prisma.subAccount.findFirst({
        where: { name: 'Default SubAccount' },
      });
      if (!defaultSubAccount) {
        throw new BadRequestException('No default SubAccount available for user creation');
      }
      subAccountId = defaultSubAccount.id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 12);

    // Create user with admin reference
    const user = await this.prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        company: userData.company,
        role: userData.role || 'user',
        createdByAdminId: adminId,
        subAccountId: subAccountId,
      },
    });

    const { password, ...result } = user;
    return result;
  }

  async adminLogout(adminId: number) {
    // Remove refresh token from Redis
    await this.cacheService.delCache(`admin_refresh:${adminId}`);
    return { message: 'Admin logged out successfully' };
  }

  async getAdminProfile(adminId: number) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!adminUser) {
      throw new UnauthorizedException('Admin user not found');
    }

    return adminUser;
  }

  async updateAdminProfile(adminId: number, profileData: {
    name?: string;
    email?: string;
  }) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!adminUser) {
      throw new UnauthorizedException('Admin user not found');
    }

    // If email is being updated, check if it's already taken
    if (profileData.email && profileData.email !== adminUser.email) {
      const existingAdmin = await this.prisma.adminUser.findUnique({
        where: { email: profileData.email },
      });

      if (existingAdmin) {
        throw new BadRequestException('Email is already taken');
      }
    }

    // Update admin profile
    const updatedAdmin = await this.prisma.adminUser.update({
      where: { id: adminId },
      data: profileData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    return updatedAdmin;
  }

  async getAllUsers(adminId: number, subaccountId?: number) {
    // Verify admin permissions
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin access required');
    }

    // Build where clause
    const whereClause: any = {};
    
    if (subaccountId) {
      // Filter by specific subaccount
      whereClause.subAccountId = subaccountId;
    } else {
      // All admins can see all users (no additional filtering needed)
    }

    return this.prisma.user.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        subAccountId: true,
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updateUser(adminId: number, userId: number, userData: {
    name?: string;
    email?: string;
    role?: string;
    company?: string;
    isActive?: boolean;
  }) {
    // Verify admin permissions
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin access required');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  async deleteUser(adminId: number, userId: number) {
    // Verify admin permissions
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Admin access required');
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new UnauthorizedException('User not found');
    }

    // Delete user (this will cascade to related records)
    await this.prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'User deleted successfully' };
  }

  async changeAdminPassword(adminId: number, oldPassword: string, newPassword: string) {
    // Validate new password complexity
    this.validatePassword(newPassword);

    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!adminUser) {
      throw new UnauthorizedException('Admin user not found');
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, adminUser.password);
    if (!isOldPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check if new password is different from old password
    const isNewPasswordSame = await bcrypt.compare(newPassword, adminUser.password);
    if (isNewPasswordSame) {
      throw new BadRequestException('New password must be different from current password');
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { password: hashedNewPassword },
    });

    // Invalidate all existing refresh tokens for this admin
    await this.cacheService.delCache(`admin_refresh:${adminId}`);

    return { message: 'Admin password changed successfully' };
  }

  async adminRefreshToken(refreshToken: string) {
    this.logger.log('🔄 Starting admin token refresh process');
    this.logger.debug(`Refresh token received: ${refreshToken.substring(0, 20)}...`);
    
    try {
      // Decode the refresh token to get admin ID
      this.logger.debug('🔍 Decoding refresh token...');
      const decoded = this.jwtService.verify(refreshToken) as AdminJwtPayload;
      const adminId = decoded.sub;
      this.logger.debug(`✅ Token decoded successfully for admin ID: ${adminId}`);

      // Verify refresh token from Redis
      this.logger.debug(`🔍 Checking Redis for stored refresh token for admin ID: ${adminId}`);
      const storedToken = await this.cacheService.getCache(`admin_refresh:${adminId}`);
      
      if (!storedToken) {
        this.logger.warn(`❌ No stored refresh token found in Redis for admin ID: ${adminId}`);
        throw new UnauthorizedException('Invalid refresh token - not found in Redis');
      }
      
      if (storedToken !== refreshToken) {
        this.logger.warn(`❌ Stored token mismatch for admin ID: ${adminId}`);
        this.logger.debug(`Expected: ${storedToken.substring(0, 20)}...`);
        this.logger.debug(`Received: ${refreshToken.substring(0, 20)}...`);
        throw new UnauthorizedException('Invalid refresh token - token mismatch');
      }
      
      this.logger.debug(`✅ Refresh token verified in Redis for admin ID: ${adminId}`);

      this.logger.debug(`🔍 Fetching admin user from database for ID: ${adminId}`);
      const adminUser = await this.prisma.adminUser.findUnique({
        where: { id: adminId },
      });

      if (!adminUser) {
        this.logger.warn(`❌ Admin user not found in database for ID: ${adminId}`);
        throw new UnauthorizedException('Admin user not found or inactive');
      }
      
      if (!adminUser.isActive) {
        this.logger.warn(`❌ Admin user is inactive for ID: ${adminId}`);
        throw new UnauthorizedException('Admin user not found or inactive');
      }
      
      this.logger.debug(`✅ Admin user verified as active: ${adminUser.email}`);

      const payload: AdminJwtPayload = {
        sub: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        type: 'admin',
      };

      // Generate new tokens with rotation
      this.logger.debug('🔑 Generating new access and refresh tokens...');
      const newAccessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
      const newRefreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

      // Update refresh token in Redis (rotation)
      this.logger.debug(`💾 Storing new refresh token in Redis for admin ID: ${adminUser.id}`);
      await this.cacheService.setCache(`admin_refresh:${adminUser.id}`, newRefreshToken, 7 * 24 * 60 * 60);
      this.logger.debug(`✅ New refresh token stored successfully`);

      this.logger.log(`✅ Admin token refresh successful for user: ${adminUser.email} (ID: ${adminUser.id})`);
      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
      };
    } catch (error) {
      this.logger.error(`❌ Admin token refresh failed:`, error.stack);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async getAllAdminAccounts() {
    return this.prisma.adminUser.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        permissions: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async deleteAdminAccount(adminId: number, targetAdminId: number) {
    // Verify the requesting admin is a super admin
    const requestingAdmin = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!requestingAdmin || requestingAdmin.role !== 'super_admin') {
      throw new UnauthorizedException('Super admin access required');
    }

    // Prevent self-deletion
    if (adminId === targetAdminId) {
      throw new BadRequestException('You cannot delete your own account');
    }

    // Check if target admin exists
    const targetAdmin = await this.prisma.adminUser.findUnique({
      where: { id: targetAdminId },
    });

    if (!targetAdmin) {
      throw new UnauthorizedException('Admin account not found');
    }

    // Get count of users created by this admin
    const usersCreatedByAdmin = await this.prisma.user.count({
      where: { createdByAdminId: targetAdminId },
    });

    // Update all users created by this admin to remove the reference
    if (usersCreatedByAdmin > 0) {
      await this.prisma.user.updateMany({
        where: { createdByAdminId: targetAdminId },
        data: { createdByAdminId: null },
      });
    }

    // Delete the admin account
    await this.prisma.adminUser.delete({
      where: { id: targetAdminId },
    });

    // Invalidate any existing refresh tokens for the deleted admin
    await this.cacheService.delCache(`admin_refresh:${targetAdminId}`);

    return { 
      message: `Admin account deleted successfully. ${usersCreatedByAdmin} user(s) created by this admin have been updated to remove the admin reference.` 
    };
  }
} 