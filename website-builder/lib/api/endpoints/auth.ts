import { ApiClient } from '../client';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  name: string;
  email: string;
  password: string;
  company?: string;
  budget?: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    company?: string;
  };
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  company?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export class AuthApi extends ApiClient {
  async login(data: LoginDto): Promise<AuthResponse> {
    return this.post<AuthResponse>('/auth/login', data);
  }

  async register(data: RegisterDto): Promise<Omit<UserProfile, 'lastLoginAt' | 'createdAt' | 'updatedAt'>> {
    return this.post<Omit<UserProfile, 'lastLoginAt' | 'createdAt' | 'updatedAt'>>('/auth/register', data);
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string; refresh_token: string }> {
    return this.post<{ access_token: string; refresh_token: string }>('/auth/refresh', { refresh_token: refreshToken });
  }

  async logout(): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/logout');
  }

  async getProfile(): Promise<UserProfile> {
    return this.get<UserProfile>('/auth/profile');
  }

  async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    return this.post<{ message: string }>('/auth/change-password', { oldPassword, newPassword });
  }
} 