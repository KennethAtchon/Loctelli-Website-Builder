import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SecurityConfig {
  jwt: {
    secret: string;
    accessTokenExpiration: string;
    refreshTokenExpiration: string;
  };
  api: {
    key: string;
    rateLimit: {
      windowMs: number;
      maxRequests: number;
    };
  };
  admin: {
    authCode: string;
    defaultPassword: string;
  };
  database: {
    url: string;
    ssl: boolean;
  };
  redis: {
    url: string;
    password: string;
  };
  cors: {
    origins: string[];
    credentials: boolean;
  };
  security: {
    bcryptRounds: number;
    passwordMinLength: number;
    adminPasswordMinLength: number;
    maxRequestSize: number;
  };
}

@Injectable()
export class SecurityConfigService {
  constructor(private configService: ConfigService) {}

  get config(): SecurityConfig {
    return {
      jwt: {
        secret: this.getRequiredEnv('JWT_SECRET'),
        accessTokenExpiration: '15m',
        refreshTokenExpiration: '7d',
      },
      api: {
        key: this.getRequiredEnv('API_KEY'),
        rateLimit: {
          windowMs: 15 * 60 * 1000, // 15 minutes
          maxRequests: 100,
        },
      },
      admin: {
        authCode: this.getRequiredEnv('ADMIN_AUTH_CODE'),
        defaultPassword: this.getRequiredEnv('DEFAULT_ADMIN_PASSWORD'),
      },
      database: {
        url: this.getRequiredEnv('DATABASE_URL'),
        ssl: this.configService.get('NODE_ENV') === 'production',
      },
      redis: {
        url: this.getRequiredEnv('REDIS_URL'),
        password: this.configService.get('REDIS_PASSWORD') || '',
      },
      cors: {
        origins: this.getCorsOrigins(),
        credentials: true,
      },
      security: {
        bcryptRounds: 12,
        passwordMinLength: 8,
        adminPasswordMinLength: 12,
        maxRequestSize: 10 * 1024 * 1024, // 10MB
      },
    };
  }

  private getRequiredEnv(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return value;
  }

  private getCorsOrigins(): string[] {
    const origins = [
      'http://localhost:3000',
      'http://loctelli_frontend:3000',
      'http://frontend:3000',
    ];

    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    if (frontendUrl) {
      origins.push(frontendUrl);
    }

    return origins.filter(Boolean);
  }

  // Validation methods
  validateJwtSecret(secret: string): boolean {
    return secret.length >= 32 && !secret.includes('your-super-secret');
  }

  validateApiKey(apiKey: string): boolean {
    return apiKey.length >= 32 && !apiKey.includes('your-api-key');
  }

  validateAdminAuthCode(authCode: string): boolean {
    return authCode.length >= 16 && !authCode.includes('ADMIN_2024_SECURE');
  }

  validateAdminPassword(password: string): boolean {
    return password.length >= 12 && !password.includes('password') && !password.includes('admin');
  }

  validateDatabaseUrl(url: string): boolean {
    return url.startsWith('postgresql://') && !url.includes('password');
  }

  validateRedisUrl(url: string): boolean {
    return url.startsWith('redis://') || url.startsWith('rediss://');
  }

  // Security checks
  validateSecurityConfig(): void {
    const config = this.config;

    if (!this.validateJwtSecret(config.jwt.secret)) {
      throw new Error('JWT_SECRET is not secure. Use a strong, random secret.');
    }

    if (!this.validateApiKey(config.api.key)) {
      throw new Error('API_KEY is not secure. Use a strong, random key.');
    }

    if (!this.validateAdminAuthCode(config.admin.authCode)) {
      throw new Error('ADMIN_AUTH_CODE is not secure. Use a strong, random code.');
    }

    if (!this.validateAdminPassword(config.admin.defaultPassword)) {
      throw new Error('DEFAULT_ADMIN_PASSWORD is not secure. Use a strong password.');
    }

    if (!this.validateDatabaseUrl(config.database.url)) {
      throw new Error('DATABASE_URL is not properly configured.');
    }

    if (!this.validateRedisUrl(config.redis.url)) {
      throw new Error('REDIS_URL is not properly configured.');
    }

    // Check for development defaults in production
    if (this.configService.get('NODE_ENV') === 'production') {
      if (config.jwt.secret.includes('your-super-secret')) {
        throw new Error('JWT_SECRET contains default value in production');
      }
      if (config.api.key.includes('your-api-key')) {
        throw new Error('API_KEY contains default value in production');
      }
      if (config.admin.authCode.includes('ADMIN_2024_SECURE')) {
        throw new Error('ADMIN_AUTH_CODE contains default value in production');
      }
    }
  }

  // Generate secure secrets (for development)
  static generateSecureSecret(length: number = 32): string {
    const crypto = require('crypto');
    return crypto.randomBytes(length).toString('hex');
  }

  static generateSecureApiKey(): string {
    return this.generateSecureSecret(32);
  }

  static generateSecureAdminAuthCode(): string {
    return this.generateSecureSecret(16).toUpperCase();
  }
} 