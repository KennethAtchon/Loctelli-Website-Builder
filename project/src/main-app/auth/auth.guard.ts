import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.url}`;
    
    this.logger.debug(`🔒 Auth guard checking route: ${route}`);
    
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (isPublic) {
      this.logger.debug(`✅ Public route allowed: ${route}`);
      return true;
    }
    
    this.logger.debug(`🔐 Protected route, checking JWT: ${route}`);
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const route = `${request.method} ${request.url}`;
    
    if (err) {
      this.logger.warn(`❌ JWT authentication error for route: ${route}`, err.stack);
      throw new UnauthorizedException('Authentication required');
    }
    
    if (!user) {
      this.logger.warn(`❌ No user found in JWT for route: ${route}`);
      throw new UnauthorizedException('Authentication required');
    }
    
    this.logger.debug(`✅ JWT authentication successful for user: ${user.email} (ID: ${user.userId}) on route: ${route}`);
    return user;
  }
} 