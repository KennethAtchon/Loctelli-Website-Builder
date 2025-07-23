import logger from '@/lib/logger';

// Simple rate limit blocker
export class RateLimitBlocker {
  private blockedEndpoints = new Map<string, number>(); // endpoint -> retry timestamp

  isBlocked(endpoint: string): boolean {
    const retryTime = this.blockedEndpoints.get(endpoint);
    if (!retryTime) return false;
    
    const now = Date.now();
    if (now < retryTime) {
      return true; // Still blocked
    } else {
      this.blockedEndpoints.delete(endpoint); // No longer blocked
      return false;
    }
  }

  blockEndpoint(endpoint: string, retryAfterSeconds: number): void {
    const retryTime = Date.now() + (retryAfterSeconds * 1000);
    this.blockedEndpoints.set(endpoint, retryTime);
    logger.debug(`🚫 Blocked endpoint ${endpoint} until ${new Date(retryTime).toISOString()}`);
  }

  getRetryTime(endpoint: string): number | null {
    const retryTime = this.blockedEndpoints.get(endpoint);
    if (!retryTime) return null;
    
    const now = Date.now();
    if (now < retryTime) {
      return Math.ceil((retryTime - now) / 1000);
    } else {
      this.blockedEndpoints.delete(endpoint);
      return null;
    }
  }

  cleanup(): void {
    const now = Date.now();
    for (const [endpoint, retryTime] of this.blockedEndpoints.entries()) {
      if (now >= retryTime) {
        this.blockedEndpoints.delete(endpoint);
        logger.debug(`🧹 Cleaned up expired block for ${endpoint}`);
      }
    }
  }
} 