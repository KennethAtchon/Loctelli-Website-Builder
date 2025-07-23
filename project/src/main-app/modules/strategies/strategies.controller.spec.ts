import { Test, TestingModule } from '@nestjs/testing';
import { StrategiesController } from './strategies.controller';
import { StrategiesService } from './strategies.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';

describe('StrategiesController', () => {
  let controller: StrategiesController;
  let strategiesService: StrategiesService;

  const mockStrategiesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllBySubAccount: jest.fn(),
    findAllByAdmin: jest.fn(),
    findOne: jest.fn(),
    findByUserId: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    duplicate: jest.fn(),
  };

  const mockAdminUser = {
    userId: 999,
    role: 'admin',
    type: 'admin',
    subAccountId: 1,
  };

  const mockUser = {
    userId: 1,
    role: 'user',
    type: 'user',
    subAccountId: 1,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StrategiesController],
      providers: [
        {
          provide: StrategiesService,
          useValue: mockStrategiesService,
        },
      ],
    }).compile();

    controller = module.get<StrategiesController>(StrategiesController);
    strategiesService = module.get<StrategiesService>(StrategiesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createStrategyDto: CreateStrategyDto = {
      userId: 1,
      name: 'New Strategy',
      promptTemplateId: 1,
      subAccountId: 1,
    };

    const mockCreatedStrategy = {
      id: 1,
      ...createStrategyDto,
    };

    it('should create a strategy for admin user', async () => {
      mockStrategiesService.create.mockResolvedValue(mockCreatedStrategy);

      const result = await controller.create(createStrategyDto, mockAdminUser);

      expect(result).toEqual(mockCreatedStrategy);
      expect(strategiesService.create).toHaveBeenCalledWith(createStrategyDto, createStrategyDto.subAccountId);
    });

    it('should create a strategy for regular user', async () => {
      mockStrategiesService.create.mockResolvedValue(mockCreatedStrategy);

      const result = await controller.create(createStrategyDto, mockUser);

      expect(result).toEqual(mockCreatedStrategy);
      expect(strategiesService.create).toHaveBeenCalledWith(createStrategyDto, mockUser.subAccountId);
    });
  });

  describe('findAll', () => {
    const mockStrategies = [
      { id: 1, name: 'Strategy 1', userId: 1 },
      { id: 2, name: 'Strategy 2', userId: 2 },
    ];

    it('should return all strategies for admin when no query parameters', async () => {
      mockStrategiesService.findAllByAdmin.mockResolvedValue(mockStrategies);

      const result = await controller.findAll(mockAdminUser);

      expect(result).toEqual(mockStrategies);
      expect(strategiesService.findAllByAdmin).toHaveBeenCalledWith(mockAdminUser.userId);
    });

    it('should return strategies by subAccount for regular user when no query parameters', async () => {
      mockStrategiesService.findAllBySubAccount.mockResolvedValue(mockStrategies);

      const result = await controller.findAll(mockUser);

      expect(result).toEqual(mockStrategies);
      expect(strategiesService.findAllBySubAccount).toHaveBeenCalledWith(mockUser.subAccountId);
    });

    it('should return strategies by userId when userId query parameter is provided', async () => {
      const userStrategies = [{ id: 1, name: 'Strategy 1', userId: 1 }];
      mockStrategiesService.findByUserId.mockResolvedValue(userStrategies);

      const result = await controller.findAll(mockAdminUser, '1');

      expect(result).toEqual(userStrategies);
      expect(strategiesService.findByUserId).toHaveBeenCalledWith(1);
    });

    it('should throw HttpException for invalid userId parameter', () => {
      expect(() => controller.findAll(mockAdminUser, 'invalid')).toThrow(
        new HttpException('Invalid userId parameter', HttpStatus.BAD_REQUEST)
      );
    });
  });

  describe('findOne', () => {
    const mockStrategy = {
      id: 1,
      name: 'Strategy 1',
      userId: 1,
      promptTemplateId: 1,
    };

    it('should return a strategy by id', async () => {
      mockStrategiesService.findOne.mockResolvedValue(mockStrategy);

      const result = await controller.findOne(1, mockAdminUser);

      expect(result).toEqual(mockStrategy);
      expect(strategiesService.findOne).toHaveBeenCalledWith(1, mockAdminUser.userId, mockAdminUser.role);
    });
  });

  describe('update', () => {
    const updateStrategyDto: UpdateStrategyDto = {
      name: 'Updated Strategy',
    };

    const mockUpdatedStrategy = {
      id: 1,
      name: 'Updated Strategy',
      userId: 1,
      promptTemplateId: 1,
    };

    it('should update a strategy', async () => {
      mockStrategiesService.update.mockResolvedValue(mockUpdatedStrategy);

      const result = await controller.update(1, updateStrategyDto, mockAdminUser);

      expect(result).toEqual(mockUpdatedStrategy);
      expect(strategiesService.update).toHaveBeenCalledWith(1, updateStrategyDto, mockAdminUser.userId, mockAdminUser.role);
    });
  });

  describe('remove', () => {
    const mockDeletedStrategy = {
      id: 1,
      name: 'Strategy 1',
      userId: 1,
    };

    it('should delete a strategy', async () => {
      mockStrategiesService.remove.mockResolvedValue(mockDeletedStrategy);

      const result = await controller.remove(1, mockAdminUser);

      expect(result).toEqual(mockDeletedStrategy);
      expect(strategiesService.remove).toHaveBeenCalledWith(1, mockAdminUser.userId, mockAdminUser.role);
    });
  });

  describe('duplicate', () => {
    const mockDuplicatedStrategy = {
      id: 2,
      name: 'Strategy 1 (Copy)',
      userId: 1,
      promptTemplateId: 1,
    };

    it('should duplicate a strategy', async () => {
      mockStrategiesService.duplicate.mockResolvedValue(mockDuplicatedStrategy);

      const result = await controller.duplicate(1, mockAdminUser);

      expect(result).toEqual(mockDuplicatedStrategy);
      expect(strategiesService.duplicate).toHaveBeenCalledWith(1, mockAdminUser.userId, mockAdminUser.role);
    });
  });
}); 