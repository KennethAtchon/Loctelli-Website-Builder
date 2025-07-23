import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';

@Injectable()
export class StatusService {
  private readonly logger = new Logger(StatusService.name);
  
  constructor(
    private readonly prismaService: PrismaService,
    private readonly cacheService: CacheService,
  ) {}

  async getHealthStatus() {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: 'unknown',
        redis: 'unknown',
      },
      uptime: process.uptime(),
    };

    // Check database health
    try {
      await this.prismaService.$queryRaw`SELECT 1`;
      health.services.database = 'ok';
    } catch (error) {
      this.logger.error('Database health check failed:', error);
      health.services.database = 'error';
      health.status = 'error';
    }

    // Check Redis health
    try {
      const testKey = 'health-check';
      const testValue = 'test';
      await this.cacheService.setCache(testKey, testValue, 1);
      const result = await this.cacheService.getCache(testKey);
      
      if (result === testValue) {
        health.services.redis = 'ok';
      } else {
        throw new Error('Redis value mismatch');
      }
    } catch (error) {
      this.logger.error('Redis health check failed:', error);
      health.services.redis = 'error';
      health.status = 'error';
    }

    return health;
  }

  async getStatus() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };
  }

  async getVersion() {
    return {
      version: process.env.npm_package_version || '1.0.0',
    };
  }
}
