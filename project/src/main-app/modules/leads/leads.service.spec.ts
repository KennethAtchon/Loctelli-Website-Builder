import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

describe('LeadsService', () => {
  let service: LeadsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    lead: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    strategy: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createLeadDto: CreateLeadDto = {
      name: 'New Lead',
      userId: 1,
      strategyId: 1,
      email: 'lead@example.com',
      phone: '123-456-7890',
    };

    const mockCreatedLead = {
      id: 3,
      ...createLeadDto,
      messageHistory: '[]',
    };

    it('should create and return a lead', async () => {
      mockPrismaService.lead.create.mockResolvedValue(mockCreatedLead);

      const result = await service.create(createLeadDto, 1);
      expect(result).toEqual(mockCreatedLead);
      expect(prismaService.lead.create).toHaveBeenCalledWith({
        data: {
          ...createLeadDto,
          subAccountId: 1,
        },
      });
    });
  });

  describe('findAll', () => {
    const mockLeads = [
      { id: 1, name: 'Lead 1', userId: 1, strategyId: 1 },
      { id: 2, name: 'Lead 2', userId: 1, strategyId: 2 },
    ];

    it('should return an array of leads', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const result = await service.findAll();
      expect(result).toEqual(mockLeads);
      expect(prismaService.lead.findMany).toHaveBeenCalledWith({
        include: {
          user: true,
          strategy: true,
          bookings: true,
        },
      });
    });
  });

  describe('findOne', () => {
    const mockLead = {
      id: 1,
      name: 'Lead 1',
      userId: 1,
      strategyId: 1,
      user: { id: 1, name: 'User 1' },
      strategy: { id: 1, name: 'Strategy 1' },
      bookings: [],
    };

    it('should return a lead if it exists and user has permission', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await service.findOne(1, 1, 'user');
      expect(result).toEqual(mockLead);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          user: true,
          strategy: true,
          bookings: true,
        },
      });
    });

    it('should return a lead if user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await service.findOne(1, 999, 'admin');
      expect(result).toEqual(mockLead);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.findOne(999, 1, 'user')).rejects.toThrow(NotFoundException);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 999 },
        include: {
          user: true,
          strategy: true,
          bookings: true,
        },
      });
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(service.findOne(1, 1, 'user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findByUserId', () => {
    const mockLeads = [
      { id: 1, name: 'Lead 1', userId: 1, strategyId: 1 },
      { id: 2, name: 'Lead 2', userId: 1, strategyId: 2 },
    ];

    it('should return leads for a specific user', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const result = await service.findByUserId(1);
      expect(result).toEqual(mockLeads);
      expect(prismaService.lead.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        include: {
          strategy: true,
          bookings: true,
        },
      });
    });
  });

  describe('findByStrategyId', () => {
    const mockStrategy = { id: 1, name: 'Strategy 1', userId: 1 };
    const mockLeads = [
      { id: 1, name: 'Lead 1', strategyId: 1 },
      { id: 2, name: 'Lead 2', strategyId: 1 },
    ];

    it('should return leads for a strategy if user has permission', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const result = await service.findByStrategyId(1, 1, 'user');
      expect(result).toEqual(mockLeads);
      expect(prismaService.strategy.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.lead.findMany).toHaveBeenCalledWith({
        where: { strategyId: 1 },
        include: {
          strategy: true,
          bookings: true,
        },
      });
    });

    it('should return leads for a strategy if user is admin', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(mockStrategy);
      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);

      const result = await service.findByStrategyId(1, 999, 'admin');
      expect(result).toEqual(mockLeads);
    });

    it('should throw NotFoundException if strategy does not exist', async () => {
      mockPrismaService.strategy.findUnique.mockResolvedValue(null);

      await expect(service.findByStrategyId(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const strategyWithDifferentUser = { ...mockStrategy, userId: 2 };
      mockPrismaService.strategy.findUnique.mockResolvedValue(strategyWithDifferentUser);

      await expect(service.findByStrategyId(1, 1, 'user')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    const updateLeadDto: UpdateLeadDto = { name: 'Updated Lead' };
    const mockLead = { id: 1, name: 'Lead 1', userId: 1, strategyId: 1 };
    const mockUpdatedLead = { id: 1, name: 'Updated Lead', userId: 1, strategyId: 1 };

    it('should update and return a lead if user has permission', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue(mockUpdatedLead);

      const result = await service.update(1, updateLeadDto, 1, 'user');
      expect(result).toEqual(mockUpdatedLead);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: updateLeadDto,
      });
    });

    it('should update and return a lead if user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue(mockUpdatedLead);

      const result = await service.update(1, updateLeadDto, 999, 'admin');
      expect(result).toEqual(mockUpdatedLead);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.update(999, updateLeadDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(service.update(1, updateLeadDto, 1, 'user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if update fails', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(1, updateLeadDto, 1, 'user')).rejects.toThrow(NotFoundException);
    });
  });

  describe('appendMessage', () => {
    const mockLead = {
      id: 1,
      messageHistory: JSON.stringify([{ role: 'user', content: 'Hello' }]),
    };

    const newMessage = { role: 'assistant', content: 'Hi there!' };

    it('should append message to lead history', async () => {
      const updatedLead = {
        ...mockLead,
        messageHistory: JSON.stringify([...JSON.parse(mockLead.messageHistory), newMessage]),
        lastMessage: newMessage.content,
        lastMessageDate: expect.any(String),
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.update.mockResolvedValue(updatedLead);

      const result = await service.appendMessage(1, newMessage);
      expect(result).toEqual(updatedLead);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        select: { messageHistory: true },
      });
      expect(prismaService.lead.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          messageHistory: expect.any(String),
          lastMessage: newMessage.content,
          lastMessageDate: expect.any(String),
        },
      });
    });

    it('should handle empty message history', async () => {
      const leadWithEmptyHistory = { id: 1, messageHistory: null };
      const updatedLead = {
        ...leadWithEmptyHistory,
        messageHistory: JSON.stringify([newMessage]),
        lastMessage: newMessage.content,
        lastMessageDate: expect.any(String),
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithEmptyHistory);
      mockPrismaService.lead.update.mockResolvedValue(updatedLead);

      const result = await service.appendMessage(1, newMessage);
      expect(result).toEqual(updatedLead);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.appendMessage(999, newMessage)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const mockLead = { id: 1, name: 'Lead 1', userId: 1, strategyId: 1 };
    const mockDeletedLead = { id: 1, name: 'Lead 1', userId: 1, strategyId: 1 };

    it('should delete and return a lead if user has permission', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.delete.mockResolvedValue(mockDeletedLead);

      const result = await service.remove(1, 1, 'user');
      expect(result).toEqual(mockDeletedLead);
      expect(prismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(prismaService.lead.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
    });

    it('should delete and return a lead if user is admin', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.delete.mockResolvedValue(mockDeletedLead);

      const result = await service.remove(1, 999, 'admin');
      expect(result).toEqual(mockDeletedLead);
    });

    it('should throw NotFoundException if lead does not exist', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      await expect(service.remove(999, 1, 'user')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user does not have permission', async () => {
      const leadWithDifferentUser = { ...mockLead, userId: 2 };
      mockPrismaService.lead.findUnique.mockResolvedValue(leadWithDifferentUser);

      await expect(service.remove(1, 1, 'user')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if delete fails', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.lead.delete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.remove(1, 1, 'user')).rejects.toThrow(NotFoundException);
    });
  });
});
