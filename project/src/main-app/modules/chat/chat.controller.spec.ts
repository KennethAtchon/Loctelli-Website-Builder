import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ChatMessageDto } from './dto/chat-message.dto';
import { SendMessageDto } from './dto/send-message.dto';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: ChatService;
  let prismaService: PrismaService;

  const mockChatService = {
    sendMessage: jest.fn(),
    getMessageHistory: jest.fn(),
    sendMessageByCustomId: jest.fn(),
    handleGeneralChat: jest.fn(),
    clearMessageHistory: jest.fn(),
  };

  const mockPrismaService = {
    lead: {
      findUnique: jest.fn(),
    },
  };

  const mockUser = {
    userId: 1,
    role: 'user',
  };

  const mockAdminUser = {
    userId: 999,
    role: 'admin',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [
        {
          provide: ChatService,
          useValue: mockChatService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ChatController>(ChatController);
    chatService = module.get<ChatService>(ChatService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    const chatMessageDto: ChatMessageDto = {
      leadId: 1,
      content: 'Hello, I need help',
      role: 'user',
    };

    const mockLead = {
      id: 1,
      userId: 1,
    };

    const mockResponse = {
      userMessage: { content: 'Hello', role: 'user' },
      aiMessage: { content: 'Hi there!', role: 'assistant' },
      lead: { id: 1 },
    };

    it('should send message when user owns the lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      const result = await controller.sendMessage(chatMessageDto, mockUser);

      expect(result).toEqual(mockResponse);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(chatService.sendMessage).toHaveBeenCalledWith(chatMessageDto);
    });

    it('should send message when user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockChatService.sendMessage.mockResolvedValue(mockResponse);

      const result = await controller.sendMessage(chatMessageDto, mockAdminUser);

      expect(result).toEqual(mockResponse);
    });

    it('should throw HttpException when lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(controller.sendMessage(chatMessageDto, mockUser)).rejects.toThrow(
        new HttpException('Lead not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should throw HttpException when user does not have access', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(controller.sendMessage(chatMessageDto, mockUser)).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN)
      );
    });
  });

  describe('getMessages', () => {
    const mockLead = {
      id: 1,
      userId: 1,
    };

    const mockMessages = [
      { role: 'user', content: 'Hello', timestamp: '2023-01-01T00:00:00Z' },
      { role: 'assistant', content: 'Hi there!', timestamp: '2023-01-01T00:01:00Z' },
    ];

    it('should get messages when user owns the lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockChatService.getMessageHistory.mockResolvedValue(mockMessages);

      const result = await controller.getMessages(1, mockUser);

      expect(result).toEqual(mockMessages);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(chatService.getMessageHistory).toHaveBeenCalledWith(1);
    });

    it('should get messages when user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockChatService.getMessageHistory.mockResolvedValue(mockMessages);

      const result = await controller.getMessages(1, mockAdminUser);

      expect(result).toEqual(mockMessages);
    });

    it('should throw HttpException when lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(controller.getMessages(999, mockUser)).rejects.toThrow(
        new HttpException('Lead not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should throw HttpException when user does not have access', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(controller.getMessages(1, mockUser)).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN)
      );
    });
  });

  describe('markMessageAsRead', () => {
    it('should return placeholder response', async () => {
      const result = await controller.markMessageAsRead('message-123', mockUser);

      expect(result).toEqual({ message: 'Message marked as read' });
    });
  });

  describe('deleteMessage', () => {
    it('should return placeholder response', async () => {
      const result = await controller.deleteMessage('message-123', mockUser);

      expect(result).toEqual({ message: 'Message deleted' });
    });
  });

  describe('getUnreadMessagesCount', () => {
    const mockLead = {
      id: 1,
      userId: 1,
    };

    it('should return unread count when user owns the lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await controller.getUnreadMessagesCount(1, mockUser);

      expect(result).toBe(0);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should return unread count when user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await controller.getUnreadMessagesCount(1, mockAdminUser);

      expect(result).toBe(0);
    });

    it('should throw HttpException when lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(controller.getUnreadMessagesCount(999, mockUser)).rejects.toThrow(
        new HttpException('Lead not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should throw HttpException when user does not have access', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(controller.getUnreadMessagesCount(1, mockUser)).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN)
      );
    });
  });

  describe('markAllAsRead', () => {
    const mockLead = {
      id: 1,
      userId: 1,
    };

    it('should mark all as read when user owns the lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await controller.markAllAsRead(1, mockUser);

      expect(result).toEqual({ message: 'All messages marked as read' });
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should mark all as read when user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await controller.markAllAsRead(1, mockAdminUser);

      expect(result).toEqual({ message: 'All messages marked as read' });
    });

    it('should throw HttpException when lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(controller.markAllAsRead(999, mockUser)).rejects.toThrow(
        new HttpException('Lead not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should throw HttpException when user does not have access', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(controller.markAllAsRead(1, mockUser)).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN)
      );
    });
  });

  describe('sendMessageByCustomId', () => {
    const sendMessageDto: SendMessageDto = {
      customId: 'custom-123',
    };

    const mockResponse = {
      status: 'success',
      customId: 'custom-123',
      message: 'Thank you for your message.',
    };

    it('should send message by custom ID', async () => {
      mockChatService.sendMessageByCustomId.mockResolvedValue(mockResponse);

      const result = await controller.sendMessageByCustomId(sendMessageDto);

      expect(result).toEqual(mockResponse);
      expect(chatService.sendMessageByCustomId).toHaveBeenCalledWith(sendMessageDto);
    });
  });

  describe('generalChatEndpoint', () => {
    const testData = { message: 'Hello', userId: 123 };

    it('should handle general chat', async () => {
      const mockResponse = { received: testData };
      mockChatService.handleGeneralChat.mockResolvedValue(mockResponse);

      const result = await controller.generalChatEndpoint(testData);

      expect(result).toEqual(mockResponse);
      expect(chatService.handleGeneralChat).toHaveBeenCalledWith(testData);
    });
  });

  describe('clearLeadMessages', () => {
    const mockLead = {
      id: 1,
      userId: 1,
    };

    it('should clear lead messages when user owns the lead', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockChatService.clearMessageHistory.mockResolvedValue(undefined);

      const result = await controller.clearLeadMessages(1, mockUser);

      expect(result).toEqual({ message: 'Chat history cleared' });
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(chatService.clearMessageHistory).toHaveBeenCalledWith(1);
    });

    it('should clear lead messages when user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockChatService.clearMessageHistory.mockResolvedValue(undefined);

      const result = await controller.clearLeadMessages(1, mockAdminUser);

      expect(result).toEqual({ message: 'Chat history cleared' });
    });

    it('should throw HttpException when lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(controller.clearLeadMessages(999, mockUser)).rejects.toThrow(
        new HttpException('Lead not found', HttpStatus.NOT_FOUND)
      );
    });

    it('should throw HttpException when user does not have access', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(controller.clearLeadMessages(1, mockUser)).rejects.toThrow(
        new HttpException('Access denied', HttpStatus.FORBIDDEN)
      );
    });
  });
}); 