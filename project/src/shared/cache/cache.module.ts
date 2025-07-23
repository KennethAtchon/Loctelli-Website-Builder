import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    ConfigModule,
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisConfig = configService.get('redis');
        const cacheConfig = configService.get('cache');
        
        // Use REDIS_URL if available, otherwise fall back to host/port
        const redisUrl = redisConfig?.url;
        
        if (redisUrl) {
          const store = await redisStore({
            url: redisUrl,
            ttl: cacheConfig?.ttl || 3 * 60000,
          });
          
          return {
            store,
          };
        } else {
          // Fallback to host/port configuration
          const host = redisConfig?.host || 'localhost';
          const port = redisConfig?.port || 6379;
          
          const store = await redisStore({
            socket: {
              host,
              port,
            },
            ttl: cacheConfig?.ttl || 3 * 60000,
          });
          
          return {
            store,
          };
        }
      },
    }),
  ],
  providers: [CacheService],
  exports: [NestCacheModule, CacheService],
})
export class CacheModule {} 