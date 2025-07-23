import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService, JwtPayload } from './auth.service';
import { AdminAuthService, AdminJwtPayload } from './admin-auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
    private adminAuthService: AdminAuthService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request) => {
          // Check for x-user-token header
          const userToken = request?.headers?.['x-user-token'] || request?.headers?.['X-User-Token'];
          if (userToken) {
            this.logger.debug(`Extracted token from x-user-token header: ${userToken.substring(0, 20)}...`);
          }
          return userToken;
        }
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
    
    this.logger.log('JWT Strategy initialized');
  }

  async validate(payload: JwtPayload | AdminJwtPayload) {
    this.logger.debug(`Validating JWT payload: ${JSON.stringify({ sub: payload.sub, email: payload.email, role: payload.role })}`);
    
    try {
      // Check if this is an admin user
      if ('type' in payload && payload.type === 'admin') {
        this.logger.debug(`Admin user validation for ID: ${payload.sub}, email: ${payload.email}`);
        return {
          userId: payload.sub,
          email: payload.email,
          role: payload.role,
          type: 'admin',
        };
      }
      
      // Regular user
      this.logger.debug(`Regular user validation for ID: ${payload.sub}, email: ${payload.email}`);
      return {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        type: 'user',
      };
    } catch (error) {
      this.logger.error(`JWT validation failed for payload: ${JSON.stringify(payload)}`, error.stack);
      throw error;
    }
  }
} 