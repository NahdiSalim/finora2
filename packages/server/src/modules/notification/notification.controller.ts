import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Request,
  Body,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  @ApiQuery({ name: 'read', required: false, type: Boolean })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'offset', required: false, type: Number })
  async getNotifications(
    @Request() req,
    @Query('read') read?: string,
    @Query('type') type?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string
  ) {
    const filters: any = {};

    if (read !== undefined) {
      filters.read = read === 'true';
    }

    if (type) {
      filters.type = type;
    }

    if (limit) {
      filters.limit = parseInt(limit, 10);
    }

    if (offset) {
      filters.offset = parseInt(offset, 10);
    }

    return this.notificationService.getUserNotifications(req.user.id, filters);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unùread notifications count' })
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and send a notification' })
  async createNotification(
    @Request() req,
    @Body()
    body: {
      userId?: number;
      recipientId?: number;
      title: string;
      message: string;
      type?: string;
      priority?: string;
      data?: any;
      actionUrl?: string;
    }
  ) {
    // Support both userId and recipientId for flexibility
    const recipientId = body.userId || body.recipientId;

    if (!recipientId) {
      throw new Error('userId or recipientId is required');
    }

    return this.notificationService.createNotification({
      recipientId,
      type: body.type || 'notification',
      title: body.title,
      message: body.message,
      data: body.data,
      actionUrl: body.actionUrl,
      priority: body.priority || 'normal',
    });
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.markAsRead(id, req.user.id);
  }

  @Post('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async deleteNotification(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notificationService.deleteNotification(id, req.user.id);
  }
}
