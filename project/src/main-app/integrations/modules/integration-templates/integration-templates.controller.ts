import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request, Query } from '@nestjs/common';
import { IntegrationTemplatesService } from './integration-templates.service';
import { CreateIntegrationTemplateDto } from './dto/create-integration-template.dto';
import { UpdateIntegrationTemplateDto } from './dto/update-integration-template.dto';
import { JwtAuthGuard } from '../../../auth/auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';

@Controller('admin/integration-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class IntegrationTemplatesController {
  constructor(private readonly integrationTemplatesService: IntegrationTemplatesService) {}

  @Post()
  create(@Body() createDto: CreateIntegrationTemplateDto, @Request() req) {
    console.log('Creating integration template:', { createDto, userId: req.user.userId });
    return this.integrationTemplatesService.create(createDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.integrationTemplatesService.findAll();
  }

  @Get('active')
  findActive() {
    return this.integrationTemplatesService.findActive();
  }

  @Get('category/:category')
  findByCategory(@Param('category') category: string) {
    return this.integrationTemplatesService.findByCategory(category);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.integrationTemplatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdateIntegrationTemplateDto) {
    console.log('Updating integration template:', { id, updateDto });
    return this.integrationTemplatesService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.integrationTemplatesService.delete(+id);
  }
} 