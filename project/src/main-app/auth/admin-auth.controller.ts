import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { AdminAuthService, AdminLoginDto, AdminRegisterDto } from './admin-auth.service';
import { AdminAuthCodeService } from './admin-auth-code.service';
import { JwtAuthGuard } from './auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(
    private adminAuthService: AdminAuthService,
    private adminAuthCodeService: AdminAuthCodeService,
  ) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async adminLogin(@Body() loginDto: AdminLoginDto) {
    this.logger.log(`🔐 Admin login attempt for email: ${loginDto.email}`);
    this.logger.debug(`Admin login data: ${JSON.stringify({ ...loginDto, password: '[REDACTED]' })}`);
    
    try {
      const result = await this.adminAuthService.adminLogin(loginDto);
      this.logger.log(`✅ Admin login successful for email: ${loginDto.email} (ID: ${result.admin.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin login failed for email: ${loginDto.email}`, error.stack);
      throw error;
    }
  }

  @Post('register')
  @Public()
  async adminRegister(@Body() registerDto: AdminRegisterDto & { authCode: string }) {
    this.logger.log(`📝 Admin registration attempt for email: ${registerDto.email}`);
    this.logger.debug(`Admin registration data: ${JSON.stringify({ ...registerDto, password: '[REDACTED]', authCode: '[REDACTED]' })}`);
    
    try {
      // Validate the authorization code before proceeding with registration
      this.logger.debug(`Validating auth code for admin registration: ${registerDto.email}`);
      const isValidAuthCode = this.adminAuthCodeService.validateAuthCode(registerDto.authCode);
      
      if (!isValidAuthCode) {
        this.logger.warn(`Admin registration failed - invalid auth code for email: ${registerDto.email}`);
        throw new BadRequestException('Invalid authorization code. Please contact the system administrator.');
      }
      
      this.logger.debug(`Auth code validated successfully for admin registration: ${registerDto.email}`);
      const result = await this.adminAuthService.adminRegister(registerDto);
      this.logger.log(`✅ Admin registration successful for email: ${registerDto.email} (ID: ${result.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin registration failed for email: ${registerDto.email}`, error.stack);
      throw error;
    }
  }

  @Post('refresh')
  @Public()
  async adminRefreshToken(@Body() body: { refresh_token: string }) {
    this.logger.log(`🔄 Admin token refresh attempt`);
    this.logger.debug(`Admin refresh token: ${body.refresh_token.substring(0, 20)}...`);
    
    try {
      const result = await this.adminAuthService.adminRefreshToken(body.refresh_token);
      this.logger.log(`✅ Admin token refresh successful`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin token refresh failed`, error.stack);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async adminLogout(@CurrentUser() user) {
    this.logger.log(`🚪 Admin logout attempt for user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.adminAuthService.adminLogout(user.userId);
      this.logger.log(`✅ Admin logout successful for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin logout failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getAdminProfile(@CurrentUser() user) {
    this.logger.log(`👤 Admin profile request for user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.adminAuthService.getAdminProfile(user.userId);
      this.logger.log(`✅ Admin profile retrieved successfully for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin profile retrieval failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateAdminProfile(
    @CurrentUser() user,
    @Body() profileData: {
      name?: string;
      email?: string;
    }
  ) {
    this.logger.log(`✏️ Admin profile update attempt for user: ${user.email} (ID: ${user.userId})`);
    this.logger.debug(`Admin profile update data: ${JSON.stringify(profileData)}`);
    
    try {
      const result = await this.adminAuthService.updateAdminProfile(user.userId, profileData);
      this.logger.log(`✅ Admin profile updated successfully for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin profile update failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changeAdminPassword(
    @CurrentUser() user,
    @Body() passwordData: {
      oldPassword: string;
      newPassword: string;
    }
  ) {
    this.logger.log(`🔑 Admin password change attempt for user: ${user.email} (ID: ${user.userId})`);
    this.logger.debug(`Admin password change request for user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.adminAuthService.changeAdminPassword(user.userId, passwordData.oldPassword, passwordData.newPassword);
      this.logger.log(`✅ Admin password change successful for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin password change failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async getAllUsers(@CurrentUser() user, @Query('subaccountId') subaccountId?: string) {
    this.logger.log(`👥 All users request by admin: ${user.email} (ID: ${user.userId})${subaccountId ? ` for subaccount: ${subaccountId}` : ''}`);
    
    try {
      const parsedSubaccountId = subaccountId ? parseInt(subaccountId, 10) : undefined;
      const result = await this.adminAuthService.getAllUsers(user.userId, parsedSubaccountId);
      this.logger.log(`✅ All users retrieved successfully by admin: ${user.email} (ID: ${user.userId}) - ${result.length} users`);
      return result;
    } catch (error) {
      this.logger.error(`❌ All users retrieval failed by admin: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async createUser(@CurrentUser() user, @Body() userData: {
    name: string;
    email: string;
    password: string;
    company?: string;
    role?: string;
  }) {
    this.logger.log(`👤 User creation attempt by admin: ${user.email} (ID: ${user.userId}) for email: ${userData.email}`);
    this.logger.debug(`User creation data: ${JSON.stringify({ ...userData, password: '[REDACTED]' })}`);
    
    try {
      const result = await this.adminAuthService.createUser(user.userId, userData);
      this.logger.log(`✅ User created successfully by admin: ${user.email} (ID: ${user.userId}) for email: ${userData.email} (User ID: ${result.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ User creation failed by admin: ${user.email} (ID: ${user.userId}) for email: ${userData.email}`, error.stack);
      throw error;
    }
  }

  @Put('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async updateUser(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) userId: number,
    @Body() userData: {
      name?: string;
      email?: string;
      role?: string;
      company?: string;
      isActive?: boolean;
    }
  ) {
    this.logger.log(`✏️ User update attempt by admin: ${user.email} (ID: ${user.userId}) for user ID: ${userId}`);
    this.logger.debug(`User update data: ${JSON.stringify(userData)}`);
    
    try {
      const result = await this.adminAuthService.updateUser(user.userId, userId, userData);
      this.logger.log(`✅ User updated successfully by admin: ${user.email} (ID: ${user.userId}) for user ID: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ User update failed by admin: ${user.email} (ID: ${user.userId}) for user ID: ${userId}`, error.stack);
      throw error;
    }
  }

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'super_admin')
  async deleteUser(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) userId: number
  ) {
    this.logger.log(`🗑️ User deletion attempt by admin: ${user.email} (ID: ${user.userId}) for user ID: ${userId}`);
    
    try {
      const result = await this.adminAuthService.deleteUser(user.userId, userId);
      this.logger.log(`✅ User deleted successfully by admin: ${user.email} (ID: ${user.userId}) for user ID: ${userId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ User deletion failed by admin: ${user.email} (ID: ${user.userId}) for user ID: ${userId}`, error.stack);
      throw error;
    }
  }

  @Post('generate-auth-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async generateAuthCode(@CurrentUser() user) {
    this.logger.log(`🔑 Auth code generation attempt by super admin: ${user.email} (ID: ${user.userId})`);
    
    try {
      const authCode = this.adminAuthCodeService.generateAuthCode(20);
      this.logger.log(`✅ Auth code generated successfully by super admin: ${user.email} (ID: ${user.userId})`);
      return {
        authCode,
        message: 'Admin authorization code generated successfully',
        expiresIn: 'Never (until changed in environment)',
      };
    } catch (error) {
      this.logger.error(`❌ Auth code generation failed by super admin: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Get('current-auth-code')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async getCurrentAuthCode(@CurrentUser() user) {
    this.logger.log(`🔍 Current auth code request by super admin: ${user.email} (ID: ${user.userId})`);
    
    try {
      const authCode = this.adminAuthCodeService.getCurrentAuthCode();
      this.logger.log(`✅ Current auth code retrieved successfully by super admin: ${user.email} (ID: ${user.userId})`);
      return {
        authCode,
        message: 'Current admin authorization code',
      };
    } catch (error) {
      this.logger.error(`❌ Current auth code retrieval failed by super admin: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Get('accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async getAllAdminAccounts(@CurrentUser() user) {
    this.logger.log(`👥 All admin accounts request by super admin: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.adminAuthService.getAllAdminAccounts();
      this.logger.log(`✅ All admin accounts retrieved successfully by super admin: ${user.email} (ID: ${user.userId}) - ${result.length} accounts`);
      return result;
    } catch (error) {
      this.logger.error(`❌ All admin accounts retrieval failed by super admin: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Delete('accounts/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('super_admin')
  async deleteAdminAccount(
    @CurrentUser() user,
    @Param('id', ParseIntPipe) adminId: number
  ) {
    this.logger.log(`🗑️ Admin account deletion attempt by super admin: ${user.email} (ID: ${user.userId}) for admin ID: ${adminId}`);
    
    try {
      const result = await this.adminAuthService.deleteAdminAccount(user.userId, adminId);
      this.logger.log(`✅ Admin account deleted successfully by super admin: ${user.email} (ID: ${user.userId}) for admin ID: ${adminId}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Admin account deletion failed by super admin: ${user.email} (ID: ${user.userId}) for admin ID: ${adminId}`, error.stack);
      throw error;
    }
  }
} 