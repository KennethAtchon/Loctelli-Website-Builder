import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/prisma/prisma.service';
import { CacheService } from '../infrastructure/cache/cache.service';

type Field = {
  name: string;
  type: string;
  isRequired: boolean;
  isId: boolean;
  isUnique: boolean;
  isRelation: boolean;
  relationType: string | null;
  relationTarget: string | null;
};

@Injectable()
export class GeneralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService
  ) {}

  // This service is intentionally empty as the controller methods
  // don't require any complex business logic

  async getDashboardStats(subaccountId?: string) {
    try {
      // Build where clause for subaccount filtering
      const whereClause: any = subaccountId && subaccountId !== 'GLOBAL' 
        ? { subAccountId: parseInt(subaccountId) }
        : {};

      // Get counts from database
      const [
        totalUsers,
        activeUsers,
        totalStrategies,
        totalBookings,
        totalLeads,
        recentUsers
      ] = await Promise.all([
        this.prisma.user.count({ where: whereClause }),
        this.prisma.user.count({ where: { ...whereClause, isActive: true } }),
        this.prisma.strategy.count({ where: whereClause }),
        this.prisma.booking.count({ where: whereClause }),
        this.prisma.lead.count({ where: whereClause }),
        this.prisma.user.findMany({
          where: whereClause,
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            createdAt: true,
            company: true
          }
        })
      ]);

      // Calculate growth rates based on this month vs last month
      const now = new Date();
      const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

      // Users
      const usersThisMonth = await this.prisma.user.count({
        where: { ...whereClause, createdAt: { gte: startOfThisMonth } }
      });
      const usersLastMonth = await this.prisma.user.count({
        where: { ...whereClause, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } }
      });
      const usersGrowth = usersLastMonth === 0
        ? (usersThisMonth > 0 ? 100 : 0)
        : Math.round(((usersThisMonth - usersLastMonth) / usersLastMonth) * 100);

      // Active Users
      const activeUsersThisMonth = await this.prisma.user.count({
        where: { ...whereClause, isActive: true, createdAt: { gte: startOfThisMonth } }
      });
      const activeUsersLastMonth = await this.prisma.user.count({
        where: { ...whereClause, isActive: true, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } }
      });
      const activeUsersGrowth = activeUsersLastMonth === 0
        ? (activeUsersThisMonth > 0 ? 100 : 0)
        : Math.round(((activeUsersThisMonth - activeUsersLastMonth) / activeUsersLastMonth) * 100);

      // Strategies
      const strategiesThisMonth = await this.prisma.strategy.count({
        where: { ...whereClause, createdAt: { gte: startOfThisMonth } }
      });
      const strategiesLastMonth = await this.prisma.strategy.count({
        where: { ...whereClause, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } }
      });
      const strategiesGrowth = strategiesLastMonth === 0
        ? (strategiesThisMonth > 0 ? 100 : 0)
        : Math.round(((strategiesThisMonth - strategiesLastMonth) / strategiesLastMonth) * 100);

      // Bookings
      const bookingsThisMonth = await this.prisma.booking.count({
        where: { ...whereClause, createdAt: { gte: startOfThisMonth } }
      });
      const bookingsLastMonth = await this.prisma.booking.count({
        where: { ...whereClause, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } }
      });
      const bookingsGrowth = bookingsLastMonth === 0
        ? (bookingsThisMonth > 0 ? 100 : 0)
        : Math.round(((bookingsThisMonth - bookingsLastMonth) / bookingsLastMonth) * 100);

      const stats = {
        totalUsers,
        activeUsers,
        totalStrategies,
        totalBookings,
        totalLeads,
        recentUsers,
        growthRates: {
          users: usersGrowth,
          activeUsers: activeUsersGrowth,
          strategies: strategiesGrowth,
          bookings: bookingsGrowth
        }
      };

      return stats;
    } catch (error) {
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }

  async getSystemStatus() {
    try {
      const status = {
        database: 'Healthy',
        apiServer: 'Online',
        redisCache: 'Connected',
        fileStorage: 'Available'
      };

      // Check database connection
      try {
        await this.prisma.$queryRaw`SELECT 1`;
      } catch (error) {
        status.database = 'Error';
      }

      // Check Redis connection
      try {
        const testKey = 'system-status-test';
              await this.cacheService.setCache(testKey, 'test', 1);
      const result = await this.cacheService.getCache(testKey);
        if (result !== 'test') {
          status.redisCache = 'Error';
        }
      } catch (error) {
        status.redisCache = 'Disconnected';
      }

      return status;
    } catch (error) {
      throw new Error(`Failed to check system status: ${error.message}`);
    }
  }

  async getRecentLeads(subaccountId?: string) {
    try {
      const whereClause: any = subaccountId && subaccountId !== 'GLOBAL' 
        ? { subAccountId: parseInt(subaccountId) }
        : {};

      return await this.prisma.lead.findMany({
        where: whereClause,
        take: 5,
        orderBy: {
          id: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          strategy: {
            select: {
              id: true,
              name: true,
              tag: true,
            }
          },
          bookings: {
            select: {
              id: true,
              bookingType: true,
              status: true,
              createdAt: true,
            }
          }
        }
      });
    } catch (error) {
      throw new Error(`Failed to fetch recent leads: ${error.message}`);
    }
  }

  async getDetailedUser(userId: number) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        include: {
          createdByAdmin: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          strategies: {
            select: {
              id: true,
              name: true,
              tag: true,
              tone: true,
            }
          },
          leads: {
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
            }
          },
          bookings: {
            select: {
              id: true,
              bookingType: true,
              status: true,
              createdAt: true,
            }
          }
        }
      });

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      return user;
    } catch (error) {
      throw new Error(`Failed to fetch detailed user: ${error.message}`);
    }
  }

  async getDetailedLead(leadId: number) {
    try {
      const lead = await this.prisma.lead.findUnique({
        where: { id: leadId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
          strategy: {
            select: {
              id: true,
              name: true,
              tag: true,
            }
          },
          bookings: {
            select: {
              id: true,
              bookingType: true,
              status: true,
              createdAt: true,
            }
          }
        }
      });

      if (!lead) {
        throw new Error(`Lead with ID ${leadId} not found`);
      }

      return lead;
    } catch (error) {
      throw new Error(`Failed to fetch detailed lead: ${error.message}`);
    }
  }

  async getDatabaseSchema() {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
      const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
      
      // Parse the schema to extract model information
      const models: any[] = [];
      const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
      let match: RegExpExecArray | null;

      // First pass: collect all model names
      const modelNames: string[] = [];
      while ((match = modelRegex.exec(schemaContent)) !== null) {
        modelNames.push(match[1]);
      }

      // Second pass: parse fields and relations
      modelRegex.lastIndex = 0;
      while ((match = modelRegex.exec(schemaContent)) !== null) {
        const modelName = match[1];
        const modelContent = match[2];
        const fields = this.parseModelFields(modelContent, modelNames);
        models.push({
          name: modelName,
          fields
        });
      }
      return {
        success: true,
        data: {
          models,
          rawSchema: schemaContent,
          lastModified: fs.statSync(schemaPath).mtime
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to read database schema',
        details: error.message
      };
    }
  }

  private parseModelFields(modelContent: string, modelNames: string[]): Field[] {
    let fields: any[] = [];
    const lines = modelContent.split('\n');
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || trimmedLine.startsWith('//')) {
        continue;
      }
      // Match: name type? attributes
      const fieldMatch = trimmedLine.match(/^(\w+)\s+(\w+(?:\[\])?)\s*(\?)?\s*(.*)$/);
      if (fieldMatch) {
        const name: string = fieldMatch[1];
        const type: string = fieldMatch[2];
        const optional: string | undefined = fieldMatch[3];
        const attributes: string = fieldMatch[4];
        // Detect if this is a relation field (type is a model name or model name[])
        const isRelation = modelNames.includes(type.replace('[]', ''));
        let relationType: string | null = null;
        let relationTarget: string | null = null;
        if (isRelation) {
          relationTarget = type.replace('[]', '');
          relationType = type.endsWith('[]') ? 'one-to-many' : 'many-to-one';
        }
        fields.push({
          name,
          type: type.replace('[]', ''),
          isRequired: !optional,
          isId: attributes.includes('@id'),
          isUnique: attributes.includes('@unique'),
          isRelation,
          relationType,
          relationTarget
        });
      }
    }
    return fields;
  }
}
