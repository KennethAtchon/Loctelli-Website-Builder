import {
  Module,
  NestModule,
  MiddlewareConsumer,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';

// Shared infrastructure
import { SharedModule } from '../shared/shared.module';
import { ConfigService } from '@nestjs/config';

// Main app modules
import { MainAppModule } from '../main-app/main-app.module';

// Website builder modules
import { WebsiteBuilderModule } from '../website-builder/website-builder.module';

// Guards and middleware
import { JwtAuthGuard } from '../main-app/auth/auth.guard';
import { ApiKeyMiddleware } from '../shared/middleware/api-key.middleware';
import { SecurityHeadersMiddleware } from '../shared/middleware/security-headers.middleware';
import { RateLimitMiddleware } from '../shared/middleware/rate-limit.middleware';
import { InputValidationMiddleware } from '../shared/middleware/input-validation.middleware';

@Module({
  imports: [
    // Shared infrastructure
    SharedModule,
    
    // Main app modules
    MainAppModule,
    
    // Website builder modules
    WebsiteBuilderModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ConfigService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [ConfigService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply security headers to all routes
    consumer
      .apply(SecurityHeadersMiddleware)
      .forRoutes('*');

    // Apply input validation to all routes except website-builder upload
    consumer
      .apply(InputValidationMiddleware)
      .exclude(
        { path: 'website-builder/upload', method: RequestMethod.POST },
      )
      .forRoutes('*');

    // Apply rate limiting to auth endpoints
    consumer
      .apply(RateLimitMiddleware)
      .forRoutes(
        { path: 'auth/login', method: RequestMethod.POST },
        { path: 'auth/register', method: RequestMethod.POST },
        { path: 'admin/auth/login', method: RequestMethod.POST },
        { path: 'admin/auth/register', method: RequestMethod.POST },
      );

    // Apply API key middleware to all routes except status/health, auth, and debug
    consumer
      .apply(ApiKeyMiddleware)
      .exclude(
        { path: 'status/health', method: RequestMethod.GET },
        { path: 'debug/redis/*', method: RequestMethod.GET },
        { path: 'debug/redis/*', method: RequestMethod.POST },
        { path: 'debug/redis/*', method: RequestMethod.DELETE },
      )
      .forRoutes('*');
  }
}
