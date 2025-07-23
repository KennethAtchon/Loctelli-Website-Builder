import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { ThemeProvider } from '@/components/layout'
import { AdminAuthProvider } from '@/contexts/admin-auth-context'

// Mock the API client
jest.mock('@/lib/api/client', () => ({
  ApiClient: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  })),
}))

// Mock the entire API module
jest.mock('@/lib/api', () => ({
  api: {
    auth: {
      login: jest.fn(),
      register: jest.fn(),
      logout: jest.fn(),
      getProfile: jest.fn(),
    },
    adminAuth: {
      adminLogin: jest.fn(),
      adminRegister: jest.fn(),
      adminLogout: jest.fn(),
      getAdminProfile: jest.fn(),
    },
    users: {
      getUsers: jest.fn(),
      getUser: jest.fn(),
      createUser: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
    },
    leads: {
      getLeads: jest.fn(),
      getLead: jest.fn(),
      createLead: jest.fn(),
      updateLead: jest.fn(),
      deleteLead: jest.fn(),
    },
    strategies: {
      getStrategies: jest.fn(),
      getStrategy: jest.fn(),
      createStrategy: jest.fn(),
      updateStrategy: jest.fn(),
      deleteStrategy: jest.fn(),
    },
    bookings: {
      getBookings: jest.fn(),
      getBooking: jest.fn(),
      createBooking: jest.fn(),
      updateBooking: jest.fn(),
      deleteBooking: jest.fn(),
    },
    chat: {
      sendMessage: jest.fn(),
      getChatHistory: jest.fn(),
    },
    promptTemplates: {
      getPromptTemplates: jest.fn(),
      getPromptTemplate: jest.fn(),
      createPromptTemplate: jest.fn(),
      updatePromptTemplate: jest.fn(),
      deletePromptTemplate: jest.fn(),
    },
    status: {
      getSystemStatus: jest.fn(),
    },
    general: {
      getHealth: jest.fn(),
    },
  },
  AuthApi: jest.fn(),
  AdminAuthApi: jest.fn(),
  UsersApi: jest.fn(),
  LeadsApi: jest.fn(),
  StrategiesApi: jest.fn(),
  BookingsApi: jest.fn(),
  ChatApi: jest.fn(),
  PromptTemplatesApi: jest.fn(),
  StatusApi: jest.fn(),
  GeneralApi: jest.fn(),
}))

// Mock the logger as default export
jest.mock('@/lib/logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}))

// Mock the cookies module
jest.mock('@/lib/cookies', () => ({
  AuthCookies: {
    hasUserTokens: jest.fn(),
    hasAdminTokens: jest.fn(),
    setAccessToken: jest.fn(),
    setRefreshToken: jest.fn(),
    setAdminAccessToken: jest.fn(),
    setAdminRefreshToken: jest.fn(),
    getAdminAccessToken: jest.fn(),
    getAdminRefreshToken: jest.fn(),
    clearUserTokens: jest.fn(),
    clearAdminTokens: jest.fn(),
    clearAll: jest.fn(),
  },
}))

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
              <AdminAuthProvider>
          {children}
        </AdminAuthProvider>
    </ThemeProvider>
  )
}

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {}

const customRender = (
  ui: ReactElement,
  options: CustomRenderOptions = {}
) => {
  return render(ui, {
    wrapper: ({ children }) => (
      <AllTheProviders>
        {children}
      </AllTheProviders>
    ),
    ...options,
  })
}

// Re-export everything
export * from '@testing-library/react'

// Override render method
export { customRender as render }

// Common test data
export const mockUser = {
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  role: 'USER',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockAdminUser = {
  id: '1',
  email: 'admin@example.com',
  name: 'Admin User',
  role: 'ADMIN',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export const mockAuthContext = {
  user: mockUser,
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  register: jest.fn(),
}

export const mockAdminAuthContext = {
  user: mockAdminUser,
  isAuthenticated: true,
  isLoading: false,
  login: jest.fn(),
  logout: jest.fn(),
  verifyCode: jest.fn(),
}

// Common test helpers
export const waitForLoadingToFinish = () => {
  return new Promise(resolve => setTimeout(resolve, 0))
}

export const createMockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    data,
    status,
    statusText: 'OK',
  })
}

export const createMockApiError = (message: string, status = 400) => {
  return Promise.reject({
    response: {
      data: { message },
      status,
      statusText: 'Bad Request',
    },
  })
} 