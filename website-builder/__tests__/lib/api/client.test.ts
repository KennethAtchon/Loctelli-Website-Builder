// Mock dependencies before importing the module
jest.mock('@/lib/cookies', () => ({
  AuthCookies: {
    getAdminAccessToken: jest.fn(),
    getAdminRefreshToken: jest.fn(),
    getAccessToken: jest.fn(),
    getRefreshToken: jest.fn(),
    setAdminAccessToken: jest.fn(),
    setAdminRefreshToken: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    clearAdminTokens: jest.fn(),
    clearUserTokens: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  },
}))

jest.mock('@/lib/envUtils', () => ({
  API_CONFIG: {
    BASE_URL: 'http://localhost:3001',
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

import { ApiClient } from '@/lib/api/client'
import { AuthCookies } from '@/lib/cookies'
import logger from '@/lib/logger'

// Create a test subclass to access protected methods
class TestApiClient extends ApiClient {
  public async get<T>(endpoint: string, options?: any): Promise<T> {
    return super.get(endpoint, options);
  }

  public async post<T>(endpoint: string, data?: unknown, options?: any): Promise<T> {
    return super.post(endpoint, data, options);
  }

  public async put<T>(endpoint: string, data?: unknown, options?: any): Promise<T> {
    return super.put(endpoint, data, options);
  }

  public async patch<T>(endpoint: string, data?: unknown, options?: any): Promise<T> {
    return super.patch(endpoint, data, options);
  }

  public async delete<T>(endpoint: string, options?: any): Promise<T> {
    return super.delete(endpoint, options);
  }

  public buildQueryString(params: Record<string, unknown>): string {
    return super.buildQueryString(params);
  }
}

describe('ApiClient', () => {
  let apiClient: TestApiClient
  const mockFetch = fetch as jest.MockedFunction<typeof fetch>
  const mockAuthCookies = AuthCookies as jest.Mocked<typeof AuthCookies>
  const mockLogger = logger as jest.Mocked<typeof logger>

  beforeEach(() => {
    jest.clearAllMocks()
    apiClient = new TestApiClient('http://localhost:3001')
    
    // Reset fetch mock
    mockFetch.mockReset()
  })

  describe('Constructor', () => {
    it('should create instance with default base URL', () => {
      const client = new TestApiClient()
      expect(client).toBeInstanceOf(ApiClient)
    })

    it('should create instance with custom base URL', () => {
      const client = new TestApiClient('https://api.example.com')
      expect(client).toBeInstanceOf(ApiClient)
    })
  })

  describe('Authentication Headers', () => {
    it('should include admin access token when available', () => {
      mockAuthCookies.getAdminAccessToken.mockReturnValue('admin-token')
      mockAuthCookies.getAdminRefreshToken.mockReturnValue('admin-refresh')
      mockAuthCookies.getAccessToken.mockReturnValue('user-token')
      mockAuthCookies.getRefreshToken.mockReturnValue('user-refresh')

      // Access private method through type assertion
      const headers = (apiClient as any).getAuthHeaders()

      expect(headers['x-user-token']).toBe('admin-token')
      expect(mockLogger.debug).toHaveBeenCalled()
    })

    it('should include user access token when admin token not available', () => {
      mockAuthCookies.getAdminAccessToken.mockReturnValue(null)
      mockAuthCookies.getAdminRefreshToken.mockReturnValue(null)
      mockAuthCookies.getAccessToken.mockReturnValue('user-token')
      mockAuthCookies.getRefreshToken.mockReturnValue('user-refresh')

      const headers = (apiClient as any).getAuthHeaders()

      expect(headers['x-user-token']).toBe('user-token')
    })

    it('should return empty headers when no tokens available', () => {
      mockAuthCookies.getAdminAccessToken.mockReturnValue(null)
      mockAuthCookies.getAdminRefreshToken.mockReturnValue(null)
      mockAuthCookies.getAccessToken.mockReturnValue(null)
      mockAuthCookies.getRefreshToken.mockReturnValue(null)

      const headers = (apiClient as any).getAuthHeaders()

      expect(headers).toEqual({})
    })
  })

  describe('Request Methods', () => {
    beforeEach(() => {
      // Setup default successful response
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' }),
      } as any)
    })

    it('should make GET request successfully', async () => {
      const response = await apiClient.get('/test')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should make POST request successfully', async () => {
      const data = { name: 'test' }
      await apiClient.post('/test', data)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      )
    })

    it('should make PUT request successfully', async () => {
      const data = { name: 'test' }
      await apiClient.put('/test', data)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(data),
        })
      )
    })

    it('should make PATCH request successfully', async () => {
      const data = { name: 'test' }
      await apiClient.patch('/test', data)
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(data),
        })
      )
    })

    it('should make DELETE request successfully', async () => {
      await apiClient.delete('/test')
      
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/test',
        expect.objectContaining({
          method: 'DELETE',
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(apiClient.get('/test')).rejects.toThrow('Network error')
    })

    it('should handle timeout errors', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('AbortError')), 100)
        )
      )

      await expect(apiClient.get('/test')).rejects.toThrow('AbortError')
    })

    it('should handle 401 errors and attempt token refresh', async () => {
      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any)

      // Second call (after refresh) returns 401 again (simulate failed refresh)
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }),
      } as any)

      // Mock refresh token
      mockAuthCookies.getRefreshToken.mockReturnValue('refresh-token')
      mockAuthCookies.setAccessToken.mockImplementation(() => {})
      mockAuthCookies.setRefreshToken.mockImplementation(() => {})

      await expect(apiClient.get('/test')).rejects.toThrow('Authentication failed. Please log in again.')
    })

    it('should handle 401 errors without refresh token', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      } as any)

      mockAuthCookies.getRefreshToken.mockReturnValue(null)

      await expect(apiClient.get('/test')).rejects.toThrow('Authentication failed. Please log in again.')
    })

    it('should NOT retry authentication endpoints on 401 errors', async () => {
      // Mock 401 response for auth endpoint
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ message: 'Invalid credentials' }),
      } as any)

      // Mock refresh tokens to ensure they're not used
      mockAuthCookies.getRefreshToken.mockReturnValue('refresh-token')
      mockAuthCookies.getAdminRefreshToken.mockReturnValue('admin-refresh-token')

      // Test admin login endpoint
      await expect(apiClient.post('/admin/auth/login', { email: 'test@example.com', password: 'password' }))
        .rejects.toThrow('Invalid credentials')

      // Should only call fetch once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/admin/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      )
    })

    it('should NOT retry user auth endpoints on 401 errors', async () => {
      // Reset mock
      mockFetch.mockReset()
      
      // Mock 401 response for user auth endpoint
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: jest.fn().mockResolvedValue({ message: 'Invalid credentials' }),
      } as any)

      // Mock refresh tokens to ensure they're not used
      mockAuthCookies.getRefreshToken.mockReturnValue('refresh-token')
      mockAuthCookies.getAdminRefreshToken.mockReturnValue('admin-refresh-token')

      // Test user login endpoint
      await expect(apiClient.post('/auth/login', { email: 'test@example.com', password: 'password' }))
        .rejects.toThrow('Invalid credentials')

      // Should only call fetch once (no retry)
      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'test@example.com', password: 'password' }),
        })
      )
    })
  })

  describe('Query String Building', () => {
    it('should build query string correctly', () => {
      const params = {
        page: 1,
        limit: 10,
        search: 'test',
        active: true,
        tags: ['tag1', 'tag2'],
      }

      const queryString = apiClient.buildQueryString(params)
      
      expect(queryString).toContain('page=1')
      expect(queryString).toContain('limit=10')
      expect(queryString).toContain('search=test')
      expect(queryString).toContain('active=true')
      expect(queryString).toContain('tags=tag1%2Ctag2') // URL encoded comma-separated array
    })

    it('should handle empty params', () => {
      const queryString = apiClient.buildQueryString({})
      
      expect(queryString).toBe('')
    })

    it('should handle null and undefined values', () => {
      const params = {
        page: 1,
        search: null,
        filter: undefined,
      }

      const queryString = apiClient.buildQueryString(params)
      
      expect(queryString).toBe('page=1')
    })
  })

  describe('Request Options', () => {
    it('should use custom timeout', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' }),
      } as any)

      await apiClient.get('/test', { timeout: 5000 })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      )
    })

    it('should include custom headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValue({ data: 'success' }),
      } as any)

      await apiClient.get('/test', { 
        headers: { 'X-Custom-Header': 'custom-value' } 
      })
      
      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Custom-Header': 'custom-value',
          }),
        })
      )
    })
  })
}) 