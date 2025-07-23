import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { CacheService } from '../main-app/infrastructure/cache/cache.service';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('🚀 Starting Loctelli Backend Application...');
  logger.log(`📅 Startup time: ${new Date().toISOString()}`);
  
  try {
    logger.log('🔧 Creating NestJS application...');
    const app = await NestFactory.create(AppModule);
    
    // Configure body parser limits for file uploads
    app.use(json({ limit: '50mb' }));
    app.use(urlencoded({ extended: true, limit: '50mb' }));
    
    logger.log('📦 Body parser configured with 50MB limit for file uploads');
    
    // Test Redis connection
    try {
      const cacheService = app.get(CacheService);
      logger.log('🔍 Testing Redis connection...');
      const redisConnected = await cacheService.testConnection();
      if (redisConnected) {
        logger.log('✅ Redis connection test successful');
      } else {
        logger.error('❌ Redis connection test failed');
      }
    } catch (error) {
      logger.error('❌ Failed to test Redis connection:', error);
    }
    
    logger.log('🌐 Configuring CORS...');
    // Enable CORS
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://loctelli_frontend:3000',
        'http://frontend:3000',
        'http://loctelli.com',
        process.env.FRONTEND_URL,
      ].filter(Boolean),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-API-Key',
        'x-api-key',
        'X-User-Token',
        'x-user-token'
      ],
    });
    
    const port = process.env.PORT ?? 3000;
    logger.log(`🔌 Starting server on port: ${port}`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`🔑 API Key configured: ${process.env.API_KEY ? 'Yes' : 'No'}`);
    logger.log(`🗄️ Database URL configured: ${process.env.DATABASE_URL ? 'Yes' : 'No'}`);
    logger.log(`🔴 Redis URL configured: ${process.env.REDIS_URL ? 'Yes' : 'No'}`);
    
    await app.listen(port);
    
    logger.log(`✅ Loctelli Backend Application started successfully on port ${port}`);
    logger.log(`📊 Health check available at: http://localhost:${port}/status`);
    logger.log(`🔗 API documentation available at: http://localhost:${port}/api`);
    
  } catch (error) {
    logger.error('❌ Failed to start Loctelli Backend Application', error.stack);
    process.exit(1);
  }
}

bootstrap();
