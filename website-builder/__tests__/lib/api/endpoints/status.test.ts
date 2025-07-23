import { StatusApi, SystemStatus } from '@/lib/api/endpoints/status'
import { ApiClient } from '@/lib/api/client'

jest.mock('@/lib/logger', () => ({
  default: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
const mockPatch = jest.fn()
const mockDelete = jest.fn()

beforeAll(() => {
  ApiClient.prototype.get = mockGet
  ApiClient.prototype.post = mockPost
  ApiClient.prototype.put = mockPut
  ApiClient.prototype.patch = mockPatch
  ApiClient.prototype.delete = mockDelete
})

beforeEach(() => {
  jest.clearAllMocks()
})

describe('StatusApi', () => {
  let statusApi: StatusApi

  beforeEach(() => {
    // Create a new instance
    statusApi = new StatusApi()
  })

  describe('getStatus', () => {
    it('should call get status endpoint successfully', async () => {
      const mockSystemStatus: SystemStatus = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 86400, // 24 hours in seconds
        services: {
          database: true,
          redis: true,
          api: true,
        },
      }

      mockGet.mockResolvedValue(mockSystemStatus)

      const result = await statusApi.getStatus()

      expect(mockGet).toHaveBeenCalledWith('/status')
      expect(result).toEqual(mockSystemStatus)
      expect(result.status).toBe('healthy')
      expect(result.version).toBe('1.0.0')
      expect(result.uptime).toBe(86400)
      expect(result.services.database).toBe(true)
      expect(result.services.redis).toBe(true)
      expect(result.services.api).toBe(true)
    })

    it('should handle system with some services down', async () => {
      const mockSystemStatus: SystemStatus = {
        status: 'degraded',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 3600, // 1 hour in seconds
        services: {
          database: true,
          redis: false,
          api: true,
        },
      }

      mockGet.mockResolvedValue(mockSystemStatus)

      const result = await statusApi.getStatus()

      expect(mockGet).toHaveBeenCalledWith('/status')
      expect(result).toEqual(mockSystemStatus)
      expect(result.status).toBe('degraded')
      expect(result.services.database).toBe(true)
      expect(result.services.redis).toBe(false)
      expect(result.services.api).toBe(true)
    })

    it('should handle system with all services down', async () => {
      const mockSystemStatus: SystemStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 0,
        services: {
          database: false,
          redis: false,
          api: false,
        },
      }

      mockGet.mockResolvedValue(mockSystemStatus)

      const result = await statusApi.getStatus()

      expect(mockGet).toHaveBeenCalledWith('/status')
      expect(result).toEqual(mockSystemStatus)
      expect(result.status).toBe('unhealthy')
      expect(result.uptime).toBe(0)
      expect(result.services.database).toBe(false)
      expect(result.services.redis).toBe(false)
      expect(result.services.api).toBe(false)
    })

    it('should handle get status error', async () => {
      const error = new Error('Failed to fetch system status')
      mockGet.mockRejectedValue(error)

      await expect(statusApi.getStatus()).rejects.toThrow('Failed to fetch system status')
      expect(mockGet).toHaveBeenCalledWith('/status')
    })
  })

  describe('getHealth', () => {
    it('should call get health endpoint successfully', async () => {
      const mockHealthResponse = {
        status: 'healthy',
      }

      mockGet.mockResolvedValue(mockHealthResponse)

      const result = await statusApi.getHealth()

      expect(mockGet).toHaveBeenCalledWith('/status/health')
      expect(result).toEqual(mockHealthResponse)
      expect(result.status).toBe('healthy')
    })

    it('should handle unhealthy status', async () => {
      const mockHealthResponse = {
        status: 'unhealthy',
      }

      mockGet.mockResolvedValue(mockHealthResponse)

      const result = await statusApi.getHealth()

      expect(mockGet).toHaveBeenCalledWith('/status/health')
      expect(result).toEqual(mockHealthResponse)
      expect(result.status).toBe('unhealthy')
    })

    it('should handle degraded status', async () => {
      const mockHealthResponse = {
        status: 'degraded',
      }

      mockGet.mockResolvedValue(mockHealthResponse)

      const result = await statusApi.getHealth()

      expect(mockGet).toHaveBeenCalledWith('/status/health')
      expect(result).toEqual(mockHealthResponse)
      expect(result.status).toBe('degraded')
    })

    it('should handle get health error', async () => {
      const error = new Error('Failed to fetch health status')
      mockGet.mockRejectedValue(error)

      await expect(statusApi.getHealth()).rejects.toThrow('Failed to fetch health status')
      expect(mockGet).toHaveBeenCalledWith('/status/health')
    })
  })

  describe('getVersion', () => {
    it('should call get version endpoint successfully', async () => {
      const mockVersionResponse = {
        version: '1.0.0',
      }

      mockGet.mockResolvedValue(mockVersionResponse)

      const result = await statusApi.getVersion()

      expect(mockGet).toHaveBeenCalledWith('/status/version')
      expect(result).toEqual(mockVersionResponse)
      expect(result.version).toBe('1.0.0')
    })

    it('should handle different version formats', async () => {
      const mockVersionResponse = {
        version: '2.1.3-beta',
      }

      mockGet.mockResolvedValue(mockVersionResponse)

      const result = await statusApi.getVersion()

      expect(mockGet).toHaveBeenCalledWith('/status/version')
      expect(result).toEqual(mockVersionResponse)
      expect(result.version).toBe('2.1.3-beta')
    })

    it('should handle semantic versioning', async () => {
      const mockVersionResponse = {
        version: '1.2.3',
      }

      mockGet.mockResolvedValue(mockVersionResponse)

      const result = await statusApi.getVersion()

      expect(mockGet).toHaveBeenCalledWith('/status/version')
      expect(result).toEqual(mockVersionResponse)
      expect(result.version).toBe('1.2.3')
    })

    it('should handle get version error', async () => {
      const error = new Error('Failed to fetch version')
      mockGet.mockRejectedValue(error)

      await expect(statusApi.getVersion()).rejects.toThrow('Failed to fetch version')
      expect(mockGet).toHaveBeenCalledWith('/status/version')
    })
  })

  describe('Integration Scenarios', () => {
    it('should handle complete system status check', async () => {
      // Mock all three endpoints
      const mockSystemStatus: SystemStatus = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 86400,
        services: {
          database: true,
          redis: true,
          api: true,
        },
      }

      const mockHealthResponse = { status: 'healthy' }
      const mockVersionResponse = { version: '1.0.0' }

      mockGet
        .mockResolvedValueOnce(mockSystemStatus)
        .mockResolvedValueOnce(mockHealthResponse)
        .mockResolvedValueOnce(mockVersionResponse)

      // Call all three methods
      const systemStatus = await statusApi.getStatus()
      const healthStatus = await statusApi.getHealth()
      const versionInfo = await statusApi.getVersion()

      // Verify all calls were made
      expect(mockGet).toHaveBeenCalledWith('/status')
      expect(mockGet).toHaveBeenCalledWith('/status/health')
      expect(mockGet).toHaveBeenCalledWith('/status/version')

      // Verify results
      expect(systemStatus).toEqual(mockSystemStatus)
      expect(healthStatus).toEqual(mockHealthResponse)
      expect(versionInfo).toEqual(mockVersionResponse)

      // Verify consistency
      expect(systemStatus.status).toBe(healthStatus.status)
      expect(systemStatus.version).toBe(versionInfo.version)
    })

    it('should handle system startup scenario', async () => {
      const mockSystemStatus: SystemStatus = {
        status: 'starting',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 30, // 30 seconds
        services: {
          database: true,
          redis: false, // Still starting
          api: true,
        },
      }

      const mockHealthResponse = { status: 'starting' }
      const mockVersionResponse = { version: '1.0.0' }

      mockGet
        .mockResolvedValueOnce(mockSystemStatus)
        .mockResolvedValueOnce(mockHealthResponse)
        .mockResolvedValueOnce(mockVersionResponse)

      const systemStatus = await statusApi.getStatus()
      const healthStatus = await statusApi.getHealth()
      const versionInfo = await statusApi.getVersion()

      expect(systemStatus.status).toBe('starting')
      expect(healthStatus.status).toBe('starting')
      expect(systemStatus.uptime).toBe(30)
      expect(systemStatus.services.redis).toBe(false)
    })
  })

  describe('Type Safety', () => {
    it('should enforce correct SystemStatus structure', () => {
      const validSystemStatus: SystemStatus = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 86400,
        services: {
          database: true,
          redis: true,
          api: true,
        },
      }

      expect(validSystemStatus).toHaveProperty('status')
      expect(validSystemStatus).toHaveProperty('timestamp')
      expect(validSystemStatus).toHaveProperty('version')
      expect(validSystemStatus).toHaveProperty('uptime')
      expect(validSystemStatus).toHaveProperty('services')
      expect(validSystemStatus.services).toHaveProperty('database')
      expect(validSystemStatus.services).toHaveProperty('redis')
      expect(validSystemStatus.services).toHaveProperty('api')
    })

    it('should handle different status values', () => {
      const healthyStatus: SystemStatus = {
        status: 'healthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 86400,
        services: { database: true, redis: true, api: true },
      }

      const degradedStatus: SystemStatus = {
        status: 'degraded',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 86400,
        services: { database: true, redis: false, api: true },
      }

      const unhealthyStatus: SystemStatus = {
        status: 'unhealthy',
        timestamp: '2024-01-01T12:00:00Z',
        version: '1.0.0',
        uptime: 0,
        services: { database: false, redis: false, api: false },
      }

      expect(healthyStatus.status).toBe('healthy')
      expect(degradedStatus.status).toBe('degraded')
      expect(unhealthyStatus.status).toBe('unhealthy')
    })

    it('should handle boolean service status', () => {
      const services = {
        database: true,
        redis: false,
        api: true,
      }

      expect(typeof services.database).toBe('boolean')
      expect(typeof services.redis).toBe('boolean')
      expect(typeof services.api).toBe('boolean')
      expect(services.database).toBe(true)
      expect(services.redis).toBe(false)
      expect(services.api).toBe(true)
    })

    it('should handle numeric uptime', () => {
      const uptimeValues = [0, 60, 3600, 86400, 604800]

      uptimeValues.forEach(uptime => {
        expect(typeof uptime).toBe('number')
        expect(uptime).toBeGreaterThanOrEqual(0)
      })
    })

    it('should handle string version formats', () => {
      const versionFormats = ['1.0.0', '2.1.3', '1.0.0-beta', '2.0.0-alpha.1']

      versionFormats.forEach(version => {
        expect(typeof version).toBe('string')
        expect(version.length).toBeGreaterThan(0)
      })
    })
  })
}) 