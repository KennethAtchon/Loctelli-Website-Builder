import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let usersService: UsersService;

  const mockUsersService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findAllBySubAccount: jest.fn(),
    findAllByAdmin: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    importGhlUsers: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    const createUserDto: CreateUserDto = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Password123!',
      company: 'Test Company',
      role: 'user',
      subAccountId: 1,
    };

    const mockCreatedUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      company: 'Test Company',
      role: 'user',
    };

    it('should successfully create a user for admin', async () => {
      mockUsersService.create.mockResolvedValue(mockCreatedUser);

      const result = await controller.create(createUserDto, { role: 'admin', type: 'admin', subAccountId: 1 });

      expect(usersService.create).toHaveBeenCalledWith(createUserDto, createUserDto.subAccountId);
      expect(result).toEqual(mockCreatedUser);
    });

    it('should successfully create a user for regular user', async () => {
      mockUsersService.create.mockResolvedValue(mockCreatedUser);

      const result = await controller.create(createUserDto, { role: 'user', type: 'user', subAccountId: 1 });

      expect(usersService.create).toHaveBeenCalledWith(createUserDto, 1);
      expect(result).toEqual(mockCreatedUser);
    });
  });

  describe('findAll', () => {
    const mockAdminUser = {
      userId: 1,
      role: 'admin',
      type: 'admin',
      subAccountId: 1,
    };

    const mockRegularUser = {
      userId: 1,
      role: 'user',
      type: 'user',
      subAccountId: 1,
    };

    const mockUserData = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      strategies: [],
      leads: [],
      bookings: [],
    };

    it('should return all users for admin when no userId provided', async () => {
      mockUsersService.findAllByAdmin.mockResolvedValue([mockUserData]);

      const result = await controller.findAll(mockAdminUser);

      expect(usersService.findAllByAdmin).toHaveBeenCalledWith(mockAdminUser.userId);
      expect(result).toEqual([mockUserData]);
    });

    it('should return users by subAccount for regular user when no userId provided', async () => {
      mockUsersService.findAllBySubAccount.mockResolvedValue([mockUserData]);

      const result = await controller.findAll(mockRegularUser);

      expect(usersService.findAllBySubAccount).toHaveBeenCalledWith(mockRegularUser.subAccountId);
      expect(result).toEqual([mockUserData]);
    });

    it('should return specific user data when userId provided and user is admin', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserData);

      const result = await controller.findAll(mockAdminUser, '2');

      expect(usersService.findOne).toHaveBeenCalledWith(2);
      expect(result).toEqual(mockUserData);
    });

    it('should return specific user data when userId matches current user', async () => {
      mockUsersService.findOne.mockResolvedValue(mockUserData);

      const result = await controller.findAll(mockRegularUser, '1');

      expect(usersService.findOne).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockUserData);
    });

    it('should throw HttpException for invalid userId parameter', () => {
      expect(() => controller.findAll(mockRegularUser, 'invalid')).toThrow(HttpException);
    });

    it('should throw HttpException when user tries to access other user data without admin role', () => {
      expect(() => controller.findAll(mockRegularUser, '2')).toThrow(HttpException);
    });
  });

  describe('findOne', () => {
    const mockUser = {
      userId: 1,
      role: 'user',
    };

    const mockUserData = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      strategies: [],
      leads: [],
      bookings: [],
    };

    it('should return user data when user is admin', () => {
      mockUsersService.findOne.mockResolvedValue(mockUserData);

      const result = controller.findOne(2, { ...mockUser, role: 'admin' });

      expect(usersService.findOne).toHaveBeenCalledWith(2);
      expect(result).resolves.toEqual(mockUserData);
    });

    it('should return user data when user accesses own data', () => {
      mockUsersService.findOne.mockResolvedValue(mockUserData);

      const result = controller.findOne(1, mockUser);

      expect(usersService.findOne).toHaveBeenCalledWith(1);
      expect(result).resolves.toEqual(mockUserData);
    });

    it('should throw HttpException when user tries to access other user data without admin role', () => {
      expect(() => controller.findOne(2, mockUser)).toThrow(HttpException);
    });
  });

  describe('update', () => {
    const mockUser = {
      userId: 1,
      role: 'user',
    };

    const updateUserDto: UpdateUserDto = {
      name: 'Updated User',
      company: 'Updated Company',
    };

    const mockUpdatedUser = {
      id: 1,
      name: 'Updated User',
      email: 'test@example.com',
      company: 'Updated Company',
    };

    it('should successfully update user when user is admin', () => {
      mockUsersService.update.mockResolvedValue(mockUpdatedUser);

      const result = controller.update(2, updateUserDto, { ...mockUser, role: 'admin' });

      expect(usersService.update).toHaveBeenCalledWith(2, updateUserDto);
      expect(result).resolves.toEqual(mockUpdatedUser);
    });

    it('should successfully update user when user updates own data', () => {
      mockUsersService.update.mockResolvedValue(mockUpdatedUser);

      const result = controller.update(1, updateUserDto, mockUser);

      expect(usersService.update).toHaveBeenCalledWith(1, updateUserDto);
      expect(result).resolves.toEqual(mockUpdatedUser);
    });

    it('should throw HttpException when user tries to update other user data without admin role', () => {
      expect(() => controller.update(2, updateUserDto, mockUser)).toThrow(HttpException);
    });
  });

  describe('remove', () => {
    const mockUser = {
      userId: 1,
      role: 'user',
    };

    const mockDeletedUser = {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
    };

    it('should successfully delete user when user is admin', () => {
      mockUsersService.remove.mockResolvedValue(mockDeletedUser);

      const result = controller.remove(2, { ...mockUser, role: 'admin' });

      expect(usersService.remove).toHaveBeenCalledWith(2);
      expect(result).resolves.toEqual(mockDeletedUser);
    });

    it('should successfully delete user when user deletes own data', () => {
      mockUsersService.remove.mockResolvedValue(mockDeletedUser);

      const result = controller.remove(1, mockUser);

      expect(usersService.remove).toHaveBeenCalledWith(1);
      expect(result).resolves.toEqual(mockDeletedUser);
    });

    it('should throw HttpException when user tries to delete other user data without admin role', () => {
      expect(() => controller.remove(2, mockUser)).toThrow(HttpException);
    });
  });

  describe('importGhlUsers', () => {
    const mockUser = {
      userId: 1,
      role: 'admin',
    };

    const mockImportedUsers = [
      {
        id: 1,
        name: 'Imported User 1',
        email: 'user1@example.com',
      },
      {
        id: 2,
        name: 'Imported User 2',
        email: 'user2@example.com',
      },
    ];

    it('should successfully import GHL users', () => {
      mockUsersService.importGhlUsers.mockResolvedValue(mockImportedUsers);

      const result = controller.importGhlUsers(mockUser);

      expect(usersService.importGhlUsers).toHaveBeenCalled();
      expect(result).resolves.toEqual(mockImportedUsers);
    });
  });
}); 