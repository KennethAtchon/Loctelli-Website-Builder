import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { CreateSubAccountDto } from './dto/create-subaccount.dto';
import { UpdateSubAccountDto } from './dto/update-subaccount.dto';

@Injectable()
export class SubAccountsService {
  constructor(private prisma: PrismaService) {}

  async create(adminId: number, createSubAccountDto: CreateSubAccountDto) {
    return this.prisma.subAccount.create({
      data: {
        ...createSubAccountDto,
        createdByAdminId: adminId,
      },
      include: {
        createdByAdmin: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { users: true, strategies: true, leads: true, bookings: true }
        }
      }
    });
  }

  async findAll(adminId: number) {
    // All admins can see all subaccounts
    return this.prisma.subAccount.findMany({
      include: {
        createdByAdmin: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { users: true, strategies: true, leads: true, bookings: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number, adminId: number) {
    const subAccount = await this.prisma.subAccount.findFirst({
      where: { id },
      include: {
        createdByAdmin: {
          select: { id: true, name: true, email: true }
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            lastLoginAt: true,
            createdAt: true
          }
        },
        strategies: {
          select: {
            id: true,
            name: true,
            tag: true,
            tone: true,
            createdAt: true
          }
        },
        leads: {
          select: {
            id: true,
            name: true,
            email: true,
            status: true
          }
        },
        bookings: {
          select: {
            id: true,
            bookingType: true,
            status: true,
            createdAt: true
          }
        }
      }
    });

    if (!subAccount) {
      throw new NotFoundException('SubAccount not found');
    }

    return subAccount;
  }

  async update(id: number, adminId: number, updateSubAccountDto: UpdateSubAccountDto) {
    const subAccount = await this.prisma.subAccount.findFirst({
      where: { id }
    });

    if (!subAccount) {
      throw new NotFoundException('SubAccount not found');
    }

    return this.prisma.subAccount.update({
      where: { id },
      data: updateSubAccountDto,
      include: {
        createdByAdmin: {
          select: { id: true, name: true, email: true }
        }
      }
    });
  }

  async remove(id: number, adminId: number) {
    const subAccount = await this.prisma.subAccount.findFirst({
      where: { id }
    });

    if (!subAccount) {
      throw new NotFoundException('SubAccount not found');
    }

    // Cascade delete will handle all related data
    await this.prisma.subAccount.delete({ where: { id } });
    return { message: 'SubAccount deleted successfully' };
  }

  // Helper method to validate SubAccount access
  async validateSubAccountAccess(userId: number, subAccountId: number, userType: 'admin' | 'user') {
    if (userType === 'admin') {
      // All admins can access any subaccount
      const subAccount = await this.prisma.subAccount.findFirst({
        where: { id: subAccountId }
      });
      if (!subAccount) {
        throw new ForbiddenException('SubAccount not found');
      }
      return subAccount;
    } else {
      const user = await this.prisma.user.findFirst({
        where: { id: userId, subAccountId }
      });
      if (!user) {
        throw new ForbiddenException('Access denied to SubAccount');
      }
      return user;
    }
  }
} 