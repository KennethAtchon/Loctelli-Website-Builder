import { Injectable, NestMiddleware, BadRequestException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class InputValidationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    // Sanitize request body
    if (req.body) {
      req.body = this.sanitizeObject(req.body);
    }

    // Validate query parameters (without modifying them)
    this.validateQueryParams(req);

    // Validate URL parameters (without modifying them)
    this.validateUrlParams(req);

    // Validate request size
    this.validateRequestSize(req);

    // Validate content type for POST/PUT/PATCH requests
    this.validateContentType(req);

    next();
  }

  private sanitizeObject(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
      return this.sanitizeValue(obj);
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeObject(item));
    }

    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = this.sanitizeObject(value);
    }

    return sanitized;
  }

  private sanitizeValue(value: any): any {
    if (typeof value !== 'string') {
      return value;
    }

    // Remove null bytes
    value = value.replace(/\0/g, '');

    // Remove control characters except newlines and tabs
    value = value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Basic XSS protection - remove script tags and dangerous attributes
    value = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    value = value.replace(/javascript:/gi, '');
    value = value.replace(/on\w+\s*=/gi, '');
    value = value.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
    value = value.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '');
    value = value.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');

    // Trim whitespace
    value = value.trim();

    return value;
  }

  private validateRequestSize(req: Request): void {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxSize) {
      throw new BadRequestException('Request body too large');
    }
  }

  private validateContentType(req: Request): void {
    const method = req.method.toUpperCase();
    const contentType = req.headers['content-type'];

    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (!contentType) {
        throw new BadRequestException('Content-Type header is required');
      }

      // Allow JSON and form data
      const allowedTypes = [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data'
      ];

      const isValidType = allowedTypes.some(type => 
        contentType.toLowerCase().startsWith(type)
      );

      if (!isValidType) {
        throw new BadRequestException('Invalid Content-Type');
      }
    }
  }

  private validateQueryParams(req: Request): void {
    if (req.query && Object.keys(req.query).length > 0) {
      // Check for potentially dangerous query parameters
      const dangerousParams = ['script', 'javascript', 'onload', 'onerror'];
      for (const key of Object.keys(req.query)) {
        if (dangerousParams.some(dangerous => key.toLowerCase().includes(dangerous))) {
          throw new BadRequestException('Potentially dangerous query parameter detected');
        }
      }
    }
  }

  private validateUrlParams(req: Request): void {
    if (req.params && Object.keys(req.params).length > 0) {
      // Check for potentially dangerous URL parameters
      const dangerousParams = ['script', 'javascript', 'onload', 'onerror'];
      for (const key of Object.keys(req.params)) {
        if (dangerousParams.some(dangerous => key.toLowerCase().includes(dangerous))) {
          throw new BadRequestException('Potentially dangerous URL parameter detected');
        }
      }
    }
  }

  // Static validation methods for specific fields
  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePhone(phone: string): boolean {
    // Basic phone validation - can be customized based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  }

  static validatePassword(password: string): boolean {
    // Minimum 8 characters, at least one uppercase, one lowercase, one number, one special character
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
    return passwordRegex.test(password);
  }

  static validateUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeHtml(html: string): string {
    // Basic HTML sanitization - in production, use a library like DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '');
  }
} 