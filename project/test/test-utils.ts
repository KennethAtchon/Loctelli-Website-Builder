import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/core/app.module';
import * as request from 'supertest';

export interface TestUser {
  id: number;
  name: string;
  email: string;
  role: string;
  company?: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: TestUser;
}

export class TestHelper {
  private app: INestApplication;
  private moduleFixture: TestingModule;

  async createApp(): Promise<INestApplication> {
    this.moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    this.app = this.moduleFixture.createNestApplication();
    await this.app.init();
    return this.app;
  }

  async closeApp(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  getApp(): INestApplication {
    return this.app;
  }

  async createTestUser(userData: Partial<TestUser> = {}): Promise<TestUser> {
    const defaultUser = {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      company: 'Test Company',
      role: 'user',
      ...userData,
    };

    const response = await request(this.app.getHttpServer())
      .post('/auth/register')
      .send(defaultUser)
      .expect(201);

    return response.body;
  }

  async loginUser(email: string, password: string): Promise<AuthTokens> {
    const response = await request(this.app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(200);

    return response.body;
  }

  async createAuthenticatedUser(userData: Partial<TestUser> = {}): Promise<{
    user: TestUser;
    tokens: AuthTokens;
  }> {
    const user = await this.createTestUser(userData);
    const tokens = await this.loginUser(user.email, 'Password123!');

    return { user, tokens };
  }

  getAuthHeaders(accessToken: string): { Authorization: string } {
    return { Authorization: `Bearer ${accessToken}` };
  }
}

export const createMockUser = (overrides: Partial<TestUser> = {}): TestUser => ({
  id: 1,
  name: 'Test User',
  email: 'test@example.com',
  role: 'user',
  company: 'Test Company',
  ...overrides,
});

export const createMockAuthTokens = (overrides: Partial<AuthTokens> = {}): AuthTokens => ({
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  user: createMockUser(),
  ...overrides,
});

export const mockPrismaService = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    findFirst: jest.fn(),
  },
  lead: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  strategy: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  booking: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  promptTemplate: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

export const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
};

export const mockCacheService = {
  setCache: jest.fn(),
  getCache: jest.fn(),
  delCache: jest.fn(),
};

export const mockGhlService = {
  searchSubaccounts: jest.fn(),
  searchContacts: jest.fn(),
  createContact: jest.fn(),
  updateContact: jest.fn(),
};

export const clearAllMocks = () => {
  jest.clearAllMocks();
  Object.values(mockPrismaService).forEach(service => {
    Object.values(service).forEach(method => {
      if (typeof method === 'function') {
        (method as jest.Mock).mockClear();
      }
    });
  });
  Object.values(mockJwtService).forEach(method => {
    (method as jest.Mock).mockClear();
  });
  Object.values(mockCacheService).forEach(method => {
    (method as jest.Mock).mockClear();
  });
  Object.values(mockGhlService).forEach(method => {
    (method as jest.Mock).mockClear();
  });
};

export const createTestingModule = async (providers: any[] = []) => {
  return Test.createTestingModule({
    providers: [
      ...providers,
      {
        provide: 'PrismaService',
        useValue: mockPrismaService,
      },
      {
        provide: 'JwtService',
        useValue: mockJwtService,
      },
      {
              provide: 'CacheService',
      useValue: mockCacheService,
      },
      {
        provide: 'GhlService',
        useValue: mockGhlService,
      },
    ],
  }).compile();
};

export const expectValidationError = (response: request.Response, field: string) => {
  expect(response.status).toBe(400);
  expect(response.body.message).toContain(field);
};

export const expectUnauthorizedError = (response: request.Response) => {
  expect(response.status).toBe(401);
};

export const expectForbiddenError = (response: request.Response) => {
  expect(response.status).toBe(403);
};

export const expectNotFoundError = (response: request.Response) => {
  expect(response.status).toBe(404);
};

export const expectConflictError = (response: request.Response) => {
  expect(response.status).toBe(409);
}; 