import { Injectable, NestMiddleware, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { CacheService } from '../cache/cache.service';

interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Skip counting successful requests
  skipFailedRequests?: boolean; // Skip counting failed requests
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    skipSuccessfulRequests: false,
    skipFailedRequests: false,
  };

  constructor(private readonly cacheService: CacheService) {}

  use(req: Request, res: Response, next: NextFunction) {
    this.logger.log(`🚀 Rate limit middleware triggered for: ${req.method} ${req.url} from ${req.ip || req.connection.remoteAddress || 'unknown'}`);
    
    // Determine which configuration to use based on the route
    const config = this.getConfigForRoute(req);
    this.logger.log(`🎯 Selected rate limit config: ${config.maxRequests} requests per ${config.windowMs / 1000 / 60} minutes`);
    
    this.handleRateLimit(req, res, next, config);
  }

  private getConfigForRoute(req: Request): RateLimitConfig {
    const path = req.path;
    const method = req.method;
    
    // Check if this is an auth endpoint
    const isAuthEndpoint = (
      (path === '/auth/login' && method === 'POST') ||
      (path === '/auth/register' && method === 'POST') ||
      (path === '/admin/auth/login' && method === 'POST') ||
      (path === '/admin/auth/register' && method === 'POST')
    );
    
    if (isAuthEndpoint) {
      this.logger.log(`🔐 Auth endpoint detected: ${method} ${path} - using auth rate limit`);
      return {
        ...this.defaultConfig,
        ...authRateLimit,
      };
    }
    
    // Check if this is a general API endpoint (not status/health)
    const isApiEndpoint = !path.startsWith('/status/');
    
    if (isApiEndpoint) {
      this.logger.log(`🌐 API endpoint detected: ${method} ${path} - using API rate limit`);
      return {
        ...this.defaultConfig,
        ...apiRateLimit,
      };
    }
    
    this.logger.log(`📊 Default endpoint: ${method} ${path} - using default rate limit`);
    return this.defaultConfig;
  }

  private async handleRateLimit(
    req: Request,
    res: Response,
    next: NextFunction,
    config: RateLimitConfig
  ) {
    const route = `${req.method} ${req.url}`;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    this.logger.log(`🔍 Starting rate limit check for: ${route} from ${clientIP}`);
    this.logger.log(`⚙️ Rate limit config: ${config.maxRequests} requests per ${config.windowMs / 1000 / 60} minutes`);
    
    try {
      const key = this.generateKey(req, config);
      this.logger.log(`🔑 Generated rate limit key: ${key}`);
      
      const current = await this.getCurrentRequests(key);
      this.logger.log(`📊 Current requests for ${key}: ${current}/${config.maxRequests} (${Math.round((current / config.maxRequests) * 100)}% used)`);
      
      if (current >= config.maxRequests) {
        const retryAfter = await this.getRetryAfter(key, config.windowMs);
        
        this.logger.warn(`🚫 RATE LIMIT EXCEEDED! Key: ${key}`);
        this.logger.warn(`🚫 Route: ${route} from ${clientIP}`);
        this.logger.warn(`🚫 Current: ${current}/${config.maxRequests} (100% used)`);
        this.logger.warn(`🚫 Retry after: ${retryAfter} seconds (${new Date(Date.now() + retryAfter * 1000).toISOString()})`);
        
        res.setHeader('X-RateLimit-Limit', config.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);
        res.setHeader('X-RateLimit-Reset', Date.now() + (retryAfter * 1000));
        res.setHeader('Retry-After', retryAfter);
        
        // Return 429 response without throwing exception to prevent crashes
        res.status(HttpStatus.TOO_MANY_REQUESTS).json({
          message: 'Too many requests',
          retryAfter: retryAfter,
        });
        return; // Stop processing, don't call next()
      }

      // Increment request count
      this.logger.log(`📈 Incrementing request count for key: ${key}`);
      await this.incrementRequests(key, current, config.windowMs);
      
      // Set rate limit headers
      const remaining = Math.max(0, config.maxRequests - current - 1);
      const resetTime = Date.now() + config.windowMs;
      
      res.setHeader('X-RateLimit-Limit', config.maxRequests);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      this.logger.log(`✅ Rate limit check PASSED for key: ${key}`);
      this.logger.log(`✅ Route: ${route} from ${clientIP}`);
      this.logger.log(`✅ New count: ${current + 1}/${config.maxRequests} (${Math.round(((current + 1) / config.maxRequests) * 100)}% used)`);
      this.logger.log(`✅ Remaining: ${remaining} requests`);
      this.logger.log(`✅ Reset time: ${new Date(resetTime).toISOString()}`);
      
      next();
    } catch (error) {
      this.logger.error(`❌ Rate limit error for key: ${this.generateKey(req, config)} (${route} from ${clientIP})`);
      this.logger.error(`❌ Error details:`, error.stack);
      // If Redis is unavailable, allow the request to proceed
      this.logger.warn(`⚠️ Redis unavailable, allowing request to proceed: ${route} from ${clientIP}`);
      this.logger.warn(`⚠️ This bypasses rate limiting - Redis should be checked!`);
      next();
    }
  }

  private generateKey(req: Request, config: RateLimitConfig): string {
    if (config.keyGenerator) {
      const customKey = config.keyGenerator(req);
      this.logger.log(`🔧 Using custom key generator: ${customKey}`);
      return customKey;
    }

    // Default key generation based on IP and route
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const route = req.route?.path || req.path;
    const defaultKey = `rate_limit:${ip}:${route}`;
    this.logger.log(`🔧 Using default key generator: ${defaultKey}`);
    return defaultKey;
  }

  private async getCurrentRequests(key: string): Promise<number> {
    try {
      this.logger.log(`🔍 Fetching current request count from Redis for key: ${key}`);
      const data = await this.cacheService.getCache(key);
      
      if (!data) {
        this.logger.log(`📊 No data found for ${key}, returning 0`);
        return 0;
      }
      
      const parsed = JSON.parse(data as string);
      const count = parsed.count || 0;
      this.logger.log(`📊 Redis returned count for ${key}: ${count}`);
      return count;
    } catch (error) {
      this.logger.error(`❌ Error getting current requests for key: ${key}`);
      this.logger.error(`❌ Redis error details:`, error.stack);
      return 0;
    }
  }

  private async incrementRequests(key: string, currentCount: number, windowMs: number): Promise<void> {
    try {
      this.logger.log(`📈 Starting increment for key: ${key}`);
      const newCount = currentCount + 1;
      const ttlSeconds = windowMs / 1000;
      
      // Store both count and window start time
      const windowStart = Date.now();
      const data = JSON.stringify({
        count: newCount,
        windowStart: windowStart
      });
      
      this.logger.log(`📈 Setting Redis cache: key=${key}, value=${data}, ttl=${ttlSeconds}s`);
      await this.cacheService.setCache(key, data, ttlSeconds);
      this.logger.log(`✅ Successfully incremented requests for key: ${key} to ${newCount} (TTL: ${ttlSeconds}s)`);
    } catch (error) {
      this.logger.error(`❌ Error incrementing requests for key: ${key}`);
      this.logger.error(`❌ Redis increment error details:`, error.stack);
      // If Redis fails, continue without rate limiting
    }
  }

  private async getRetryAfter(key: string, windowMs: number): Promise<number> {
    try {
      // Get the stored data to find window start time
      const data = await this.cacheService.getCache(key);
      
      if (!data) {
        // No data found, use window time as fallback
        const fallbackSeconds = Math.ceil(windowMs / 1000);
        this.logger.log(`⏰ No data found for ${key}, using fallback: ${fallbackSeconds} seconds`);
        return fallbackSeconds;
      }
      
      const parsed = JSON.parse(data as string);
      const windowStart = parsed.windowStart;
      
      if (!windowStart) {
        // No window start time, use fallback
        const fallbackSeconds = Math.ceil(windowMs / 1000);
        this.logger.log(`⏰ No window start time for ${key}, using fallback: ${fallbackSeconds} seconds`);
        return fallbackSeconds;
      }
      
      // Calculate time remaining in the window
      const now = Date.now();
      const windowEnd = windowStart + windowMs;
      const timeRemaining = Math.max(0, windowEnd - now);
      const secondsRemaining = Math.ceil(timeRemaining / 1000);
      
      this.logger.log(`⏰ Window start: ${new Date(windowStart).toISOString()}`);
      this.logger.log(`⏰ Window end: ${new Date(windowEnd).toISOString()}`);
      this.logger.log(`⏰ Time remaining: ${secondsRemaining} seconds`);
      
      return secondsRemaining;
    } catch (error) {
      this.logger.error(`❌ Error getting retry time for key: ${key}`, error.stack);
      // Fallback: use the window time
      return Math.ceil(windowMs / 1000);
    }
  }

  // Static method for creating rate limit middleware with custom config
  static create(config: Partial<RateLimitConfig> = {}) {
    return (req: Request, res: Response, next: NextFunction) => {
      const middleware = new RateLimitMiddleware(null as any); // We'll inject RedisService properly
      const mergedConfig = { ...middleware.defaultConfig, ...config };
      middleware.logger.log(`🔧 Creating custom rate limit middleware with config:`, mergedConfig);
      middleware.handleRateLimit(req, res, next, mergedConfig);
    };
  }
}

// Specific rate limit configurations
export const authRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 login attempts per 15 minutes
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    return `auth_rate_limit:${ip}`;
  },
};

export const apiRateLimit = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 1000, // 1000 requests per 15 minutes
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const userId = (req.user as any)?.userId || 'anonymous';
    return `api_rate_limit:${ip}:${userId}`;
  },
}; 