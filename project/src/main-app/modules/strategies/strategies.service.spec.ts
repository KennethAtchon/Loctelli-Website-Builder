import { Test, TestingModule } from '@nestjs/testing';
import { StrategiesService } from './strategies.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { PromptTemplatesService } from '../prompt-templates/prompt-templates.service';
import { NotFoundException } from '@nestjs/common';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

describe('StrategiesService', () => {
  let service: StrategiesService;
  let prismaService: PrismaService;
  let promptTemplatesService: PromptTemplatesService;

  const mockPrismaService = {
    strategy: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const mockPromptTemplatesService = {
    getActive: jest.fn(),
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StrategiesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: PromptTemplatesService,
          useValue: mockPromptTemplatesService,
        },
      ],
    }).compile();

    service = module.get<StrategiesService>(StrategiesService);
    prismaService = module.get<PrismaService>(PrismaService);
    promptTemplatesService = module.get<PromptTemplatesService>(PromptTemplatesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createStrategyDto: CreateStrategyDto = {
      userId: 1,
      name: 'New Strategy',
      promptTemplateId: 1,
    };

    const mockCreatedStrategy = {
      id: 3,
      ...createStrategyDto,
    };

    it('should create and return a strategy with provided promptTemplateId', async () => {
      mockPrismaService.strategy.create.mockResolvedValue(mockCreatedStrategy);

      const result = await service.create(createStrategyDto, 1);
      expect(result).toEqual(mockCreatedStrategy);
      expect(prismaService.strategy.create).toHaveBeenCalledWith({
        data: {
          ...createStrategyDto,
          promptTemplateId: 1,
          subAccountId: 1,
        },
      });
    });

    it('should create strategy with active prompt template when promptTemplateId not provided', async () => {
      const createStrategyDtoWithoutTemplate = { ...createStrategyDto };
      delete createStrategyDtoWithoutTemplate.promptTemplateId;

      const activeTemplate = { id: 2, name: 'Active Template' };
      mockPromptTemplatesService.getActive.mockResolvedValue(activeTemplate);
      mockPrismaService.strategy.create.mockResolvedValue({
        ...mockCreatedStrategy,
        promptTemplateId: 2,
      });

      const result = await service.create(createStrategyDtoWithoutTemplate, 1);
      expect(result).toEqual({
        ...mockCreatedStrategy,
        promptTemplateId: 2,
      });
      expect(promptTemplatesService.getActive).toHaveBeenCalled();
      expect(prismaService.strategy.create).toHaveBeenCalledWith({
        data: {
          ...createStrategyDtoWithoutTemplate,
          promptTemplateId: 2,
          subAccountId: 1,
        },
      });
    });

    it('should create strategy with first available template when no active template exists', async () => {
      const createStrategyDtoWithoutTemplate = { ...createStrategyDto };
      delete createStrategyDtoWithoutTemplate.promptTemplateId;

      const availableTemplates = [
        { id: 3, name: 'Template 1' },
        { id: 4, name: 'Template 2' },
      ];
      mockPromptTemplatesService.getActive.mockRejectedValue(new Error('No active template'));
      mockPromptTemplatesService.findAll.mockResolvedValue(availableTemplates);
      mockPrismaService.strategy.create.mockResolvedValue({
        ...mockCreatedStrategy,
        promptTemplateId: 3,
      });

      const result = await service.create(createStrategyDtoWithoutTemplate, 1);
      expect(result).toEqual({
        ...mockCreatedStrategy,
        promptTemplateId: 3,
      });
      expect(promptTemplatesService.getActive).toHaveBeenCalled();
      expect(promptTemplatesService.findAll).toHaveBeenCalled();
      expect(prismaService.strategy.create).toHaveBeenCalledWith({
        data: {
          ...createStrategyDtoWithoutTemplate,
          promptTemplateId: 3,
          subAccountId: 1,
        },
      });
    });

    it('should throw error when no prompt templates are available', async () => {
      const createStrategyDtoWithoutTemplate = { ...createStrategyDto };
      delete createStrategyDtoWithoutTemplate.promptTemplateId;

      mockPromptTemplatesService.getActive.mockRejectedValue(new Error('No active template'));
      mockPromptTemplatesService.findAll.mockResolvedValue([]);

      await expect(service.create(createStrategyDtoWithoutTemplate, 1)).rejects.toThrow(
        'No prompt templates available. Please create a prompt template first.'
      );
    });
  });

  describe('findAll', () => {
    const mockStrategies = [
      { id: 1, name: 'Strategy 1', description: 'Description 1' },
      { id: 2, name: 'Strategy 2', description: 'Description 2' },
    ];

    it('should return an array of strategies', async () => {
      mockPrismaService.strategy.findMany.mockResolvedValue(mockStrategies);

      const result = await service.findAll();
      expect(result).toEqual(mockStrategies);
      expect(prismaService.strategy.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
          leads: true,
        },
      });
    });
  });

  describe('findOne', () => {
    const mockStrategy = {
      id: 1,
      name: 'Strategy 1',
      description: 'Description 1',
      user: { id: 1, name: 'User 1' },
      leads: [],
    };

    it('should return a strategy if it exists', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);

      const result = await service.findOne(1, 1, 'user');
      expect(result).toEqual(mockStrategy);
      expect(prismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          user: true,
          leads: true,
        },
      });
    });

    it('should throw NotFoundException if strategy does not exist', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, 1, 'user')).rejects.toThrow(NotFoundException);
      expect(prismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: {
          user: true,
          leads: true,
        },
      });
    });
  });

  describe('findByUserId', () => {
    const mockStrategies = [
      { id: 1, name: 'Strategy 1', userId: 1 },
      { id: 2, name: 'Strategy 2', userId: 1 },
    ];

    it('should return strategies for a specific user', async () => {
      mockPrismaService.strategy.findMany.mockResolvedValue(mockStrategies);

      const result = await service.findByUserId(1);
      expect(result).toEqual(mockStrategies);
      expect(prismaService.strategy.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          leads: true,
        },
      });
    });
  });

  describe('update', () => {
    const updateStrategyDto: UpdateStrategyDto = { name: 'Updated Strategy' };
    const mockStrategy = { id: 1, name: 'Strategy 1', description: 'Description 1' };
    const mockUpdatedStrategy = { id: 1, name: 'Updated Strategy', description: 'Description 1' };

    it('should update and return a strategy if it exists', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.strategy.update.mockResolvedValue(mockUpdatedStrategy);

      const result = await service.update(1, updateStrategyDto, 1, 'user');
      expect(result).toEqual(mockUpdatedStrategy);
      expect(prismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.strategy.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateStrategyDto,
      });
    });

    it('should throw NotFoundException if strategy does not exist', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateStrategyDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if update fails', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.strategy.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(1, updateStrategyDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockStrategy = { id: 1, name: 'Strategy 1', description: 'Description 1' };
    const mockDeletedStrategy = { id: 1, name: 'Strategy 1', description: 'Description 1' };

    it('should delete and return a strategy if it exists', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.strategy.delete.mockResolvedValue(mockDeletedStrategy);

      const result = await service.remove(1, 1, 'user');
      expect(result).toEqual(mockDeletedStrategy);
      expect(prismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.strategy.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should throw NotFoundException if strategy does not exist', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if delete fails', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.strategy.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.remove(1, 1, 'user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('duplicate', () => {
    const mockOriginalStrategy = {
      id: 1,
      name: 'Original Strategy',
      userId: 1,
      tag: 'sales',
      tone: 'professional',
      aiInstructions: 'Be helpful',
      objectionHandling: 'Address concerns',
      qualificationPriority: 'budget',
      creativity: 5,
      aiObjective: 'Convert leads',
      disqualificationCriteria: 'No budget',
      exampleConversation: { messages: [] },
      delayMin: 1,
      delayMax: 5,
      promptTemplateId: 1,
    };

    const mockDuplicatedStrategy = {
      id: 2,
      name: 'Original Strategy (Copy)',
      userId: 1,
      promptTemplateId: 1,
    };

    it('should duplicate a strategy successfully', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockOriginalStrategy);
      mockPrismaService.strategy.create.mockResolvedValue(mockDuplicatedStrategy);

      const result = await service.duplicate(1, 1, 'user');
      expect(result).toEqual(mockDuplicatedStrategy);
      expect(prismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.strategy.create).toHaveBeenCalledWith({
        data: {
          name: 'Original Strategy (Copy)',
          userId: 1,
          tag: 'sales',
          tone: 'professional',
          aiInstructions: 'Be helpful',
          objectionHandling: 'Address concerns',
          qualificationPriority: 'budget',
          creativity: 5,
          aiObjective: 'Convert leads',
          disqualificationCriteria: 'No budget',
          exampleConversation: { messages: [] },
          delayMin: 1,
          delayMax: 5,
          promptTemplateId: 1,
        },
      });
    });

    it('should throw NotFoundException if strategy does not exist', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      await expect(service.duplicate(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should handle strategy with minimal fields', async () => {
      const minimalStrategy = {
        id: 1,
        name: 'Minimal Strategy',
        userId: 1,
        promptTemplateId: 1,
      };

      mockPrismaService.strategy.findUnique.mockResolvedValue(minimalStrategy);
      mockPrismaService.strategy.create.mockResolvedValue({
        ...minimalStrategy,
        id: 2,
        name: 'Minimal Strategy (Copy)',
      });

      const result = await service.duplicate(1, 1, 'user');
      expect(result.name).toBe('Minimal Strategy (Copy)');
      expect(prismaService.strategy.create).toHaveBeenCalledWith({
        data: {
          name: 'Minimal Strategy (Copy)',
          userId: 1,
          promptTemplateId: 1,
        },
      });
    });
  });
});
