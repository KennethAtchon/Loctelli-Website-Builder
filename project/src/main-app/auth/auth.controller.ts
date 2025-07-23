import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AuthService, LoginDto, RegisterDto } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: { email: string; password: string }) {
    this.logger.log(`🔐 Login attempt for email: ${loginDto.email}`);
    this.logger.debug(`Login request body: ${JSON.stringify({ ...loginDto, password: '[REDACTED]' })}`);
    
    try {
      const result = await this.authService.login(loginDto);
      this.logger.log(`✅ Login successful for user: ${loginDto.email} (ID: ${result.user.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Login failed for email: ${loginDto.email}`, error.stack);
      throw error;
    }
  }

  @Post('register')
  @Public()
  async register(@Body() registerDto: { name: string; email: string; password: string }) {
    this.logger.log(`📝 Registration attempt for email: ${registerDto.email}`);
    this.logger.debug(`Registration request body: ${JSON.stringify({ ...registerDto, password: '[REDACTED]' })}`);
    
    try {
      const result = await this.authService.register(registerDto);
      this.logger.log(`✅ Registration successful for user: ${registerDto.email} (ID: ${result.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Registration failed for email: ${registerDto.email}`, error.stack);
      throw error;
    }
  }

  @Post('refresh')
  @Public()
  async refreshToken(@Body() body: { refresh_token: string }) {
    this.logger.log(`🔄 Token refresh attempt`);
    this.logger.debug(`Refresh token: ${body.refresh_token.substring(0, 20)}...`);
    
    try {
      const result = await this.authService.refreshToken(body.refresh_token);
      this.logger.log(`✅ Token refresh successful`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Token refresh failed`, error.stack);
      throw error;
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user) {
    this.logger.log(`🚪 Logout attempt for user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.authService.logout(user.userId);
      this.logger.log(`✅ Logout successful for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Logout failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user) {
    this.logger.log(`👤 Profile request for user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.authService.getProfile(user.userId);
      this.logger.log(`✅ Profile retrieved successfully for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Profile retrieval failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @CurrentUser() user,
    @Body() passwordData: { oldPassword: string; newPassword: string }
  ) {
    this.logger.log(`🔑 Password change attempt for user: ${user.email} (ID: ${user.userId})`);
    this.logger.debug(`Password change request for user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.authService.changePassword(user.userId, passwordData.oldPassword, passwordData.newPassword);
      this.logger.log(`✅ Password change successful for user: ${user.email} (ID: ${user.userId})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Password change failed for user: ${user.email} (ID: ${user.userId})`, error.stack);
      throw error;
    }
  }
} 