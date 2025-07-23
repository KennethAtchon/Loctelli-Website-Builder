import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    ConfigModule,
    CacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        
        let host = 'localhost';
        let port = 6379;
        let password: string | undefined;
        let db = 0;

        if (redisUrl) {
          // Parse REDIS_URL to extract connection details
          const url = new URL(redisUrl);
          host = url.hostname;
          port = parseInt(url.port) || 6379;
          password = url.password || undefined;
          db = parseInt(url.searchParams.get('db') || '0');
        } else {
          // Fallback to individual environment variables
          host = configService.get<string>('REDIS_HOST', 'localhost');
          port = configService.get<number>('REDIS_PORT', 6379);
          password = configService.get<string>('REDIS_PASSWORD');
          db = configService.get<number>('REDIS_DB', 0);
        }

        const store = await redisStore({
          socket: {
            host,
            port,
          },
          password,
          database: db,
          ttl: 3600000, // 1 hour global TTL in milliseconds
        });

        return {
          store,
        };
      },
    }),
  ],
  providers: [CacheService],
  exports: [CacheModule, CacheService],
})
export class CommonModule {} 