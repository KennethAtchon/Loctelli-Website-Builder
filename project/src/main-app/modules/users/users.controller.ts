import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, HttpException, HttpStatus, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  create(@Body() createUserDto: CreateUserDto, @CurrentUser() user) {
    // For admin users, subAccountId should be provided in the DTO
    // For regular users, they can only create users in their own SubAccount
    if (user.type === 'admin') {
      if (!createUserDto.subAccountId) {
        throw new HttpException('subAccountId is required for admin user creation', HttpStatus.BAD_REQUEST);
      }
      return this.usersService.create(createUserDto, createUserDto.subAccountId);
    } else {
      // Regular users can only create users in their own SubAccount
      return this.usersService.create(createUserDto, user.subAccountId);
    }
  }

  @Get()
  findAll(@CurrentUser() user, @Query('userId') userId?: string, @Query('subAccountId') subAccountId?: string) {
    // If userId is provided, check if current user has permission to view that user's data
    if (userId) {
      const parsedUserId = parseInt(userId, 10);
      if (isNaN(parsedUserId)) {
        throw new HttpException('Invalid userId parameter', HttpStatus.BAD_REQUEST);
      }
      // Only allow viewing own data unless admin
      if (user.role !== 'admin' && user.role !== 'super_admin' && user.userId !== parsedUserId) {
        throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
      }
      return this.usersService.findOne(parsedUserId);
    }
    
    // Handle SubAccount filtering
    if (user.type === 'admin') {
      // Admin can view users in specific SubAccount or all their SubAccounts
      const parsedSubAccountId = subAccountId ? parseInt(subAccountId, 10) : undefined;
      if (parsedSubAccountId) {
        return this.usersService.findAllBySubAccount(parsedSubAccountId);
      } else {
        // Return all users from all SubAccounts owned by this admin
        return this.usersService.findAllByAdmin(user.userId);
      }
    } else {
      // Regular users can only view users in their own SubAccount
      return this.usersService.findAllBySubAccount(user.subAccountId);
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    // Only allow viewing own data unless admin
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.userId !== id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user
  ) {
    // Only allow updating own data unless admin
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.userId !== id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    // Only allow deleting own data unless admin
    if (user.role !== 'admin' && user.role !== 'super_admin' && user.userId !== id) {
      throw new HttpException('Access denied', HttpStatus.FORBIDDEN);
    }
    return this.usersService.remove(id);
  }

  @Post('import-ghl-users')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  importGhlUsers(@CurrentUser() user) {
    return this.usersService.importGhlUsers();
  }
}
