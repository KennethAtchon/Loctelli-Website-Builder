import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';

@Injectable()
export class PromptTemplatesService {
  private readonly logger = new Logger(PromptTemplatesService.name);

  constructor(private prisma: PrismaService) {}

  async findAll() {
    this.logger.debug('Finding all prompt templates');
    const templates = await this.prisma.promptTemplate.findMany({
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

    // Add strategy count for each template
    const templatesWithCount = await Promise.all(
      templates.map(async (template) => {
        const strategyCount = await this.prisma.strategy.count({
          where: { promptTemplateId: template.id },
        });
        return {
          ...template,
          strategyCount,
        };
      })
    );

    return templatesWithCount;
  }

  async findOne(id: number) {
    this.logger.debug(`Finding prompt template with id: ${id}`);
    const template = await this.prisma.promptTemplate.findUnique({
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
      throw new NotFoundException(`Prompt template with ID ${id} not found`);
    }

    return template;
  }

  async create(createDto: CreatePromptTemplateDto, adminId: number) {
    this.logger.debug(`Creating prompt template: ${createDto.name} with adminId: ${adminId}`);

    try {
      // If this template is being set as active, deactivate all others
      if (createDto.isActive) {
        await this.deactivateAllTemplates();
      }

      const result = await this.prisma.promptTemplate.create({
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

      this.logger.debug(`Successfully created prompt template with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to create prompt template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async update(id: number, updateDto: UpdatePromptTemplateDto) {
    this.logger.debug(`Updating prompt template with id: ${id}`);

    try {
      // Check if template exists
      const existingTemplate = await this.findOne(id);

      // If this template is being set as active, deactivate all others
      if (updateDto.isActive) {
        await this.deactivateAllTemplates();
      }

      const result = await this.prisma.promptTemplate.update({
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

      this.logger.debug(`Successfully updated prompt template with ID: ${result.id}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to update prompt template: ${error.message}`, error.stack);
      throw error;
    }
  }

  async delete(id: number) {
    this.logger.debug(`Deleting prompt template with id: ${id}`);

    const template = await this.findOne(id);

    // If deleting active template, activate the first available template
    if (template.isActive) {
      const templates = await this.findAll();
      const otherTemplates = templates.filter(t => t.id !== id);
      if (otherTemplates.length > 0) {
        await this.activate(otherTemplates[0].id);
      }
    }

    return this.prisma.promptTemplate.delete({
      where: { id },
    });
  }

  async activate(id: number) {
    this.logger.debug(`Activating prompt template with id: ${id}`);

    // Check if template exists
    await this.findOne(id);

    // Deactivate all templates first
    await this.deactivateAllTemplates();

    // Activate the specified template
    return this.prisma.promptTemplate.update({
      where: { id },
      data: { isActive: true },
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
  }

  async getActive() {
    this.logger.debug('Getting active prompt template');
    const activeTemplate = await this.prisma.promptTemplate.findFirst({
      where: { isActive: true },
    });

    if (!activeTemplate) {
      // If no active template, get the first available template as fallback
      const templates = await this.findAll();
      if (templates.length > 0) {
        return templates[0];
      }
      throw new NotFoundException('No prompt templates found');
    }

    return activeTemplate;
  }

  async ensureActiveExists(adminId: number) {
    this.logger.debug('Ensuring active prompt template exists');
    
    const activeTemplate = await this.prisma.promptTemplate.findFirst({
      where: { isActive: true },
    });
    
    if (!activeTemplate) {
      this.logger.log('Creating active prompt template');
      return this.create({
        name: 'Default Sales Prompt',
        description: 'Standard conversational AI prompt for sales',
        isActive: true,
        systemPrompt: 'You are a helpful and conversational AI assistant representing the company. Your role is to engage in natural conversations, answer questions, and help leads with their needs. Be friendly, professional, and genuinely helpful. Respond directly to what the lead is asking or saying. Keep responses concise but informative. If the lead shows interest in services, you can gently guide the conversation toward understanding their needs and offering relevant solutions.',
        role: 'conversational AI assistant and customer service representative',
        instructions: 'Be conversational and responsive to the lead\'s messages. Answer their questions directly and helpfully. If they ask about your role or capabilities, explain them honestly. If they show interest in services, ask about their specific needs and offer relevant information. Be natural and engaging, not pushy or robotic. Always address the lead by their name when provided.',
        bookingInstruction: `If the user agrees to a booking, confirm with a message in the following exact format and always end with the unique marker [BOOKING_CONFIRMATION]:
Great news! Your booking is confirmed. Here are the details:
- Date: {date} (must be in YYYY-MM-DD format, e.g., 2025-05-20)
- Time: {time} (must be in 24-hour format, e.g., 14:30 for 2:30 PM or 09:00 for 9:00 AM)
- Location: {location}
- Subject: {subject}
Thank you for choosing us! [BOOKING_CONFIRMATION]

Replace the placeholders with the actual booking details. 
IMPORTANT: The date must be in YYYY-MM-DD format and time must be in 24-hour format (e.g., 14:30, 09:00). 
Do not include AM/PM, seconds, or timezone information. 
Do not use the [BOOKING_CONFIRMATION] marker unless a booking is truly confirmed.`,
        creativity: 7,
        temperature: 0.7,
      }, adminId);
    }
    
    return activeTemplate;
  }

  private async deactivateAllTemplates() {
    this.logger.debug('Deactivating all prompt templates');
    await this.prisma.promptTemplate.updateMany({
      data: { isActive: false },
    });
  }



  async validateOnlyOneActive() {
    this.logger.debug('Validating only one template is active');
    const activeTemplates = await this.prisma.promptTemplate.findMany({
      where: { isActive: true },
    });

    if (activeTemplates.length > 1) {
      this.logger.warn(`Found ${activeTemplates.length} active templates, deactivating all except the first`);
      // Keep only the first one active
      for (let i = 1; i < activeTemplates.length; i++) {
        await this.prisma.promptTemplate.update({
          where: { id: activeTemplates[i].id },
          data: { isActive: false },
        });
      }
    }
  }
} 