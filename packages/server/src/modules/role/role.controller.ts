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

  @Get('export')
  @RequirePermission('view_role')
  @ApiOperation({ summary: 'Export all roles to Excel/CSV format' })
  @ApiOkResponse({ description: 'Roles exported successfully' })
  async exportRoles(@Query('lang') lang: 'fr' | 'en' = 'fr', @Res() res: Response) {
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

  // ==================== NEW PERMISSION MANAGEMENT ENDPOINTS ====================

  @Get('actions/all')
  @RequirePermission('view_role')
  @ApiOperation({ summary: 'Get all available actions with their page and feature information' })
  @ApiOkResponse({ description: 'List of all actions' })
  async getAllActions() {
    return this.roleService.getAllActions();
  }

  @Get(':id/permissions')
  @RequirePermission('view_detail_role')
  @ApiOperation({ summary: 'Get role permissions (actions grouped by feature and page)' })
  @ApiOkResponse({ description: 'Role permissions retrieved successfully' })
  async getRolePermissions(@Param('id') id: number) {
    return this.roleService.getRolePermissions(id);
  }

  @Put(':id/permissions')
  @RequirePermission('edit_role')
  @ApiOperation({
    summary: 'Update role permissions based on actions',
    description:
      'Replaces all existing permissions. Pages and features are automatically added based on selected actions.',
  })
  @ApiResponse({ status: 200, description: 'Permissions updated successfully' })
  async updateRolePermissions(
    @Param('id') id: number,
    @Body() dto: { actionIds: number[]; grantedById?: number }
  ) {
    return this.roleService.updateRolePermissions(id, dto.actionIds, dto.grantedById);
  }

  @Post(':id/permissions/add')
  @RequirePermission('edit_role')
  @ApiOperation({
    summary: 'Add actions to role permissions',
    description:
      'Adds new actions without removing existing ones. Pages and features are automatically added.',
  })
  @ApiResponse({ status: 200, description: 'Actions added successfully' })
  async addActionsToRole(
    @Param('id') id: number,
    @Body() dto: { actionIds: number[]; grantedById?: number }
  ) {
    return this.roleService.addActionsToRole(id, dto.actionIds, dto.grantedById);
  }

  @Post(':id/permissions/remove')
  @RequirePermission('edit_role')
  @ApiOperation({
    summary: 'Remove actions from role permissions',
    description:
      'Removes specific actions from the role. Note: Pages and features are not automatically removed.',
  })
  @ApiResponse({ status: 200, description: 'Actions removed successfully' })
  async removeActionsFromRole(@Param('id') id: number, @Body() dto: { actionIds: number[] }) {
    return this.roleService.removeActionsFromRole(id, dto.actionIds);
  }
}
