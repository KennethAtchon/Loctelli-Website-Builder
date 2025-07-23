import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_KEY } from '../decorators/admin.decorator';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const adminConfig = this.reflector.getAllAndOverride<boolean | string[]>(ADMIN_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    
    if (!adminConfig) {
      return true;
    }
    
    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }
    
    // Check if user is an admin user (type === 'admin')
    if (user.type !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
    
    // If specific roles are required, check them
    if (Array.isArray(adminConfig) && adminConfig.length > 0) {
      if (!adminConfig.includes(user.role)) {
        throw new ForbiddenException('Insufficient admin privileges');
      }
    } else {
      // Default admin role check (admin or super_admin)
      if (user.role && !['admin', 'super_admin'].includes(user.role)) {
        throw new ForbiddenException('Insufficient admin privileges');
      }
    }
    
    return true;
  }
} 