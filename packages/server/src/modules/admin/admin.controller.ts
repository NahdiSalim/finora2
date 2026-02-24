import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { AdminService } from './admin.service';
import { CreateAccountantDto } from './dto/create-accountant.dto';
import { UpdateAccountantDto } from './dto/update-accountant.dto';
import { SuspendAccountantDto } from './dto/suspend-accountant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Admin - Accountant Management')
@ApiBearerAuth('JWT-auth')
@Controller('admin/accountants')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMINISTRATOR')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('pending')
  @ApiOperation({ summary: 'Get all pending accountants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of pending accountants' })
  async getPendingAccountants(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.adminService.getPendingAccountants(page, limit);
  }

  @Get()
  @ApiOperation({ summary: 'Get all accountants' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'List of all accountants' })
  async getAllAccountants(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string
  ) {
    return this.adminService.getAllAccountants(page, limit, search);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get accountant by ID' })
  @ApiResponse({ status: 200, description: 'Accountant details' })
  @ApiResponse({ status: 404, description: 'Accountant not found' })
  async getAccountantById(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.getAccountantById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new accountant account' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Accountant created successfully' })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'patentFile', maxCount: 1 },
      { name: 'rneFile', maxCount: 1 },
    ])
  )
  async createAccountant(
    @Body() dto: CreateAccountantDto,
    @UploadedFiles() files: { patentFile?: Express.Multer.File[]; rneFile?: Express.Multer.File[] }
  ) {
    return this.adminService.createAccountant(dto, files);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update accountant information' })
  @ApiResponse({ status: 200, description: 'Accountant updated successfully' })
  @ApiResponse({ status: 404, description: 'Accountant not found' })
  async updateAccountant(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAccountantDto) {
    return this.adminService.updateAccountant(id, dto);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate a pending accountant account' })
  @ApiResponse({ status: 200, description: 'Accountant activated successfully' })
  @ApiResponse({ status: 404, description: 'Accountant not found' })
  async activateAccountant(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.activateAccountant(id);
  }

  @Put(':id/suspend')
  @ApiOperation({ summary: 'Suspend an accountant account' })
  @ApiResponse({ status: 200, description: 'Accountant suspended successfully' })
  @ApiResponse({ status: 404, description: 'Accountant not found' })
  async suspendAccountant(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SuspendAccountantDto
  ) {
    return this.adminService.suspendAccountant(id, dto.reason);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an accountant account' })
  @ApiResponse({ status: 200, description: 'Accountant deleted successfully' })
  @ApiResponse({ status: 404, description: 'Accountant not found' })
  async deleteAccountant(@Param('id', ParseIntPipe) id: number) {
    return this.adminService.deleteAccountant(id);
  }
}
