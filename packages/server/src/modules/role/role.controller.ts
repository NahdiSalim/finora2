import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import type { Response } from 'express';

import {
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateRoleDto } from './reate-role.dto';
import { JwtAuthGuard } from '../auth/guards';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';

@ApiTags('roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get()
  @RequirePermission('view_role')
  @ApiOkResponse({ description: 'List of roles with pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'admin' })
  async findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.roleService.findAll(page, limit, search);
  }

  @Get('tasks')
  @RequirePermission('view_role')
  @ApiOkResponse({ description: 'Fetch all  tasks' })
  async findAllTasks() {
    return this.roleService.findAllTasks();
  }

  @Get('export')
  @RequirePermission('view_role')
  @ApiOperation({ summary: 'Export all roles to Excel/CSV format' })
  @ApiOkResponse({ description: 'Roles exported successfully' })
  async exportRoles(
    @Query('lang') lang: 'fr' | 'en' = 'fr',
    @Res() res: Response,
  ) {
    const csvBuffer = await this.roleService.exportRoles(lang);

    const fileName = `role${lang}_${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', csvBuffer.length);

    return res.send(csvBuffer);
  }

  @Get(':id')
  @RequirePermission('view_detail_role')
  @ApiOkResponse({ description: 'role' })
  async findOne(@Param('id') id: number) {
    return await this.roleService.getOne(id);
  }

  @Post()
  @RequirePermission('add_role')
  @ApiCreatedResponse({ description: 'Role created successfully' })
  async create(@Body() createRoleDto: CreateRoleDto) {
    return await this.roleService.create(createRoleDto);
  }

  @Put(':id')
  @RequirePermission('edit_role')
  @ApiOperation({ summary: 'Update a role and its associations' })
  @ApiResponse({ status: 200, description: 'Role updated successfully.' })
  @ApiResponse({ status: 404, description: 'Role not found.' })
  async update(@Param('id') id: number, @Body() updateRoleDto: CreateRoleDto) {
    return await this.roleService.updateRole(id, updateRoleDto);
  }

  @Delete(':id')
  @RequirePermission('delete_role')
  @ApiOkResponse({ description: 'Role deleted successfully' })
  @ApiNotFoundResponse({ description: 'Role not found' })
  async delete(@Param('id') id: number) {
    return await this.roleService.deleteRole(id);
  }
}
