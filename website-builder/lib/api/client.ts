import { ApiRequestOptions } from './types';
import { API_CONFIG } from '../utils/envUtils';
import { AuthCookies } from '../cookies';
import logger from '@/lib/logger';
import { toast } from 'sonner';
import { RateLimitBlocker } from '../utils/rate-limit-blocker';

const API_BASE_URL = API_CONFIG.BASE_URL;

export class ApiClient {
  private baseUrl: string;
  private defaultOptions: ApiRequestOptions = {
    timeout: 10000,
    retries: 3,
  };
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;
  private isRefreshRequest = false; // Flag to prevent recursive refresh attempts
  private rateLimitBlocker = new RateLimitBlocker();

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    
    // Clean up expired blocks every minute
    setInterval(() => {
      this.rateLimitBlocker.cleanup();
    }, 60000);
  }

  // Check if an endpoint is an authentication endpoint that should not be retried
  private isAuthEndpoint(endpoint: string): boolean {
    const authEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/refresh',
      '/auth/logout',
      '/admin/auth/login',
      '/admin/auth/register',
      '/admin/auth/refresh',
      '/admin/auth/logout'
    ];
    return authEndpoints.includes(endpoint);
  }

  // Get authentication headers based on available tokens
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    
    // Note: API key is now handled server-side by the proxy
    // No need to include it in frontend requests
    
    // Debug: Check all tokens
    const adminAccessToken = AuthCookies.getAdminAccessToken();
    const adminRefreshToken = AuthCookies.getAdminRefreshToken();
    const userAccessToken = AuthCookies.getAccessToken();
    const userRefreshToken = AuthCookies.getRefreshToken();
    
    logger.debug('🔍 Token Debug:', {
      adminAccess: !!adminAccessToken,
      adminRefresh: !!adminRefreshToken,
      userAccess: !!userAccessToken,
      userRefresh: !!userRefreshToken,
      adminAccessLength: adminAccessToken?.length || 0,
      adminRefreshLength: adminRefreshToken?.length || 0,
    });
    
    // Check for admin tokens first (admin takes precedence)
    if (adminAccessToken) {
      headers['x-user-token'] = adminAccessToken;
      logger.debug('🔑 Admin access token found and added to headers');
      return headers;
    }
    
    // Check for regular user tokens
    if (userAccessToken) {
      headers['x-user-token'] = userAccessToken;
      logger.debug('🔑 User access token found and added to headers');
    } else {
      logger.debug('ℹ️ No access tokens found');
    }
    
    return headers;
  }

  // Refresh tokens automatically
  private async refreshTokens(): Promise<void> {
    if (this.isRefreshing && this.refreshPromise) {
      // If already refreshing, wait for the existing promise
      await this.refreshPromise;
      return;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();
    
    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<void> {
    try {
      // Try admin refresh first
      const adminRefreshToken = AuthCookies.getAdminRefreshToken();
      if (adminRefreshToken) {
        try {
          logger.debug('🔄 Attempting admin token refresh...');
          // Use direct fetch to avoid infinite loop
          this.isRefreshRequest = true;
          const response = await fetch(`${this.baseUrl}/admin/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: adminRefreshToken }),
          });
          this.isRefreshRequest = false;

          if (!response.ok) {
            const errorText = await response.text();
            logger.debug(`❌ Admin refresh failed with status ${response.status}:`, errorText);
            throw new Error(`Refresh failed: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          logger.debug('✅ Admin token refresh successful, updating cookies...');
          AuthCookies.setAdminAccessToken(data.access_token);
          AuthCookies.setAdminRefreshToken(data.refresh_token);
          logger.debug('✅ Admin tokens updated successfully');
          return;
        } catch (error) {
          logger.debug('❌ Admin token refresh failed:', error);
          // Clear only admin tokens on failure
          AuthCookies.clearAdminTokens();
          throw error;
        }
      }

      // Try regular user refresh
      const refreshToken = AuthCookies.getRefreshToken();
      if (refreshToken) {
        try {
          logger.debug('🔄 Attempting user token refresh...');
          // Use direct fetch to avoid infinite loop
          this.isRefreshRequest = true;
          const response = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ refresh_token: refreshToken }),
          });
          this.isRefreshRequest = false;

          if (!response.ok) {
            const errorText = await response.text();
            logger.debug(`❌ User refresh failed with status ${response.status}:`, errorText);
            throw new Error(`Refresh failed: ${response.status} - ${errorText}`);
          }

          const data = await response.json();
          logger.debug('✅ User token refresh successful, updating cookies...');
          AuthCookies.setAccessToken(data.access_token);
          AuthCookies.setRefreshToken(data.refresh_token);
          logger.debug('✅ User tokens updated successfully');
          return;
        } catch (error) {
          logger.debug('❌ User token refresh failed:', error);
          // Clear only user tokens on failure
          AuthCookies.clearUserTokens();
          throw error;
        }
      }

      // This is expected for initial login attempts - don't treat as error
      logger.debug('⚠️ No refresh tokens available for refresh');
      throw new Error('No refresh tokens available');
    } catch (error) {
      // Only log as error if it's not the expected "no refresh tokens" case
      if (error instanceof Error && error.message === 'No refresh tokens available') {
        logger.debug('❌ Token refresh failed completely:', error.message);
      } else {
        logger.error('❌ Token refresh failed completely:', error);
      }
      throw error;
    }
  }

  protected async request<T = unknown>(
    endpoint: string,
    options: RequestInit & ApiRequestOptions = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const isAuthEndpoint = this.isAuthEndpoint(endpoint);
    
    logger.debug('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      endpoint,
      isAuthEndpoint
    });

    // Check if endpoint is currently rate limited
    if (this.rateLimitBlocker.isBlocked(endpoint)) {
      const retryAfter = this.rateLimitBlocker.getRetryTime(endpoint);
      if (retryAfter) {
        const formatTime = (seconds: number) => {
          if (seconds < 60) return `${seconds} seconds`;
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          if (remainingSeconds === 0) return `${minutes} minutes`;
          return `${minutes} minutes and ${remainingSeconds} seconds`;
        };
        
        const waitTime = formatTime(retryAfter);
        logger.warn(`🚫 Blocked request to ${endpoint} - rate limited. Wait ${waitTime}`);
        this.showRateLimitToast(waitTime);
        throw new Error(`Rate limit exceeded. Please wait ${waitTime} before trying again.`);
      }
    }
    
    // Add auth headers
    const authHeaders = this.getAuthHeaders();
    logger.debug('🔑 Auth headers:', authHeaders);
    
    // Determine if we should set Content-Type header
    const isFormData = options.body instanceof FormData;
    const defaultHeaders: Record<string, string> = {};
    
    // Only set Content-Type for non-FormData requests
    if (!isFormData) {
      defaultHeaders['Content-Type'] = 'application/json';
    }
    
    const config: RequestInit = {
      headers: {
        ...defaultHeaders,
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || this.defaultOptions.timeout);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      logger.debug('📡 Response status:', response.status, response.statusText);
      
      // Handle 401 Unauthorized - but NOT for auth endpoints or refresh requests
      if (response.status === 401 && !this.isRefreshRequest && !isAuthEndpoint) {
        logger.debug('🔒 401 Unauthorized, attempting token refresh...');
        try {
          await this.refreshTokens();
          
          // Retry the request with new tokens
          const newAuthHeaders = this.getAuthHeaders();
          logger.debug('🔄 Retrying with new auth headers:', newAuthHeaders);
          const retryConfig: RequestInit = {
            ...config,
            headers: {
              ...config.headers,
              ...newAuthHeaders,
            },
          };
          
          const retryResponse = await fetch(url, {
            ...retryConfig,
            signal: controller.signal,
          });
          
          logger.debug('🔄 Retry response status:', retryResponse.status, retryResponse.statusText);
          
          if (!retryResponse.ok) {
            // If retry fails after refresh, redirect to login page
            logger.debug('❌ Retry failed after token refresh, redirecting to login...');
            
            // Clear all tokens since refresh failed
            AuthCookies.clearAll();
            
            // Redirect to appropriate login page based on current path
            const currentPath = window.location.pathname;
            if (currentPath.startsWith('/admin')) {
              window.location.href = '/admin/login';
            } else {
              window.location.href = '/auth/login';
            }
            
            // Throw error to stop execution
            throw new Error('Authentication failed. Redirecting to login page.');
          }
          
          return await retryResponse.json();
        } catch (refreshError) {
          logger.debug('❌ Token refresh failed:', refreshError);
          // Don't automatically redirect - let the components handle this
          // This prevents page refreshes that lose error state
          throw new Error('Authentication failed. Please log in again.');
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle rate limiting specifically
        if (response.status === 429) {
          const retryAfter = errorData.retryAfter || 60;
          const formatTime = (seconds: number) => {
            if (seconds < 60) return `${seconds} seconds`;
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            if (remainingSeconds === 0) return `${minutes} minutes`;
            return `${minutes} minutes and ${remainingSeconds} seconds`;
          };
          
          // Block this endpoint for the retry duration
          this.rateLimitBlocker.blockEndpoint(endpoint, retryAfter);
          
          logger.warn(`🚫 Rate limit exceeded. Retry after ${retryAfter} seconds`);
          
          // Show toast notification
          this.showRateLimitToast(formatTime(retryAfter));
          
          throw new Error(`Rate limit exceeded. Please wait ${formatTime(retryAfter)} before trying again.`);
        }
        
        // For auth endpoints, use simpler error logging to avoid noise
        if (isAuthEndpoint) {
          logger.debug('❌ Auth endpoint failed:', {
            status: response.status,
            endpoint
          });
        } else {
          logger.error('❌ API request failed:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        }
        
        // Extract error message from different possible formats
        let errorMessage = response.statusText;
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        } else if (typeof errorData === 'string') {
          errorMessage = errorData;
        }
        
        throw new Error(errorMessage);
      }
      
      return await response.json();
    } catch (error) {
      // For auth endpoints, use simpler error logging to avoid noise
      if (isAuthEndpoint) {
        logger.debug('❌ Auth request failed:', error);
      } else {
        logger.error('❌ API request failed:', error);
      }
      
      // Handle specific error types
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout. Please check your connection and try again.');
        }
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
      }
      
      throw error;
    }
  }

  // Simple toast notification for rate limiting
  private showRateLimitToast(waitTime: string) {
    // Check if we're in a browser environment
    if (typeof window !== 'undefined') {
      toast.error(`Rate limited! Please wait ${waitTime} before trying again.`);
    }
  }

  protected async get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  protected async post<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    logger.debug('📤 POST Request:', {
      endpoint,
      data: data instanceof FormData ? 'FormData' : (data ? JSON.stringify(data, null, 2) : 'No data')
    });
    
    // Handle FormData specially - don't JSON.stringify it
    const body = data instanceof FormData ? data : (data ? JSON.stringify(data) : undefined);
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body,
      ...options,
    });
  }

  protected async patch<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  protected async delete<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', ...options });
  }

  protected async put<T>(endpoint: string, data?: unknown, options?: ApiRequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  // Helper method to build query strings
  protected buildQueryString(params: Record<string, unknown>): string {
    const searchParams = new URLSearchParams();
    
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    
    return searchParams.toString();
  }
} 