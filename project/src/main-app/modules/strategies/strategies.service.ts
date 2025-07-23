import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';

@Injectable()
export class StrategiesService {
  constructor(
    private prisma: PrismaService,
    private promptTemplatesService: PromptTemplatesService
  ) {}

  async create(createStrategyDto: CreateStrategyDto, subAccountId: number) {
    // If no promptTemplateId is provided, get the active template as fallback
    if (!createStrategyDto.promptTemplateId) {
      try {
        const activeTemplate = await this.promptTemplatesService.getActive();
        createStrategyDto.promptTemplateId = activeTemplate.id;
      } catch (error) {
        // If no active template exists, get the first available template
        const templates = await this.promptTemplatesService.findAll();
        if (templates.length > 0) {
          createStrategyDto.promptTemplateId = templates[0].id;
        } else {
          throw new Error('No prompt templates available. Please create a prompt template first.');
        }
      }
    }

    // Ensure promptTemplateId is set before creating
    const strategyData = {
      ...createStrategyDto,
      promptTemplateId: createStrategyDto.promptTemplateId!,
      subAccountId, // Add SubAccount context
    };

    return this.prisma.strategy.create({
      data: strategyData,
    });
  }

  async findAll() {
    return this.prisma.strategy.findMany({
      include: {
        user: true,
        leads: true,
      },
    });
  }

  async findAllBySubAccount(subAccountId: number) {
    return this.prisma.strategy.findMany({
      where: { subAccountId },
      include: {
        user: true,
        leads: true,
      },
    });
  }

  async findAllByUser(userId: number) {
    return this.prisma.strategy.findMany({
      where: { userId },
      include: {
        leads: true,
      },
    });
  }

  async findAllByAdmin(adminId: number) {
    // All admins can see all strategies
    return this.prisma.strategy.findMany({
      include: {
        user: true,
        leads: true,
        subAccount: {
          select: { id: true, name: true }
        }
      },
    });
  }

  async findOne(id: number, userId: number, userRole: string) {
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
      include: {
        user: true,
        leads: true,
      },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    return strategy;
  }

  async findByUserId(userId: number) {
    return this.prisma.strategy.findMany({
      where: { userId },
      include: {
        leads: true,
      },
    });
  }

  async update(id: number, updateStrategyDto: UpdateStrategyDto, userId: number, userRole: string) {
    // Check if strategy exists
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    try {
      return await this.prisma.strategy.update({
        where: { id },
        data: updateStrategyDto,
      });
    } catch (error) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }
  }

  async remove(id: number, userId: number, userRole: string) {
    // Check if strategy exists
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    try {
      return await this.prisma.strategy.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }
  }

  async duplicate(id: number, userId: number, userRole: string) {
    // Check if strategy exists
    const strategy = await this.prisma.strategy.findUnique({
      where: { id },
    });

    if (!strategy) {
      throw new NotFoundException(`Strategy with ID ${id} not found`);
    }

    // Create a duplicate strategy with "(Copy)" suffix
    const duplicateData: CreateStrategyDto = {
      name: `${strategy.name} (Copy)`,
      userId: strategy.userId, // Keep the same user assignment
      tag: strategy.tag || undefined,
      tone: strategy.tone || undefined,
      aiInstructions: strategy.aiInstructions || undefined,
      objectionHandling: strategy.objectionHandling || undefined,
      qualificationPriority: strategy.qualificationPriority || undefined,
      creativity: strategy.creativity || undefined,
      aiObjective: strategy.aiObjective || undefined,
      disqualificationCriteria: strategy.disqualificationCriteria || undefined,
      exampleConversation: strategy.exampleConversation || undefined,
      delayMin: strategy.delayMin || undefined,
      delayMax: strategy.delayMax || undefined,
      promptTemplateId: strategy.promptTemplateId,
    };

    // Ensure promptTemplateId is set and include SubAccount context
    const strategyData = {
      ...duplicateData,
      promptTemplateId: duplicateData.promptTemplateId!,
      subAccountId: strategy.subAccountId, // Keep the same SubAccount
    };

    return this.prisma.strategy.create({
      data: strategyData,
    });
  }
}
