# Permission System Documentation

## Overview

This project uses a dual-user system with separate authentication flows and permission mechanisms:

### User Types

1. **Regular Users** (`User` table)
   - Roles: `user`, `admin`, `manager`
   - JWT payload: `type: 'user'`
   - Authentication: `AuthService`

2. **Admin Users** (`AdminUser` table)
   - Roles: `admin`, `super_admin`
   - JWT payload: `type: 'admin'`
   - Authentication: `AdminAuthService`

## Guards and Decorators

### JwtAuthGuard (Global)
**Purpose**: Global authentication guard applied to all endpoints by default.

**Configuration**: Applied globally in `app.module.ts` via `APP_GUARD`

**Bypass**: Use `@Public()` decorator to make endpoints accessible without authentication

### AdminGuard
**Purpose**: Ensures only admin users (from AdminUser table) can access endpoints.

**Usage**:
```typescript
// Basic admin access (any admin role)
@Admin()
@UseGuards(AdminGuard)

// Specific admin roles only
@Admin(['super_admin'])
@UseGuards(AdminGuard)
```

**When to use**:
- Endpoints that should only be accessible by admin users
- Administrative functions (user management, system settings)
- Cross-user data access

### RolesGuard
**Purpose**: Handles role-based permissions within each user type.

**Usage**:
```typescript
@Roles('admin', 'super_admin')
@UseGuards(JwtAuthGuard, RolesGuard)
```

**When to use**:
- Role-specific permissions within admin functions
- Different permission levels for the same user type

### Manual Permission Checks
**Purpose**: Fine-grained control for complex permission logic.

**Usage**:
```typescript
if (user.role !== 'admin' && user.role !== 'super_admin' && user.userId !== id) {
  throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
}
```

**When to use**:
- Complex business logic requiring multiple conditions
- Resource ownership checks
- Dynamic permission requirements

## Current Controller Permission Patterns

### Admin-Only Controllers (AdminGuard)
- `strategies.controller.ts` - All endpoints require admin access
- `leads.controller.ts` - All endpoints require admin access
- `bookings.controller.ts` - All endpoints require admin access

### Role-Based Controllers (RolesGuard)
- `prompt-templates.controller.ts` - Requires `admin` or `super_admin` roles
- `admin-auth.controller.ts` - Various endpoints with different role requirements
- `users.controller.ts` - Mixed: some endpoints use RolesGuard, others use manual checks
- `general.controller.ts` - Admin-only endpoints with RolesGuard

### Mixed Permission Controllers
- `chat.controller.ts` - Manual permission checks for lead ownership + some public endpoints

### Public Controllers
- `status.controller.ts` - All endpoints are public (health checks)
- `webhooks.controller.ts` - All endpoints are public (webhook endpoints)
- `highlevel-webhooks.controller.ts` - All endpoints are public (webhook endpoints)

## Best Practices

1. **Always use guards** - Don't rely solely on manual checks
2. **Use AdminGuard for admin-only endpoints** - Ensures only admin users can access
3. **Use RolesGuard for role-specific permissions** - Within admin functions
4. **Use manual checks for complex logic** - Resource ownership, dynamic permissions
5. **Be consistent** - Use the same pattern across similar endpoints
6. **Document permissions** - Add comments explaining permission requirements
7. **Use @Public() for webhooks and health checks** - These need to be accessible without auth

## Security Considerations

1. **Always validate user type** - AdminGuard ensures only admin users access admin endpoints
2. **Check resource ownership** - Manual checks for user-specific resources
3. **Use appropriate error messages** - Don't leak sensitive information
4. **Log permission failures** - For security monitoring
5. **Test permission boundaries** - Ensure guards work as expected
6. **Global JwtAuthGuard** - All endpoints are protected by default unless marked @Public()

## Migration Guide

### Converting from manual checks to guards
If you have consistent permission patterns:

```typescript
// Before (manual checks)
if (user.role !== 'admin' && user.role !== 'super_admin') {
  throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
}

// After (guard)
@Roles('admin', 'super_admin')
@UseGuards(JwtAuthGuard, RolesGuard)
```

### Making endpoints public
For webhooks, health checks, or other public endpoints:

```typescript
@Public()
@Get('health')
getHealthCheck() {
  return { status: 'ok' };
}
```

## Current Status (After Fixes)

✅ **Fixed Issues:**
- Added JwtAuthGuard to all controllers that were missing authentication
- Added RolesGuard to admin-only endpoints in general.controller.ts
- Added @Public() decorator to webhook controllers
- Standardized permission patterns across controllers
- Removed redundant manual checks where guards are sufficient

✅ **Properly Configured:**
- Global JwtAuthGuard applied to all endpoints by default
- AdminGuard for admin-only functionality
- RolesGuard for role-based permissions
- @Public() decorator for webhooks and health checks
- Manual checks only where complex business logic is needed 