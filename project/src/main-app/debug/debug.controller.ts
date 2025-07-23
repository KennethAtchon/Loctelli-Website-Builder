import { Controller, Get, Post, Delete, Param, Body, Query, Logger } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { CacheService } from '../infrastructure/cache/cache.service';

interface TTLTestResult {
  key: string;
  value: any;
  ttl: number;
  exists: boolean;
  timestamp: string;
  operation: string;
  success?: boolean;
}

interface TTLTestRequest {
  key: string;
  value: any;
  ttl?: number;
}

interface MonitoringResult {
  second: number;
  timestamp: string;
  exists: boolean;
  ttl: number;
  value: any;
}

@Controller('debug/redis')
@Public()
export class DebugController {
  private readonly logger = new Logger(DebugController.name);

  constructor(private readonly cacheService: CacheService) {}

  @Get('test-connection')
  async testConnection() {
    this.logger.log('🔍 Testing Redis connection...');
    const result = await this.cacheService.testConnection();
    return {
      success: result,
      timestamp: new Date().toISOString(),
      message: result ? 'Redis connection successful' : 'Redis connection failed'
    };
  }

  @Post('set-with-ttl')
  async setWithTTL(@Body() request: TTLTestRequest): Promise<TTLTestResult> {
    const { key, value, ttl } = request;
    this.logger.log(`🔧 Setting key: ${key} with TTL: ${ttl}s`);
    
    await this.cacheService.setCache(key, value, ttl);
    
    const exists = await this.cacheService.exists(key);
    const ttlValue = await this.cacheService.ttl(key);
    
    return {
      key,
      value,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'SET_WITH_TTL'
    };
  }

  @Post('set-without-ttl')
  async setWithoutTTL(@Body() request: TTLTestRequest): Promise<TTLTestResult> {
    const { key, value } = request;
    this.logger.log(`🔧 Setting key: ${key} without TTL`);
    
    await this.cacheService.setCache(key, value);
    
    const exists = await this.cacheService.exists(key);
    const ttlValue = await this.cacheService.ttl(key);
    
    return {
      key,
      value,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'SET_WITHOUT_TTL'
    };
  }

  @Get('get/:key')
  async getKey(@Param('key') key: string): Promise<TTLTestResult> {
    this.logger.log(`🔍 Getting key: ${key}`);
    
    const value = await this.cacheService.getCache(key);
    const exists = await this.cacheService.exists(key);
    const ttlValue = await this.cacheService.ttl(key);
    
    return {
      key,
      value,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'GET'
    };
  }

  @Post('expire/:key/:ttl')
  async expireKey(@Param('key') key: string, @Param('ttl') ttl: string): Promise<TTLTestResult> {
    const ttlSeconds = parseInt(ttl);
    this.logger.log(`⏰ Setting TTL for key: ${key} to ${ttlSeconds}s`);
    
    const success = await this.cacheService.expire(key, ttlSeconds);
    const value = await this.cacheService.getCache(key);
    const exists = await this.cacheService.exists(key);
    const ttlValue = await this.cacheService.ttl(key);
    
    return {
      key,
      value,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'EXPIRE',
      success
    };
  }

  @Delete('delete/:key')
  async deleteKey(@Param('key') key: string): Promise<TTLTestResult> {
    this.logger.log(`🗑️ Deleting key: ${key}`);
    
    await this.cacheService.delCache(key);
    
    const exists = await this.cacheService.exists(key);
    const ttlValue = await this.cacheService.ttl(key);
    
    return {
      key,
      value: null,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'DELETE'
    };
  }

  @Get('exists/:key')
  async checkExists(@Param('key') key: string): Promise<TTLTestResult> {
    this.logger.log(`🔍 Checking if key exists: ${key}`);
    
    const exists = await this.cacheService.exists(key);
    const value = await this.cacheService.getCache(key);
    const ttlValue = await this.cacheService.ttl(key);
    
    return {
      key,
      value,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'EXISTS'
    };
  }

  @Get('ttl/:key')
  async getTTL(@Param('key') key: string): Promise<TTLTestResult> {
    this.logger.log(`⏰ Getting TTL for key: ${key}`);
    
    const ttlValue = await this.cacheService.ttl(key);
    const value = await this.cacheService.getCache(key);
    const exists = await this.cacheService.exists(key);
    
    return {
      key,
      value,
      ttl: ttlValue,
      exists,
      timestamp: new Date().toISOString(),
      operation: 'TTL'
    };
  }

  @Post('test-ttl-scenarios')
  async testTTLScenarios() {
    this.logger.log('🧪 Running comprehensive TTL test scenarios');
    
    const results: TTLTestResult[] = [];
    const testKey = `ttl_test_${Date.now()}`;
    
    // Scenario 1: Set with 5 second TTL
    results.push(await this.setWithTTL({
      key: `${testKey}_5s`,
      value: { message: 'This will expire in 5 seconds', timestamp: new Date().toISOString() },
      ttl: 5
    }));
    
    // Scenario 2: Set with 30 second TTL
    results.push(await this.setWithTTL({
      key: `${testKey}_30s`,
      value: { message: 'This will expire in 30 seconds', timestamp: new Date().toISOString() },
      ttl: 30
    }));
    
    // Scenario 3: Set without TTL
    results.push(await this.setWithoutTTL({
      key: `${testKey}_no_ttl`,
      value: { message: 'This has no TTL', timestamp: new Date().toISOString() }
    }));
    
    // Scenario 4: Set with 1 second TTL (for quick testing)
    results.push(await this.setWithTTL({
      key: `${testKey}_1s`,
      value: { message: 'This will expire in 1 second', timestamp: new Date().toISOString() },
      ttl: 1
    }));
    
    return {
      message: 'TTL test scenarios completed',
      timestamp: new Date().toISOString(),
      results,
      instructions: [
        'Check the 1s key immediately - it should exist',
        'Wait 2 seconds and check the 1s key again - it should not exist',
        'Check the 5s key - it should exist for 5 seconds',
        'Check the 30s key - it should exist for 30 seconds',
        'Check the no_ttl key - it should exist indefinitely'
      ]
    };
  }

  @Get('monitor-ttl/:key')
  async monitorTTL(@Param('key') key: string, @Query('duration') duration: string = '60') {
    const durationSeconds = parseInt(duration);
    this.logger.log(`📊 Monitoring TTL for key: ${key} for ${durationSeconds} seconds`);
    
    const monitoringResults: MonitoringResult[] = [];
    const startTime = Date.now();
    
    for (let i = 0; i < durationSeconds; i++) {
      const exists = await this.cacheService.exists(key);
      const ttlValue = await this.cacheService.ttl(key);
      const value = await this.cacheService.getCache(key);
      
      monitoringResults.push({
        second: i,
        timestamp: new Date().toISOString(),
        exists,
        ttl: ttlValue,
        value: exists ? value : null
      });
      
      // Wait 1 second before next check
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    return {
      key,
      monitoringDuration: durationSeconds,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      results: monitoringResults,
      summary: {
        totalChecks: monitoringResults.length,
        timesFound: monitoringResults.filter(r => r.exists).length,
        timesNotFound: monitoringResults.filter(r => !r.exists).length,
        finalStatus: monitoringResults[monitoringResults.length - 1]
      }
    };
  }
} 