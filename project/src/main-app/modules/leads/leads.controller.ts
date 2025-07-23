import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, Query, HttpException, HttpStatus, UseGuards, Logger } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Admin } from '../../auth/decorators/admin.decorator';
import { AdminGuard } from '../../auth/guards/admin.guard';

@Controller('lead')
@UseGuards(AdminGuard)
export class LeadsController {
  private readonly logger = new Logger(LeadsController.name);

  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  @Admin()
  async create(@Body() createLeadDto: CreateLeadDto, @CurrentUser() user) {
    this.logger.log(`📝 Lead creation attempt by user: ${user.email} (ID: ${user.userId}, type: ${user.type})`);
    this.logger.debug(`Lead creation data: ${JSON.stringify(createLeadDto)}`);
    
    try {
      let result;
      
      // Admin users can create leads for any regular user within their SubAccounts
      if (user.type === 'admin') {
        // For admin users, subAccountId should be provided in the DTO
        if (!createLeadDto.subAccountId) {
          this.logger.warn(`Lead creation failed - subAccountId missing for admin user: ${user.email}`);
          throw new HttpException('subAccountId is required for lead creation', HttpStatus.BAD_REQUEST);
        }
        this.logger.debug(`Admin creating lead for subAccountId: ${createLeadDto.subAccountId}`);
        result = await this.leadsService.create(createLeadDto, createLeadDto.subAccountId);
      } else {
        // Regular users can only create leads in their own SubAccount
        this.logger.debug(`Regular user creating lead for subAccountId: ${user.subAccountId}`);
        result = await this.leadsService.create(createLeadDto, user.subAccountId);
      }
      
      this.logger.log(`✅ Lead created successfully by user: ${user.email} (Lead ID: ${result.id})`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Lead creation failed for user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Get()
  @Admin()
  async findAll(@CurrentUser() user, @Query('userId') userId?: string, @Query('strategyId') strategyId?: string, @Query('subAccountId') subAccountId?: string) {
    this.logger.log(`🔍 Lead search request by user: ${user.email} (ID: ${user.userId}, type: ${user.type})`);
    this.logger.debug(`Search parameters: userId=${userId}, strategyId=${strategyId}, subAccountId=${subAccountId}`);
    
    try {
      let result;
      
      if (userId) {
        const parsedUserId = parseInt(userId, 10);
        if (isNaN(parsedUserId)) {
          this.logger.warn(`Invalid userId parameter: ${userId}`);
          throw new HttpException('Invalid userId parameter', HttpStatus.BAD_REQUEST);
        }
        this.logger.debug(`Searching leads by userId: ${parsedUserId}`);
        result = await this.leadsService.findByUserId(parsedUserId);
      } else if (strategyId) {
        const parsedStrategyId = parseInt(strategyId, 10);
        if (isNaN(parsedStrategyId)) {
          this.logger.warn(`Invalid strategyId parameter: ${strategyId}`);
          throw new HttpException('Invalid strategyId parameter', HttpStatus.BAD_REQUEST);
        }
        this.logger.debug(`Searching leads by strategyId: ${parsedStrategyId}`);
        result = await this.leadsService.findByStrategyId(parsedStrategyId, user.userId, user.role);
      } else {
        // Handle SubAccount filtering
        if (user.type === 'admin') {
          // Admin can view leads in specific SubAccount or all their SubAccounts
          const parsedSubAccountId = subAccountId ? parseInt(subAccountId, 10) : undefined;
          if (parsedSubAccountId) {
            this.logger.debug(`Admin searching leads by subAccountId: ${parsedSubAccountId}`);
            result = await this.leadsService.findAllBySubAccount(parsedSubAccountId);
          } else {
            // Return all leads from all SubAccounts owned by this admin
            this.logger.debug(`Admin searching all leads for adminId: ${user.userId}`);
            result = await this.leadsService.findAllByAdmin(user.userId);
          }
        } else {
          // Regular users can only view leads in their own SubAccount
          this.logger.debug(`Regular user searching leads by subAccountId: ${user.subAccountId}`);
          result = await this.leadsService.findAllBySubAccount(user.subAccountId);
        }
      }
      
      this.logger.log(`✅ Lead search successful for user: ${user.email} - found ${result.length} leads`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Lead search failed for user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Get(':id')
  @Admin()
  async findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    this.logger.log(`🔍 Lead detail request for ID: ${id} by user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.leadsService.findOne(id, user.userId, user.role);
      this.logger.log(`✅ Lead detail retrieved successfully for ID: ${id} by user: ${user.email}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Lead detail retrieval failed for ID: ${id} by user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Patch(':id')
  @Admin()
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser() user
  ) {
    this.logger.log(`✏️ Lead update attempt for ID: ${id} by user: ${user.email} (ID: ${user.userId})`);
    this.logger.debug(`Lead update data: ${JSON.stringify(updateLeadDto)}`);
    
    try {
      const result = await this.leadsService.update(id, updateLeadDto, user.userId, user.role);
      this.logger.log(`✅ Lead updated successfully for ID: ${id} by user: ${user.email}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Lead update failed for ID: ${id} by user: ${user.email}`, error.stack);
      throw error;
    }
  }

  @Post(':id/message')
  async appendMessage(
    @Param('id', ParseIntPipe) id: number,
    @Body() message: any,
  ) {
    this.logger.log(`💬 Message append attempt for lead ID: ${id}`);
    this.logger.debug(`Message data: ${JSON.stringify(message)}`);
    
    try {
      const result = await this.leadsService.appendMessage(id, message);
      this.logger.log(`✅ Message appended successfully for lead ID: ${id}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Message append failed for lead ID: ${id}`, error.stack);
      throw error;
    }
  }

  @Delete(':id')
  @Admin()
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    this.logger.log(`🗑️ Lead deletion attempt for ID: ${id} by user: ${user.email} (ID: ${user.userId})`);
    
    try {
      const result = await this.leadsService.remove(id, user.userId, user.role);
      this.logger.log(`✅ Lead deleted successfully for ID: ${id} by user: ${user.email}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ Lead deletion failed for ID: ${id} by user: ${user.email}`, error.stack);
      throw error;
    }
  }
}
