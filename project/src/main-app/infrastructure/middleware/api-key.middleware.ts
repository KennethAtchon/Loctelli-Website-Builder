import { Injectable, NestMiddleware, UnauthorizedException, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  private readonly logger = new Logger(ApiKeyMiddleware.name);

  use(req: Request, res: Response, next: NextFunction) {
    const route = `${req.method} ${req.url}`;
    const clientIP = req.ip || req.connection.remoteAddress;
    
    this.logger.debug(`🔑 API key validation for route: ${route} from IP: ${clientIP}`);
    
    const apiKey = req.headers['x-api-key'] || req.query.api_key;
    const validApiKey = process.env.API_KEY;

    if (!apiKey) {
      this.logger.warn(`❌ API key missing for route: ${route} from IP: ${clientIP}`);
      throw new UnauthorizedException('API key is missing');
    }

    if (apiKey !== validApiKey) {
      this.logger.warn(`❌ Invalid API key for route: ${route} from IP: ${clientIP}`);
      throw new UnauthorizedException('Invalid API key');
    }

    this.logger.debug(`✅ API key validation successful for route: ${route} from IP: ${clientIP}`);
    next();
  }
}
