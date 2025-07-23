import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { PromptTemplatesService } from './prompt-templates.service';
import { CreatePromptTemplateDto } from './dto/create-prompt-template.dto';
import { UpdatePromptTemplateDto } from './dto/update-prompt-template.dto';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';

@Controller('admin/prompt-templates')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class PromptTemplatesController {
  constructor(private readonly promptTemplatesService: PromptTemplatesService) {}

  @Post()
  create(@Body() createDto: CreatePromptTemplateDto, @Request() req) {
    console.log('Creating prompt template:', { createDto, userId: req.user.userId });
    return this.promptTemplatesService.create(createDto, req.user.userId);
  }

  @Get()
  findAll() {
    return this.promptTemplatesService.findAll();
  }

  @Get('active')
  getActive() {
    return this.promptTemplatesService.getActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.promptTemplatesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePromptTemplateDto) {
    console.log('Updating prompt template:', { id, updateDto });
    return this.promptTemplatesService.update(+id, updateDto);
  }

  @Patch(':id/activate')
  activate(@Param('id') id: string) {
    return this.promptTemplatesService.activate(+id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.promptTemplatesService.delete(+id);
  }
} 