import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { StrategiesService } from './strategies.service';
import { CreateStrategyDto } from './dto/create-strategy.dto';
import { UpdateStrategyDto } from './dto/update-strategy.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Admin } from '../../auth/decorators/admin.decorator';
import { AdminGuard } from '../../auth/guards/admin.guard';

@Controller('strategy')
@UseGuards(AdminGuard)
export class StrategiesController {
  constructor(private readonly strategiesService: StrategiesService) {}

  @Post()
  @Admin()
  create(@Body() createStrategyDto: CreateStrategyDto, @CurrentUser() user) {
    // Admin users can create strategies for any regular user within their SubAccounts
    if (user.type === 'admin') {
      // For admin users, subAccountId should be provided in the DTO
      if (!createStrategyDto.subAccountId) {
        throw new HttpException('subAccountId is required for strategy creation', HttpStatus.BAD_REQUEST);
      }
      return this.strategiesService.create(createStrategyDto, createStrategyDto.subAccountId);
    } else {
      // Regular users can only create strategies in their own SubAccount
      return this.strategiesService.create(createStrategyDto, user.subAccountId);
    }
  }

  @Get()
  @Admin()
  findAll(@CurrentUser() user, @Query('userId') userId?: string, @Query('subAccountId') subAccountId?: string) {
    if (userId) {
      const parsedUserId = parseInt(userId, 10);
      if (isNaN(parsedUserId)) {
        throw new HttpException('Invalid userId parameter', HttpStatus.BAD_REQUEST);
      }
      return this.strategiesService.findByUserId(parsedUserId);
    }
    
    // Handle SubAccount filtering
    if (user.type === 'admin') {
      // Admin can view strategies in specific SubAccount or all their SubAccounts
      const parsedSubAccountId = subAccountId ? parseInt(subAccountId, 10) : undefined;
      if (parsedSubAccountId) {
        return this.strategiesService.findAllBySubAccount(parsedSubAccountId);
      } else {
        // Return all strategies from all SubAccounts owned by this admin
        return this.strategiesService.findAllByAdmin(user.userId);
      }
    } else {
      // Regular users can only view strategies in their own SubAccount
      return this.strategiesService.findAllBySubAccount(user.subAccountId);
    }
  }

  @Get(':id')
  @Admin()
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.strategiesService.findOne(id, user.userId, user.role);
  }

  @Patch(':id')
  @Admin()
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStrategyDto: UpdateStrategyDto,
    @CurrentUser() user
  ) {
    return this.strategiesService.update(id, updateStrategyDto, user.userId, user.role);
  }

  @Delete(':id')
  @Admin()
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.strategiesService.remove(id, user.userId, user.role);
  }

  @Post(':id/duplicate')
  @Admin()
  duplicate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.strategiesService.duplicate(id, user.userId, user.role);
  }
}
