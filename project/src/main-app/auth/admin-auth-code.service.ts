import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class AdminAuthCodeService {
  constructor(private configService: ConfigService) {}

  /**
   * Generate a secure admin authorization code
   * @param length Length of the auth code (default: 16)
   * @returns A secure random string
   */
  generateAuthCode(length: number = 16): string {
    return crypto.randomBytes(length).toString('hex').toUpperCase();
  }

  /**
   * Generate a time-based admin authorization code that expires
   * @param expiryMinutes Minutes until the code expires (default: 60)
   * @returns Object containing the code and expiry time
   */
  generateTimeBasedAuthCode(expiryMinutes: number = 60): {
    code: string;
    expiresAt: Date;
  } {
    const code = this.generateAuthCode(12);
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);
    
    return { code, expiresAt };
  }

  /**
   * Validate an admin authorization code
   * @param providedCode The code provided by the user
   * @returns True if valid, false otherwise
   */
  validateAuthCode(providedCode: string): boolean {
    const validAuthCode = this.configService.get<string>('ADMIN_AUTH_CODE') || 'ADMIN_2024_SECURE';
    return providedCode === validAuthCode;
  }

  /**
   * Get the current admin auth code from environment
   * @returns The current admin auth code
   */
  getCurrentAuthCode(): string {
    return this.configService.get<string>('ADMIN_AUTH_CODE') || 'ADMIN_2024_SECURE';
  }

  /**
   * Create a secure admin auth code with timestamp
   * @returns A secure code with timestamp for one-time use
   */
  createSecureAuthCode(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateAuthCode(8);
    return `ADMIN_${timestamp}_${randomPart}`;
  }
} 