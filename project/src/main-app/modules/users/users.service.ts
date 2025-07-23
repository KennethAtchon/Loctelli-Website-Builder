import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { GhlService } from '../../integrations/ghl-integrations/ghl/ghl.service';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private ghlService: GhlService
  ) {}

  async create(createUserDto: CreateUserDto, subAccountId: number) {
    // Hash password if provided
    const data = { ...createUserDto };
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 12);
    }
    
    return this.prisma.user.create({
      data: {
        ...data,
        subAccountId, // New required field
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        isActive: true,
        subAccount: {
          select: { id: true, name: true }
        },
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        strategies: true,
        leads: true,
        bookings: true,
      },
    });
  }

  async findAllBySubAccount(subAccountId: number) {
    return this.prisma.user.findMany({
      where: { subAccountId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findAllByAdmin(adminId: number) {
    // All admins can see all users
    return this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        company: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        subAccount: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        strategies: true,
        leads: true,
        bookings: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateUserDto,
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  async remove(id: number) {
    try {
      return await this.prisma.user.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }

  /**
   * Import users from GoHighLevel subaccounts (locations)
   * @returns List of created users
   */
  async importGhlUsers() {
    try {
      // Fetch subaccounts from GoHighLevel API
      const subaccountsData = await this.ghlService.searchSubaccounts();
      
      if (!subaccountsData || !subaccountsData.locations) {
        throw new HttpException(
          'Failed to fetch subaccounts from GoHighLevel API',
          HttpStatus.BAD_GATEWAY
        );
      }
      
      const createdUsers: User[] = [];
      
      // Process each location and create a user
      for (const loc of subaccountsData.locations) {
        // Get default SubAccount for new users
        const defaultSubAccount = await this.prisma.subAccount.findFirst({
          where: { name: 'Default SubAccount' },
        });

        if (!defaultSubAccount) {
          throw new HttpException(
            'No default SubAccount available for user creation',
            HttpStatus.BAD_REQUEST
          );
        }

        // Map subaccount/location fields to User fields
        const userData = {
          name: loc.name || 'Unknown User',
          company: loc.companyId || null,
          email: loc.email || `user-${Date.now()}@example.com`,
          password: await bcrypt.hash('defaultPassword123', 12), // Default password
          role: 'user',
          subAccountId: defaultSubAccount.id,
          // Add any other mappings as needed
        };
        
        // Prevent duplicates by checking if user with same email exists
        if (userData.email) {
          const existingUser = await this.prisma.user.findFirst({
            where: { email: userData.email }
          });
          
          if (existingUser) {
            continue;
          }
        }
        
        // Create the user
        const newUser = await this.prisma.user.create({
          data: userData
        });
        
        createdUsers.push(newUser);
      }
      
      return createdUsers;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error importing GHL users: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
