import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { CreateIntegrationTemplateDto } from './dto/create-integration-template.dto';
import { UpdateIntegrationTemplateDto } from './dto/update-integration-template.dto';

@Injectable()
export class IntegrationTemplatesService {
  private readonly logger = new Logger(IntegrationTemplatesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    this.logger.debug('Finding all integration templates');
    const templates = await this.prisma.integrationTemplate.findMany({
      include: {
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Add integration count for each template
    const templatesWithCount = await Promise.all(
      templates.map(async (template) => {
        const integrationCount = await this.prisma.integration.count({
          where: { integrationTemplateId: template.id },
        });
        return {
          ...template,
          integrationCount,
        };
      })
    );

    return templatesWithCount;
  }

  async findOne(id: number) {
    this.logger.debug(`Finding integration template with id: ${id}`);
    const template = await this.prisma.integrationTemplate.findUnique({
      where: { id },
      include: {
        createdByAdmin: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Integration template with ID ${id} not found`);
    }

    return template;
  }

  async create(createDto: CreateIntegrationTemplateDto, adminId: number) {
    this.logger.debug(`Creating integration template: ${createDto.name} with adminId: ${adminId}`);

    try {
      const result = await this.prisma.integrationTemplate.create({
        data: {
          ...createDto,
          createdByAdminId: adminId,
        },
        include: {
          createdByAdmin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.debug(`Successfully created integration template with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create integration template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateDto: UpdateIntegrationTemplateDto) {
    this.logger.debug(`Updating integration template with id: ${id}`);

    try {
      // Check if template exists
      await this.findOne(id);

      const result = await this.prisma.integrationTemplate.update({
        where: { id },
        data: updateDto,
        include: {
          createdByAdmin: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      this.logger.debug(`Successfully updated integration template with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update integration template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: number) {
    this.logger.debug(`Deleting integration template with id: ${id}`);

    const template = await this.findOne(id);

    // Check if template is being used by any integrations
    const integrationCount = await this.prisma.integration.count({
      where: { integrationTemplateId: id },
    });

    if (integrationCount > 0) {
      throw new Error(`Cannot delete template: ${integrationCount} integrations are using this template`);
    }

    return this.prisma.integrationTemplate.delete({
      where: { id },
    });
  }

  async findByCategory(category: string) {
    this.logger.debug(`Finding integration templates by category: ${category}`);
    return this.prisma.integrationTemplate.findMany({
      where: { 
        category,
        isActive: true 
      },
      orderBy: {
        displayName: 'asc',
      },
    });
  }

  async findActive() {
    this.logger.debug('Finding all active integration templates');
    return this.prisma.integrationTemplate.findMany({
      where: { isActive: true },
      orderBy: [
        { category: 'asc' },
        { displayName: 'asc' },
      ],
    });
  }
} 