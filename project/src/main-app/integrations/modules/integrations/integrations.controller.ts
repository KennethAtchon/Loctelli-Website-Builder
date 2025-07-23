import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { UpdateIntegrationDto } from './dto/update-integration.dto';
import { JwtAuthGuard } from '../../../auth/auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

@Controller('admin/integrations')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  create(@Body() createDto: CreateIntegrationDto, @Request() req) {
    console.log('Creating integration:', { createDto, userId: req.user.userId });
    return this.integrationsService.create(createDto, req.user.userId);
  }

  @Get()
  findAll(@Query('subAccountId') subAccountId?: string) {
    const subAccountIdNum = subAccountId ? +subAccountId : undefined;
    return this.integrationsService.findAll(subAccountIdNum);
  }

  @Get('subaccount/:subAccountId')
  findBySubAccount(@Param('subAccountId') subAccountId: string) {
    return this.integrationsService.findBySubAccount(+subAccountId);
  }

  @Get('status/:status')
  findByStatus(@Param('status') status: string, @Query('subAccountId') subAccountId?: string) {
    const subAccountIdNum = subAccountId ? +subAccountId : undefined;
    return this.integrationsService.findByStatus(status, subAccountIdNum);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.integrationsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateIntegrationDto) {
    console.log('Updating integration:', { id, updateDto });
    return this.integrationsService.update(+id, updateDto);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string, 
    @Body() body: { status: string; errorMessage?: string }
  ) {
    return this.integrationsService.updateStatus(+id, body.status, body.errorMessage);
  }

  @Post(':id/test')
  testConnection(@Param('id') id: string) {
    return this.integrationsService.testConnection(+id);
  }

  @Post(':id/sync')
  syncData(@Param('id') id: string) {
    return this.integrationsService.syncData(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrationsService.delete(+id);
  }
} 