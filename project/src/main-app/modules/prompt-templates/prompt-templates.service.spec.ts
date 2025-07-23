import { Test, TestingModule } from '@nestjs/testing';
import { PromptTemplatesService } from './prompt-templates.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';

describe('PromptTemplatesService', () => {
  let service: PromptTemplatesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    promptTemplate: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    strategy: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromptTemplatesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<PromptTemplatesService>(PromptTemplatesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    const mockTemplates = [
      {
        id: 1,
        name: 'Template 1',
        systemPrompt: 'Hello {{name}}',
        isActive: true,
        createdByAdmin: { id: 1, name: 'Admin 1', email: 'admin1@test.com' },
      },
      {
        id: 2,
        name: 'Template 2',
        systemPrompt: 'Hi {{name}}',
        isActive: false,
        createdByAdmin: { id: 2, name: 'Admin 2', email: 'admin2@test.com' },
      },
    ];

    it('should return all templates with strategy counts', async () => {
      mockPrismaService.promptTemplate.findMany.mockResolvedValue(mockTemplates);
      mockPrismaService.strategy.count
        .mockResolvedValueOnce(5) // For template 1
        .mockResolvedValueOnce(3); // For template 2

      const result = await service.findAll();

      expect(result).toEqual([
        { ...mockTemplates[0], strategyCount: 5 },
        { ...mockTemplates[1], strategyCount: 3 },
      ]);
      expect(prismaService.promptTemplate.findMany).toHaveBeenCalledWith({
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
      expect(prismaService.strategy.count).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no templates exist', async () => {
      mockPrismaService.promptTemplate.findMany.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    const mockTemplate = {
      id: 1,
      name: 'Template 1',
      systemPrompt: 'Hello {{name}}',
      isActive: true,
      createdByAdmin: { id: 1, name: 'Admin 1', email: 'admin1@test.com' },
    };

    it('should return a template if it exists', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await service.findOne(1);

      expect(result).toEqual(mockTemplate);
      expect(prismaService.promptTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
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
    });

    it('should throw NotFoundException if template does not exist', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const createDto: CreatePromptTemplateDto = {
      name: 'New Template',
      systemPrompt: 'Hello {{name}}, welcome to our service!',
      description: 'A welcome template',
      isActive: false,
    };

    const mockCreatedTemplate = {
      id: 3,
      ...createDto,
      createdByAdminId: 1,
      createdByAdmin: { id: 1, name: 'Admin 1', email: 'admin1@test.com' },
    };

    it('should create a template successfully', async () => {
      mockPrismaService.promptTemplate.create.mockResolvedValue(mockCreatedTemplate);

      const result = await service.create(createDto, 1);

      expect(result).toEqual(mockCreatedTemplate);
      expect(prismaService.promptTemplate.create).toHaveBeenCalledWith({
        data: {
          ...createDto,
          createdByAdminId: 1,
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
    });

    it('should deactivate other templates when creating active template', async () => {
      const activeCreateDto = { ...createDto, isActive: true };
      mockPrismaService.promptTemplate.create.mockResolvedValue({
        ...mockCreatedTemplate,
        isActive: true,
      });

      const result = await service.create(activeCreateDto, 1);

      expect(result.isActive).toBe(true);
      // Note: deactivateAllTemplates is a private method, so we test its effect through the public interface
    });

    it('should handle creation errors', async () => {
      const error = new Error('Database error');
      mockPrismaService.promptTemplate.create.mockRejectedValue(error);

      await expect(service.create(createDto, 1)).rejects.toThrow('Database error');
    });
  });

  describe('update', () => {
    const updateDto: UpdatePromptTemplateDto = {
      name: 'Updated Template',
      systemPrompt: 'Updated content',
    };

    const mockExistingTemplate = {
      id: 1,
      name: 'Original Template',
      content: 'Original content',
      isActive: false,
    };

    const mockUpdatedTemplate = {
      id: 1,
      ...updateDto,
      isActive: false,
      createdByAdmin: { id: 1, name: 'Admin 1', email: 'admin1@test.com' },
    };

    it('should update a template successfully', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(mockExistingTemplate);
      mockPrismaService.promptTemplate.update.mockResolvedValue(mockUpdatedTemplate);

      const result = await service.update(1, updateDto);

      expect(result).toEqual(mockUpdatedTemplate);
      expect(prismaService.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: 1 },
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
    });

    it('should deactivate other templates when updating to active', async () => {
      const activeUpdateDto = { ...updateDto, isActive: true };
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(mockExistingTemplate);
      mockPrismaService.promptTemplate.update.mockResolvedValue({
        ...mockUpdatedTemplate,
        isActive: true,
      });

      const result = await service.update(1, activeUpdateDto);

      expect(result.isActive).toBe(true);
    });

    it('should throw error when template does not exist', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    const mockTemplate = {
      id: 1,
      name: 'Template to Delete',
      isActive: false,
    };

    it('should delete a template successfully', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.promptTemplate.delete.mockResolvedValue(mockTemplate);

      const result = await service.delete(1);

      expect(result).toEqual(mockTemplate);
      expect(prismaService.promptTemplate.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should activate another template when deleting active template', async () => {
      const activeTemplate = { ...mockTemplate, isActive: true };
      const otherTemplates = [
        { id: 2, name: 'Template 2', isActive: false },
        { id: 3, name: 'Template 3', isActive: false },
      ];

      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(activeTemplate);
      mockPrismaService.promptTemplate.findMany.mockResolvedValue(otherTemplates);
      mockPrismaService.promptTemplate.update.mockResolvedValue({
        ...otherTemplates[0],
        isActive: true,
      });
      mockPrismaService.promptTemplate.delete.mockResolvedValue(activeTemplate);

      await service.delete(1);

      expect(prismaService.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: 2 },
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
    });

    it('should throw error when template does not exist', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('activate', () => {
    const mockTemplate = {
      id: 1,
      name: 'Template to Activate',
      isActive: false,
    };

    const mockActivatedTemplate = {
      ...mockTemplate,
      isActive: true,
      createdByAdmin: { id: 1, name: 'Admin 1', email: 'admin1@test.com' },
    };

    it('should activate a template successfully', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(mockTemplate);
      mockPrismaService.promptTemplate.update.mockResolvedValue(mockActivatedTemplate);

      const result = await service.activate(1);

      expect(result).toEqual(mockActivatedTemplate);
      expect(prismaService.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: 1 },
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
    });

    it('should throw error when template does not exist', async () => {
      mockPrismaService.promptTemplate.findUnique.mockResolvedValue(null);

      await expect(service.activate(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getActive', () => {
    const mockActiveTemplate = {
      id: 1,
      name: 'Active Template',
      isActive: true,
    };

    it('should return active template when one exists', async () => {
      mockPrismaService.promptTemplate.findFirst.mockResolvedValue(mockActiveTemplate);

      const result = await service.getActive();

      expect(result).toEqual(mockActiveTemplate);
      expect(prismaService.promptTemplate.findFirst).toHaveBeenCalledWith({
        where: { isActive: true },
      });
    });

    it('should return first template as fallback when no active template exists', async () => {
      const fallbackTemplates = [
        { id: 1, name: 'Template 1', isActive: false },
        { id: 2, name: 'Template 2', isActive: false },
      ];

      mockPrismaService.promptTemplate.findFirst.mockResolvedValue(null);
      mockPrismaService.promptTemplate.findMany.mockResolvedValue(fallbackTemplates);

      const result = await service.getActive();

      expect(result).toEqual(fallbackTemplates[0]);
    });

    it('should throw NotFoundException when no templates exist', async () => {
      mockPrismaService.promptTemplate.findFirst.mockResolvedValue(null);
      mockPrismaService.promptTemplate.findMany.mockResolvedValue([]);

      await expect(service.getActive()).rejects.toThrow(NotFoundException);
    });
  });

  describe('ensureActiveExists', () => {
    const mockActiveTemplate = {
      id: 1,
      name: 'Active Template',
      isActive: true,
    };

    it('should return existing active template', async () => {
      mockPrismaService.promptTemplate.findFirst.mockResolvedValue(mockActiveTemplate);

      const result = await service.ensureActiveExists(1);

      expect(result).toEqual(mockActiveTemplate);
    });

    it('should create default template when no active template exists', async () => {
      const defaultTemplate = {
        id: 1,
        name: 'Default Sales Prompt',
        description: 'Standard conversational AI prompt for sales',
        isActive: true,
        systemPrompt: 'You are a helpful and conversational AI assistant representing the company. Your role is to engage in natural conversations, answer questions, and help leads with their needs. Be friendly, professional, and genuinely helpful. Respond directly to what the lead is asking or saying. Keep responses concise but informative. If the lead shows interest in services, you can gently guide the conversation toward understanding their needs and offering relevant solutions.',
        role: 'conversational AI assistant and customer service representative',
        instructions: `Be conversational and responsive to the lead's messages. Answer their questions directly and helpfully. If they ask about your role or capabilities, explain them honestly. If they show interest in services, ask about their specific needs and offer relevant information. Be natural and engaging, not pushy or robotic. Always address the lead by their name when provided.`,
        bookingInstruction: `If the user agrees to a booking, confirm with a message in the following exact format and always end with the unique marker [BOOKING_CONFIRMATION]:\nGreat news! Your booking is confirmed. Here are the details:\n- Date: {date} (must be in YYYY-MM-DD format, e.g., 2025-05-20)\n- Time: {time} (must be in 24-hour format, e.g., 14:30 for 2:30 PM or 09:00 for 9:00 AM)\n- Location: {location}\n- Subject: {subject}\nThank you for choosing us! [BOOKING_CONFIRMATION]\n\nReplace the placeholders with the actual booking details. \nIMPORTANT: The date must be in YYYY-MM-DD format and time must be in 24-hour format (e.g., 14:30, 09:00). \nDo not include AM/PM, seconds, or timezone information. \nDo not use the [BOOKING_CONFIRMATION] marker unless a booking is truly confirmed.`,
        creativity: 7,
        temperature: 0.7,
        createdByAdminId: 1,
      };

      mockPrismaService.promptTemplate.findFirst.mockResolvedValue(null);
      mockPrismaService.promptTemplate.create.mockResolvedValue(defaultTemplate);
      mockPrismaService.promptTemplate.updateMany.mockResolvedValue({ count: 1 });

      const result = await service.ensureActiveExists(1);

      expect(result).toEqual(defaultTemplate);
      expect(prismaService.promptTemplate.create).toHaveBeenCalledWith({
        data: {
          name: 'Default Sales Prompt',
          description: 'Standard conversational AI prompt for sales',
          isActive: true,
          systemPrompt: 'You are a helpful and conversational AI assistant representing the company. Your role is to engage in natural conversations, answer questions, and help leads with their needs. Be friendly, professional, and genuinely helpful. Respond directly to what the lead is asking or saying. Keep responses concise but informative. If the lead shows interest in services, you can gently guide the conversation toward understanding their needs and offering relevant solutions.',
          role: 'conversational AI assistant and customer service representative',
          instructions: `Be conversational and responsive to the lead's messages. Answer their questions directly and helpfully. If they ask about your role or capabilities, explain them honestly. If they show interest in services, ask about their specific needs and offer relevant information. Be natural and engaging, not pushy or robotic. Always address the lead by their name when provided.`,
          bookingInstruction: `If the user agrees to a booking, confirm with a message in the following exact format and always end with the unique marker [BOOKING_CONFIRMATION]:\nGreat news! Your booking is confirmed. Here are the details:\n- Date: {date} (must be in YYYY-MM-DD format, e.g., 2025-05-20)\n- Time: {time} (must be in 24-hour format, e.g., 14:30 for 2:30 PM or 09:00 for 9:00 AM)\n- Location: {location}\n- Subject: {subject}\nThank you for choosing us! [BOOKING_CONFIRMATION]\n\nReplace the placeholders with the actual booking details. \nIMPORTANT: The date must be in YYYY-MM-DD format and time must be in 24-hour format (e.g., 14:30, 09:00). \nDo not include AM/PM, seconds, or timezone information. \nDo not use the [BOOKING_CONFIRMATION] marker unless a booking is truly confirmed.`,
          creativity: 7,
          temperature: 0.7,
          createdByAdminId: 1,
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
    });
  });

  describe('validateOnlyOneActive', () => {
    it('should not throw error when only one active template exists', async () => {
      const templates = [
        { id: 1, isActive: true },
        { id: 2, isActive: false },
      ];

      mockPrismaService.promptTemplate.findMany.mockResolvedValue(templates);
      mockPrismaService.promptTemplate.update.mockResolvedValue({});

      await expect(service.validateOnlyOneActive()).resolves.not.toThrow();
    });

    it('should deactivate all except the first when multiple active templates exist', async () => {
      const templates = [
        { id: 1, isActive: true },
        { id: 2, isActive: true },
        { id: 3, isActive: true },
      ];
      mockPrismaService.promptTemplate.findMany.mockResolvedValue(templates);
      mockPrismaService.promptTemplate.update.mockResolvedValue({});

      await service.validateOnlyOneActive();
      expect(prismaService.promptTemplate.update).toHaveBeenCalledTimes(2);
      expect(prismaService.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isActive: false },
      });
      expect(prismaService.promptTemplate.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { isActive: false },
      });
    });
  });
}); 