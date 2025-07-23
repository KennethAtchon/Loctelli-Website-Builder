import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { SalesBotService } from './sales-bot.service';
import { NotFoundException } from '@nestjs/common';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SendMessageDto } from './dto/send-message.dto';

describe('ChatService', () => {
  let service: ChatService;
  let prismaService: PrismaService;
  let salesBotService: SalesBotService;

  const mockPrismaService = {
    lead: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockSalesBotService = {
    generateResponse: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SalesBotService,
          useValue: mockSalesBotService,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
    salesBotService = module.get<SalesBotService>(SalesBotService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    const chatMessageDto: ChatMessageDto = {
      leadId: 1,
      content: 'Hello, I need help',
      role: 'user',
      metadata: { source: 'web' },
    };

    const mockLead = {
      id: 1,
      messageHistory: JSON.stringify([
        { role: 'user', content: 'Previous message', timestamp: '2023-01-01T00:00:00Z' },
      ]),
      strategyId: 1,
      userId: 1,
    };

    const mockUpdatedLead = {
      id: 1,
      user: { id: 1, name: 'User 1' },
      strategy: { id: 1, name: 'Strategy 1' },
    };

    const mockAiResponse = 'Thank you for your message. How can I help you today?';

    it('should send a message and return response with AI reply', async () => {
      mockPrismaService.lead.findUnique
        .mockResolvedValueOnce(mockLead) // First call for lead lookup
        .mockResolvedValueOnce(mockUpdatedLead); // Second call for updated lead
      mockSalesBotService.generateResponse.mockResolvedValue(mockAiResponse);

      const result = await service.sendMessage(chatMessageDto);

      expect(result).toEqual({
        userMessage: {
          content: 'Hello, I need help',
          role: 'user',
          timestamp: expect.any(String),
          metadata: { source: 'web' },
        },
        aiMessage: {
          content: mockAiResponse,
          role: 'assistant',
          timestamp: expect.any(String),
          metadata: { generated: true },
        },
        lead: mockUpdatedLead,
      });

      expect(prismaService.lead.findUnique).toHaveBeenCalledTimes(2);
      expect(salesBotService.generateResponse).toHaveBeenCalledWith(
        'Hello, I need help',
        1
      );
    });

    it('should use default role when not provided', async () => {
      const chatMessageDtoWithoutRole = { ...chatMessageDto };
      delete chatMessageDtoWithoutRole.role;

      mockPrismaService.lead.findUnique
        .mockResolvedValueOnce(mockLead)
        .mockResolvedValueOnce(mockUpdatedLead);
      mockSalesBotService.generateResponse.mockResolvedValue(mockAiResponse);

      const result = await service.sendMessage(chatMessageDtoWithoutRole);

      expect(result.userMessage.role).toBe('user');
    });

    it('should handle empty metadata', async () => {
      const chatMessageDtoWithoutMetadata = { ...chatMessageDto };
      delete chatMessageDtoWithoutMetadata.metadata;

      mockPrismaService.lead.findUnique
        .mockResolvedValueOnce(mockLead)
        .mockResolvedValueOnce(mockUpdatedLead);
      mockSalesBotService.generateResponse.mockResolvedValue(mockAiResponse);

      const result = await service.sendMessage(chatMessageDtoWithoutMetadata);

      expect(result.userMessage.metadata).toEqual({});
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.sendMessage(chatMessageDto)).rejects.toThrow(NotFoundException);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { id: true, messageHistory: true, strategyId: true, userId: true },
      });
    });
  });

  describe('getMessageHistory', () => {
    it('should return parsed message history', async () => {
      const mockHistory = [
        { role: 'user', content: 'Hello', timestamp: '2023-01-01T00:00:00Z' },
        { role: 'assistant', content: 'Hi there!', timestamp: '2023-01-01T00:01:00Z' },
      ];

      mockPrismaService.lead.findUnique.mockResolvedValue({
        messageHistory: JSON.stringify(mockHistory),
      });

      const result = await service.getMessageHistory(1);

      expect(result).toEqual(mockHistory);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { messageHistory: true },
      });
    });

    it('should return empty array when no message history exists', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue({
        messageHistory: null,
      });

      const result = await service.getMessageHistory(1);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.getMessageHistory(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendMessageByCustomId', () => {
    const sendMessageDto: SendMessageDto = {
      customId: 'custom-123',
    };

    const mockLead = {
      id: 1,
      customId: 'custom-123',
    };

    it('should send message by custom ID and return success response', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(mockLead);

      const result = await service.sendMessageByCustomId(sendMessageDto);

      expect(result).toEqual({
        status: 'success',
        customId: 'custom-123',
        message: 'Thank you for your message. Our team will get back to you shortly.',
      });

      expect(prismaService.lead.findFirst).toHaveBeenCalledWith({
        where: { customId: 'custom-123' },
      });
    });

    it('should throw NotFoundException if lead with custom ID does not exist', async () => {
      mockPrismaService.lead.findFirst.mockResolvedValue(null);

      await expect(service.sendMessageByCustomId(sendMessageDto)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('handleGeneralChat', () => {
    it('should echo back received data', async () => {
      const testData = { message: 'Hello', userId: 123 };

      const result = await service.handleGeneralChat(testData);

      expect(result).toEqual({ received: testData });
    });

    it('should handle empty data', async () => {
      const result = await service.handleGeneralChat({});

      expect(result).toEqual({ received: {} });
    });

    it('should handle null data', async () => {
      const result = await service.handleGeneralChat(null);

      expect(result).toEqual({ received: null });
    });
  });

  describe('clearMessageHistory', () => {
    it('should clear message history for a lead', async () => {
      mockPrismaService.lead.update.mockResolvedValue({ id: 1 });

      await service.clearMessageHistory(1);

      expect(prismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          messageHistory: JSON.stringify([]),
          lastMessage: null,
          lastMessageDate: null,
        },
      });
    });
  });
}); 