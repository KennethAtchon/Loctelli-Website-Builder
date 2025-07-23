// Cookie utility for authentication tokens
// Uses secure, httpOnly cookies for better security

interface CookieOptions {
  expires?: Date;
  maxAge?: number;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

const DEFAULT_COOKIE_OPTIONS: CookieOptions = {
  path: '/',
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax', // Changed from 'strict' to 'lax' to allow cross-port sharing
  domain: typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'localhost' : undefined,
  maxAge: 7 * 24 * 60 * 60, // 7 days
};

export class CookieManager {
  // Set a cookie with proper security options
  static setCookie(name: string, value: string, options: CookieOptions = {}): void {
    const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options };
    
    let cookieString = `${name}=${encodeURIComponent(value)}`;
    
    if (opts.expires) {
      cookieString += `; expires=${opts.expires.toUTCString()}`;
    }
    
    if (opts.maxAge) {
      cookieString += `; max-age=${opts.maxAge}`;
    }
    
    if (opts.path) {
      cookieString += `; path=${opts.path}`;
    }
    
    if (opts.domain) {
      cookieString += `; domain=${opts.domain}`;
    }
    
    if (opts.secure) {
      cookieString += '; secure';
    }
    
    if (opts.httpOnly) {
      cookieString += '; httpOnly';
    }
    
    if (opts.sameSite) {
      cookieString += `; samesite=${opts.sameSite}`;
    }
    
    document.cookie = cookieString;
  }

  // Get a cookie value
  static getCookie(name: string): string | null {
    const cookies = document.cookie.split(';');
    
    for (const cookie of cookies) {
      const [cookieName, cookieValue] = cookie.trim().split('=');
      if (cookieName === name) {
        return decodeURIComponent(cookieValue);
      }
    }
    
    return null;
  }

  // Delete a cookie
  static deleteCookie(name: string, options: CookieOptions = {}): void {
    const opts = { ...DEFAULT_COOKIE_OPTIONS, ...options };
    opts.maxAge = -1; // Set to past date to delete
    this.setCookie(name, '', opts);
  }

  // Check if a cookie exists
  static hasCookie(name: string): boolean {
    return this.getCookie(name) !== null;
  }

  // Clear all authentication cookies
  static clearAuthCookies(): void {
    this.deleteCookie('access_token');
    this.deleteCookie('refresh_token');
    this.deleteCookie('admin_access_token');
    this.deleteCookie('admin_refresh_token');
  }
}

// Authentication-specific cookie helpers
export const AuthCookies = {
  // Regular user tokens
  setAccessToken: (token: string) => {
    CookieManager.setCookie('access_token', token, {
      maxAge: 60 * 60, // 1 hour
    });
  },
  
  setRefreshToken: (token: string) => {
    CookieManager.setCookie('refresh_token', token, {
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  },
  
  getAccessToken: () => CookieManager.getCookie('access_token'),
  getRefreshToken: () => CookieManager.getCookie('refresh_token'),
  
  // Admin tokens
  setAdminAccessToken: (token: string) => {
    CookieManager.setCookie('admin_access_token', token, {
      maxAge: 60 * 60, // 1 hour
    });
  },
  
  setAdminRefreshToken: (token: string) => {
    CookieManager.setCookie('admin_refresh_token', token, {
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });
  },
  
  getAdminAccessToken: () => CookieManager.getCookie('admin_access_token'),
  getAdminRefreshToken: () => CookieManager.getCookie('admin_refresh_token'),
  
  // Clear all auth tokens
  clearAll: () => CookieManager.clearAuthCookies(),
  
  // Clear only admin tokens
  clearAdminTokens: () => {
    CookieManager.deleteCookie('admin_access_token');
    CookieManager.deleteCookie('admin_refresh_token');
  },
  
  // Clear only user tokens
  clearUserTokens: () => {
    CookieManager.deleteCookie('access_token');
    CookieManager.deleteCookie('refresh_token');
  },
  
  // Check if user is logged in
  hasUserTokens: () => {
    return CookieManager.hasCookie('access_token') || CookieManager.hasCookie('refresh_token');
  },
  
  // Check if admin is logged in
  hasAdminTokens: () => {
    return CookieManager.hasCookie('admin_access_token') || CookieManager.hasCookie('admin_refresh_token');
  },
}; 