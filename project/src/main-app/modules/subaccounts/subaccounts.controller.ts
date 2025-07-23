import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SubAccountsService } from './subaccounts.service';
import { CreateSubAccountDto } from './dto/create-subaccount.dto';
import { UpdateSubAccountDto } from './dto/update-subaccount.dto';
import { JwtAuthGuard } from '../../auth/auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';

@Controller('admin/subaccounts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SubAccountsController {
  constructor(private readonly subAccountsService: SubAccountsService) {}

  @Post()
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  create(@CurrentUser() user, @Body() createSubAccountDto: CreateSubAccountDto) {
    return this.subAccountsService.create(user.userId, createSubAccountDto);
  }

  @Get()
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  findAll(@CurrentUser() user) {
    return this.subAccountsService.findAll(user.userId);
  }

  @Get(':id')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.subAccountsService.findOne(id, user.userId);
  }

  @Patch(':id')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user,
    @Body() updateSubAccountDto: UpdateSubAccountDto
  ) {
    return this.subAccountsService.update(id, user.userId, updateSubAccountDto);
  }

  @Delete(':id')
  @Roles('admin', 'super_admin')
  @UseGuards(RolesGuard)
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user) {
    return this.subAccountsService.remove(id, user.userId);
  }
} 