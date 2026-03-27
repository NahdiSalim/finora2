import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { RequestService } from './request.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto } from './dto/update-request.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { ConvertToTaskDto } from './dto/convert-to-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('requests')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('requests')
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  /**
   * Create a new request (Client)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('CLIENT')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Client] Create a new request with optional attachments' })
  @ApiResponse({ status: 201, description: 'Request created successfully' })
  async createRequest(
    @Body() dto: CreateRequestDto,
    @Req() req: AuthRequest,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    console.log('Controller received DTO:', dto);
    console.log('Controller received files:', files?.length || 0);
    const clientId = req.user!.id;
    return this.requestService.createRequest(dto, clientId, files);
  }

  /**
   * Get my requests (Client)
   */
  @Get('my-requests')
  @UseGuards(RolesGuard)
  @Roles('CLIENT')
  @ApiOperation({ summary: '[Client] Get my requests' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'in_progress', 'resolved', 'rejected', 'cancelled'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['urgency', 'status', 'createdAt'],
    example: 'createdAt',
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by subject, topic, description, or type',
  })
  async getMyRequests(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: 'urgency' | 'status' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string
  ) {
    const clientId = req.user!.id;
    return this.requestService.getMyRequests(
      clientId,
      page || 1,
      limit || 10,
      status,
      sortBy,
      sortOrder,
      search
    );
  }

  /**
   * Get my assigned requests (Accountant)
   */
  @Get('assigned-to-me')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Get requests assigned to me' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'in_progress', 'resolved', 'rejected', 'cancelled'],
  })
  @ApiQuery({
    name: 'urgency',
    required: false,
    enum: ['low', 'normal', 'high', 'urgent'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['urgency', 'status', 'createdAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by subject, topic, description, type, or client name',
  })
  async getMyAssignedRequests(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
    @Query('sortBy') sortBy?: 'urgency' | 'status' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string
  ) {
    const accountantId = req.user!.id;
    return this.requestService.getMyAssignedRequests(
      accountantId,
      page || 1,
      limit || 10,
      status,
      urgency,
      sortBy,
      sortOrder,
      search
    );
  }

  /**
   * Get all unassigned requests (Accountant) - Client requests waiting for assignment
   */
  @Get('all')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Get all unassigned client requests' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'in_progress', 'resolved', 'rejected', 'cancelled'],
  })
  @ApiQuery({
    name: 'urgency',
    required: false,
    enum: ['low', 'normal', 'high', 'urgent'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['urgency', 'status', 'createdAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    enum: ['asc', 'desc'],
    example: 'desc',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by subject, topic, description, type, or client name',
  })
  async getAllRequests(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('urgency') urgency?: string,
    @Query('sortBy') sortBy?: 'urgency' | 'status' | 'createdAt',
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('search') search?: string
  ) {
    const accountantId = req.user!.id;
    return this.requestService.getAllRequests(
      accountantId,
      page || 1,
      limit || 10,
      status,
      urgency,
      sortBy,
      sortOrder,
      search
    );
  }

  /**
   * Get request by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get request details by ID' })
  @ApiResponse({ status: 200, description: 'Request details' })
  @ApiResponse({ status: 404, description: 'Request not found' })
  async getRequestById(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.requestService.getRequestById(id, userId);
  }

  /**
   * Update request
   */
  @Put(':id')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update request with optional new attachments' })
  @ApiResponse({ status: 200, description: 'Request updated successfully' })
  async updateRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRequestDto,
    @Req() req: AuthRequest,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const userId = req.user!.id;
    return this.requestService.updateRequest(id, dto, userId, files);
  }

  /**
   * Respond to request (Accountant)
   */
  @Post(':id/respond')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @UseInterceptors(FilesInterceptor('responseAttachments', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Accountant] Respond to a client request with optional attachments' })
  @ApiResponse({ status: 200, description: 'Response sent successfully' })
  async respondToRequest(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RespondRequestDto,
    @Req() req: AuthRequest,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const accountantId = req.user!.id;
    return this.requestService.respondToRequest(id, dto, accountantId, files);
  }

  /**
   * Convert request to task (Accountant)
   */
  @Post(':id/convert-to-task')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({
    summary: '[Accountant] Convert request to task and assign to collaborator',
  })
  @ApiResponse({ status: 201, description: 'Request converted to task successfully' })
  async convertToTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertToTaskDto,
    @Req() req: AuthRequest
  ) {
    const accountantId = req.user!.id;
    return this.requestService.convertToTask(id, dto, accountantId);
  }

  /**
   * Delete request (Client only)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('CLIENT')
  @ApiOperation({ summary: '[Client] Delete request' })
  @ApiResponse({ status: 200, description: 'Request deleted successfully' })
  async deleteRequest(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.requestService.deleteRequest(id, userId);
  }
}
