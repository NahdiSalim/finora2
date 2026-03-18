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
  ApiConsumes,
  ApiResponse,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { ValidateTaskDto } from './dto/validate-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('tasks')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  /**
   * Create a new task (Accountant)
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '[Accountant] Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  async createTask(
    @Body() dto: CreateTaskDto,
    @Req() req: AuthRequest,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const userId = req.user!.id;
    return this.taskService.createTask(dto, userId, files);
  }

  /**
   * Get my assigned tasks (Collaborator)
   */
  @Get('my-tasks')
  @ApiOperation({ summary: '[Collaborator] Get my assigned tasks' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['low', 'medium', 'high', 'urgent'],
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['priority', 'dueDate', 'createdAt'],
  })
  async getMyTasks(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('sortBy') sortBy?: 'priority' | 'dueDate' | 'createdAt'
  ) {
    const userId = req.user!.id;
    return this.taskService.getMyTasks(userId, page || 1, limit || 10, status, priority, sortBy);
  }

  /**
   * Get tasks created by me (Accountant)
   */
  @Get('my-created-tasks')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Get tasks I created' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
  })
  async getMyCreatedTasks(
    @Req() req: AuthRequest,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string
  ) {
    const userId = req.user!.id;
    return this.taskService.getMyCreatedTasks(userId, page || 1, limit || 10, status);
  }

  /**
   * Get task by ID
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get task details by ID' })
  @ApiResponse({ status: 200, description: 'Task details' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskById(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.taskService.getTaskById(id, userId);
  }

  /**
   * Update task
   */
  @Put(':id')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update task with optional file attachments' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  async updateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTaskDto,
    @Req() req: AuthRequest,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const userId = req.user!.id;
    const userRole = req.user!.role?.code;
    return this.taskService.updateTask(id, dto, userId, files, userRole);
  }

  /**
   * Start task (mark as in progress)
   */
  @Put(':id/start')
  @ApiOperation({ summary: '[Collaborator] Mark task as in progress' })
  @ApiResponse({ status: 200, description: 'Task started' })
  async startTask(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.taskService.startTask(id, userId);
  }

  /**
   * Submit task for review (Collaborator)
   */
  @Put(':id/review')
  @ApiOperation({ summary: '[Collaborator] Submit task for review' })
  @ApiResponse({ status: 200, description: 'Task submitted for review' })
  async submitForReview(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.taskService.submitForReview(id, userId);
  }

  /**
   * Complete task (Accountant only)
   */
  @Put(':id/complete')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Mark task as completed' })
  @ApiResponse({ status: 200, description: 'Task completed' })
  async completeTask(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.taskService.completeTask(id, userId);
  }

  /**
   * Add comment to task
   */
  @Post(':id/comments')
  @UseInterceptors(FilesInterceptor('attachments', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add comment to task with attachments' })
  @ApiResponse({ status: 201, description: 'Comment added successfully' })
  async addComment(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AddCommentDto,
    @Req() req: AuthRequest,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    const userId = req.user!.id;
    return this.taskService.addComment(id, dto, userId, files);
  }

  /**
   * Validate task (Accountant)
   */
  @Post(':id/validate')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Validate or reject completed task' })
  @ApiResponse({ status: 200, description: 'Task validated' })
  async validateTask(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ValidateTaskDto,
    @Req() req: AuthRequest
  ) {
    const userId = req.user!.id;
    return this.taskService.validateTask(id, dto, userId);
  }

  /**
   * Get task history
   */
  @Get('history/all')
  @ApiOperation({ summary: 'Get task history with filters' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['todo', 'in_progress', 'completed', 'cancelled'],
  })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  async getTaskHistory(
    @Req() req: AuthRequest,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number
  ) {
    const userId = req.user!.id;
    return this.taskService.getTaskHistory(
      userId,
      startDate,
      endDate,
      status,
      page || 1,
      limit || 20
    );
  }

  /**
   * Delete task (Accountant only)
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ACCOUNTANT')
  @ApiOperation({ summary: '[Accountant] Delete task' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  async deleteTask(@Param('id', ParseIntPipe) id: number, @Req() req: AuthRequest) {
    const userId = req.user!.id;
    return this.taskService.deleteTask(id, userId);
  }
}
