import { GeneralApi, DatabaseSchema, SchemaResponse } from '@/lib/api/endpoints/general'
import { ApiClient } from '@/lib/api/client'

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

describe('GeneralApi', () => {
  let generalApi: GeneralApi

  beforeEach(() => {
    // Create a new instance
    generalApi = new GeneralApi()
  })

  describe('getDatabaseSchema', () => {
    it('should call get database schema endpoint successfully', async () => {
      const mockSchema: DatabaseSchema = {
        models: [
          {
            name: 'User',
            fields: [
              {
                name: 'id',
                type: 'Int',
                isRequired: true,
                isId: true,
                isUnique: true,
                isRelation: false,
              },
              {
                name: 'name',
                type: 'String',
                isRequired: true,
                isId: false,
                isUnique: false,
                isRelation: false,
              },
              {
                name: 'email',
                type: 'String',
                isRequired: true,
                isId: false,
                isUnique: true,
                isRelation: false,
              },
              {
                name: 'strategies',
                type: 'Strategy[]',
                isRequired: false,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'one-to-many',
                relationTarget: 'Strategy',
              },
            ],
          },
          {
            name: 'Strategy',
            fields: [
              {
                name: 'id',
                type: 'Int',
                isRequired: true,
                isId: true,
                isUnique: true,
                isRelation: false,
              },
              {
                name: 'userId',
                type: 'Int',
                isRequired: true,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'many-to-one',
                relationTarget: 'User',
              },
              {
                name: 'name',
                type: 'String',
                isRequired: true,
                isId: false,
                isUnique: false,
                isRelation: false,
              },
            ],
          },
        ],
        rawSchema: `
          model User {
            id        Int        @id @default(autoincrement())
            name      String
            email     String     @unique
            strategies Strategy[]
          }

          model Strategy {
            id     Int    @id @default(autoincrement())
            userId Int
            name   String
            user   User   @relation(fields: [userId], references: [id])
          }
        `,
        lastModified: '2024-01-01T00:00:00Z',
      }

      const mockResponse: SchemaResponse = {
        success: true,
        data: mockSchema,
      }

      mockGet.mockResolvedValue(mockResponse)

      const result = await generalApi.getDatabaseSchema()

      expect(mockGet).toHaveBeenCalledWith('/general/schema')
      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockSchema)
    })

    it('should handle get database schema error', async () => {
      const mockErrorResponse: SchemaResponse = {
        success: false,
        error: 'Failed to fetch database schema',
        details: 'Database connection timeout',
      }

      mockGet.mockResolvedValue(mockErrorResponse)

      const result = await generalApi.getDatabaseSchema()

      expect(mockGet).toHaveBeenCalledWith('/general/schema')
      expect(result).toEqual(mockErrorResponse)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to fetch database schema')
      expect(result.details).toBe('Database connection timeout')
    })

    it('should handle network error', async () => {
      const error = new Error('Network error')
      mockGet.mockRejectedValue(error)

      await expect(generalApi.getDatabaseSchema()).rejects.toThrow('Network error')
      expect(mockGet).toHaveBeenCalledWith('/general/schema')
    })

    it('should handle empty schema response', async () => {
      const mockEmptyResponse: SchemaResponse = {
        success: true,
        data: {
          models: [],
          rawSchema: '',
          lastModified: '2024-01-01T00:00:00Z',
        },
      }

      mockGet.mockResolvedValue(mockEmptyResponse)

      const result = await generalApi.getDatabaseSchema()

      expect(mockGet).toHaveBeenCalledWith('/general/schema')
      expect(result).toEqual(mockEmptyResponse)
      expect(result.success).toBe(true)
      expect(result.data?.models).toEqual([])
      expect(result.data?.rawSchema).toBe('')
    })

    it('should handle schema with complex relations', async () => {
      const mockComplexSchema: DatabaseSchema = {
        models: [
          {
            name: 'User',
            fields: [
              {
                name: 'id',
                type: 'Int',
                isRequired: true,
                isId: true,
                isUnique: true,
                isRelation: false,
              },
              {
                name: 'strategies',
                type: 'Strategy[]',
                isRequired: false,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'one-to-many',
                relationTarget: 'Strategy',
              },
              {
                name: 'leads',
                type: 'Lead[]',
                isRequired: false,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'one-to-many',
                relationTarget: 'Lead',
              },
              {
                name: 'bookings',
                type: 'Booking[]',
                isRequired: false,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'one-to-many',
                relationTarget: 'Booking',
              },
            ],
          },
          {
            name: 'Strategy',
            fields: [
              {
                name: 'id',
                type: 'Int',
                isRequired: true,
                isId: true,
                isUnique: true,
                isRelation: false,
              },
              {
                name: 'userId',
                type: 'Int',
                isRequired: true,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'many-to-one',
                relationTarget: 'User',
              },
              {
                name: 'leads',
                type: 'Lead[]',
                isRequired: false,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'one-to-many',
                relationTarget: 'Lead',
              },
            ],
          },
          {
            name: 'Lead',
            fields: [
              {
                name: 'id',
                type: 'Int',
                isRequired: true,
                isId: true,
                isUnique: true,
                isRelation: false,
              },
              {
                name: 'userId',
                type: 'Int',
                isRequired: true,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'many-to-one',
                relationTarget: 'User',
              },
              {
                name: 'strategyId',
                type: 'Int',
                isRequired: true,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'many-to-one',
                relationTarget: 'Strategy',
              },
              {
                name: 'bookings',
                type: 'Booking[]',
                isRequired: false,
                isId: false,
                isUnique: false,
                isRelation: true,
                relationType: 'one-to-many',
                relationTarget: 'Booking',
              },
            ],
          },
        ],
        rawSchema: `
          model User {
            id        Int        @id @default(autoincrement())
            strategies Strategy[]
            leads     Lead[]
            bookings  Booking[]
          }

          model Strategy {
            id     Int    @id @default(autoincrement())
            userId Int
            user   User   @relation(fields: [userId], references: [id])
            leads  Lead[]
          }

          model Lead {
            id         Int       @id @default(autoincrement())
            userId     Int
            strategyId Int
            user       User      @relation(fields: [userId], references: [id])
            strategy   Strategy  @relation(fields: [strategyId], references: [id])
            bookings   Booking[]
          }
        `,
        lastModified: '2024-01-01T00:00:00Z',
      }

      const mockResponse: SchemaResponse = {
        success: true,
        data: mockComplexSchema,
      }

      mockGet.mockResolvedValue(mockResponse)

      const result = await generalApi.getDatabaseSchema()

      expect(mockGet).toHaveBeenCalledWith('/general/schema')
      expect(result).toEqual(mockResponse)
      expect(result.success).toBe(true)
      expect(result.data?.models).toHaveLength(3)
      expect(result.data?.models[0].name).toBe('User')
      expect(result.data?.models[1].name).toBe('Strategy')
      expect(result.data?.models[2].name).toBe('Lead')
    })
  })

  describe('Type Safety', () => {
    it('should enforce correct DatabaseSchema structure', () => {
      const validSchema: DatabaseSchema = {
        models: [
          {
            name: 'TestModel',
            fields: [
              {
                name: 'id',
                type: 'Int',
                isRequired: true,
                isId: true,
                isUnique: true,
                isRelation: false,
              },
            ],
          },
        ],
        rawSchema: 'model TestModel { id Int @id }',
        lastModified: '2024-01-01T00:00:00Z',
      }

      expect(validSchema).toHaveProperty('models')
      expect(validSchema).toHaveProperty('rawSchema')
      expect(validSchema).toHaveProperty('lastModified')
      expect(Array.isArray(validSchema.models)).toBe(true)
      expect(validSchema.models[0]).toHaveProperty('name')
      expect(validSchema.models[0]).toHaveProperty('fields')
      expect(Array.isArray(validSchema.models[0].fields)).toBe(true)
    })

    it('should enforce correct SchemaResponse structure', () => {
      const validResponse: SchemaResponse = {
        success: true,
        data: {
          models: [],
          rawSchema: '',
          lastModified: '2024-01-01T00:00:00Z',
        },
      }

      expect(validResponse).toHaveProperty('success')
      expect(validResponse).toHaveProperty('data')
      expect(typeof validResponse.success).toBe('boolean')
    })

    it('should handle error response structure', () => {
      const errorResponse: SchemaResponse = {
        success: false,
        error: 'Test error',
        details: 'Test details',
      }

      expect(errorResponse).toHaveProperty('success')
      expect(errorResponse).toHaveProperty('error')
      expect(errorResponse).toHaveProperty('details')
      expect(errorResponse.success).toBe(false)
      expect(typeof errorResponse.error).toBe('string')
      expect(typeof errorResponse.details).toBe('string')
    })

    it('should handle field relation properties', () => {
      const relationField = {
        name: 'userId',
        type: 'Int',
        isRequired: true,
        isId: false,
        isUnique: false,
        isRelation: true,
        relationType: 'many-to-one',
        relationTarget: 'User',
      }

      expect(relationField).toHaveProperty('isRelation')
      expect(relationField).toHaveProperty('relationType')
      expect(relationField).toHaveProperty('relationTarget')
      expect(relationField.isRelation).toBe(true)
      expect(typeof relationField.relationType).toBe('string')
      expect(typeof relationField.relationTarget).toBe('string')
    })

    it('should handle non-relation field properties', () => {
      const nonRelationField = {
        name: 'name',
        type: 'String',
        isRequired: true,
        isId: false,
        isUnique: false,
        isRelation: false,
      }

      expect(nonRelationField).toHaveProperty('isRelation')
      expect(nonRelationField.isRelation).toBe(false)
      expect(nonRelationField).not.toHaveProperty('relationType')
      expect(nonRelationField).not.toHaveProperty('relationTarget')
    })
  })
}) 