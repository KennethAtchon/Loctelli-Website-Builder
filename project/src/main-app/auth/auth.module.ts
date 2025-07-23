import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthCodeService } from './admin-auth-code.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import { AdminGuard } from './guards/admin.guard';
import { PrismaModule } from '../infrastructure/prisma/prisma.module';
import { AppCacheModule } from '../infrastructure/cache/cache.module';

@Module({
  imports: [
    PrismaModule,
    AppCacheModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, AdminAuthService, AdminAuthCodeService, JwtStrategy, RolesGuard, AdminGuard],
  controllers: [AuthController, AdminAuthController],
  exports: [AuthService, AdminAuthService],
})
export class AuthModule {} 