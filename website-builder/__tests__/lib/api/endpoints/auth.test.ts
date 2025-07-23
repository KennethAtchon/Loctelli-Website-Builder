import { AuthApi, LoginDto, RegisterDto, AuthResponse, UserProfile } from '@/lib/api/endpoints/auth'
import { ApiClient } from '@/lib/api/client'

// Mock the logger
jest.mock('@/lib/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockPatch = jest.fn();
const mockDelete = jest.fn();

beforeAll(() => {
  ApiClient.prototype.get = mockGet;
  ApiClient.prototype.post = mockPost;
  ApiClient.prototype.put = mockPut;
  ApiClient.prototype.patch = mockPatch;
  ApiClient.prototype.delete = mockDelete;
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe('AuthApi', () => {
  let authApi: AuthApi

  beforeEach(() => {
    authApi = new AuthApi()
  })

  describe('login', () => {
    it('should call login endpoint with correct data', async () => {
      const loginData: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      const mockResponse: AuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        },
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.login(loginData)

      expect(mockPost).toHaveBeenCalledWith('/auth/login', loginData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle login errors', async () => {
      const loginData: LoginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      }

      const error = new Error('Invalid credentials')
      mockPost.mockRejectedValue(error)

      await expect(authApi.login(loginData)).rejects.toThrow('Invalid credentials')
      expect(mockPost).toHaveBeenCalledWith('/auth/login', loginData)
    })
  })

  describe('register', () => {
    it('should call register endpoint with correct data', async () => {
      const registerData: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        company: 'Test Company',
        budget: '10000-50000',
      }

      const mockResponse = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        company: 'Test Company',
        isActive: true,
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.register(registerData)

      expect(mockPost).toHaveBeenCalledWith('/auth/register', registerData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle registration without optional fields', async () => {
      const registerData: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
      }

      const mockResponse = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        isActive: true,
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.register(registerData)

      expect(mockPost).toHaveBeenCalledWith('/auth/register', registerData)
      expect(result).toEqual(mockResponse)
    })

    it('should handle registration errors', async () => {
      const registerData: RegisterDto = {
        name: 'Test User',
        email: 'existing@example.com',
        password: 'password123',
      }

      const error = new Error('Email already exists')
      mockPost.mockRejectedValue(error)

      await expect(authApi.register(registerData)).rejects.toThrow('Email already exists')
      expect(mockPost).toHaveBeenCalledWith('/auth/register', registerData)
    })
  })

  describe('refreshToken', () => {
    it('should call refresh token endpoint with correct data', async () => {
      const refreshToken = 'refresh-token-123'
      const mockResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.refreshToken(refreshToken)

      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refresh_token: refreshToken })
      expect(result).toEqual(mockResponse)
    })

    it('should handle refresh token errors', async () => {
      const refreshToken = 'invalid-refresh-token'
      const error = new Error('Invalid refresh token')
      mockPost.mockRejectedValue(error)

      await expect(authApi.refreshToken(refreshToken)).rejects.toThrow('Invalid refresh token')
      expect(mockPost).toHaveBeenCalledWith('/auth/refresh', { refresh_token: refreshToken })
    })
  })

  describe('logout', () => {
    it('should call logout endpoint', async () => {
      const mockResponse = {
        message: 'Logged out successfully',
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.logout()

      expect(mockPost).toHaveBeenCalledWith('/auth/logout')
      expect(result).toEqual(mockResponse)
    })

    it('should handle logout errors', async () => {
      const error = new Error('Network error')
      mockPost.mockRejectedValue(error)

      await expect(authApi.logout()).rejects.toThrow('Network error')
      expect(mockPost).toHaveBeenCalledWith('/auth/logout')
    })
  })

  describe('getProfile', () => {
    it('should call get profile endpoint', async () => {
      const mockResponse: UserProfile = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        company: 'Test Company',
        isActive: true,
        lastLoginAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      mockGet.mockResolvedValue(mockResponse)

      const result = await authApi.getProfile()

      expect(mockGet).toHaveBeenCalledWith('/auth/profile')
      expect(result).toEqual(mockResponse)
    })

    it('should handle get profile errors', async () => {
      const error = new Error('Unauthorized')
      mockGet.mockRejectedValue(error)

      await expect(authApi.getProfile()).rejects.toThrow('Unauthorized')
      expect(mockGet).toHaveBeenCalledWith('/auth/profile')
    })
  })

  describe('changePassword', () => {
    it('should call change password endpoint with correct data', async () => {
      const oldPassword = 'old-password'
      const newPassword = 'new-password'
      const mockResponse = {
        message: 'Password changed successfully',
      }

      mockPost.mockResolvedValue(mockResponse)

      const result = await authApi.changePassword(oldPassword, newPassword)

      expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
        oldPassword,
        newPassword,
      })
      expect(result).toEqual(mockResponse)
    })

    it('should handle change password errors', async () => {
      const oldPassword = 'wrong-old-password'
      const newPassword = 'new-password'
      const error = new Error('Invalid old password')
      mockPost.mockRejectedValue(error)

      await expect(authApi.changePassword(oldPassword, newPassword)).rejects.toThrow('Invalid old password')
      expect(mockPost).toHaveBeenCalledWith('/auth/change-password', {
        oldPassword,
        newPassword,
      })
    })
  })

  describe('Type Safety', () => {
    it('should enforce correct LoginDto structure', () => {
      // This test ensures TypeScript compilation
      const validLoginData: LoginDto = {
        email: 'test@example.com',
        password: 'password123',
      }

      expect(validLoginData).toHaveProperty('email')
      expect(validLoginData).toHaveProperty('password')
    })

    it('should enforce correct RegisterDto structure', () => {
      // This test ensures TypeScript compilation
      const validRegisterData: RegisterDto = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        company: 'Test Company',
        budget: '10000-50000',
      }

      expect(validRegisterData).toHaveProperty('name')
      expect(validRegisterData).toHaveProperty('email')
      expect(validRegisterData).toHaveProperty('password')
      expect(validRegisterData).toHaveProperty('company')
      expect(validRegisterData).toHaveProperty('budget')
    })

    it('should enforce correct AuthResponse structure', () => {
      // This test ensures TypeScript compilation
      const validAuthResponse: AuthResponse = {
        access_token: 'access-token',
        refresh_token: 'refresh-token',
        user: {
          id: 1,
          name: 'Test User',
          email: 'test@example.com',
          role: 'USER',
        },
      }

      expect(validAuthResponse).toHaveProperty('access_token')
      expect(validAuthResponse).toHaveProperty('refresh_token')
      expect(validAuthResponse).toHaveProperty('user')
      expect(validAuthResponse.user).toHaveProperty('id')
      expect(validAuthResponse.user).toHaveProperty('name')
      expect(validAuthResponse.user).toHaveProperty('email')
      expect(validAuthResponse.user).toHaveProperty('role')
    })

    it('should enforce correct UserProfile structure', () => {
      // This test ensures TypeScript compilation
      const validUserProfile: UserProfile = {
        id: 1,
        name: 'Test User',
        email: 'test@example.com',
        role: 'USER',
        company: 'Test Company',
        isActive: true,
        lastLoginAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      expect(validUserProfile).toHaveProperty('id')
      expect(validUserProfile).toHaveProperty('name')
      expect(validUserProfile).toHaveProperty('email')
      expect(validUserProfile).toHaveProperty('role')
      expect(validUserProfile).toHaveProperty('company')
      expect(validUserProfile).toHaveProperty('isActive')
      expect(validUserProfile).toHaveProperty('lastLoginAt')
      expect(validUserProfile).toHaveProperty('createdAt')
      expect(validUserProfile).toHaveProperty('updatedAt')
    })
  })
}) 