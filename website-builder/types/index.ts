// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
  company?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Website Builder types (to be added later)
export interface Website {
  id: string;
  name: string;
  description?: string;
  type: 'static' | 'vite' | 'react';
  structure: any;
  files: any;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  userId?: string;
}

export interface WebsiteChange {
  id: string;
  websiteId: string;
  description: string;
  modifications: any;
  aiPrompt: string;
  status: 'applied' | 'reverted';
  createdAt: Date;
}

export interface CreateWebsiteDto {
  name: string;
  description?: string;
  files: File[];
}

export interface AiEditDto {
  websiteId: string;
  prompt: string;
}

export interface ExportWebsiteDto {
  websiteId: string;
  format?: 'zip' | 'tar';
} 