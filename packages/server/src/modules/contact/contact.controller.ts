import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
  Ip,
  Headers,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators';
import { ContactService } from './contact.service';
import { SendContactMessageDto } from './dto/send-contact-message.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post('accountant/:accountantId')
  @Public()
  @ApiOperation({
    summary: 'Envoyer un message de contact à un comptable (visiteur non inscrit)',
    description: 'Permet à un visiteur de contacter un comptable avant inscription',
  })
  async sendContactMessage(
    @Param('accountantId', ParseIntPipe) accountantId: number,
    @Body() dto: SendContactMessageDto,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent: string
  ) {
    return this.contactService.sendContactMessage(accountantId, dto, ipAddress, userAgent);
  }

  @Get('messages')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtenir les messages de contact reçus (comptable uniquement)',
  })
  @ApiQuery({ name: 'status', required: false, enum: ['new', 'read', 'replied', 'archived'] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getContactMessages(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    return this.contactService.getContactMessages(req.user.id, filters);
  }

  @Get('messages/:messageId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtenir un message de contact par ID',
  })
  async getContactMessageById(@Request() req, @Param('messageId', ParseIntPipe) messageId: number) {
    return this.contactService.getContactMessageById(messageId, req.user.id);
  }

  @Put('messages/:messageId/replied')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Marquer un message comme répondu',
  })
  async markAsReplied(@Request() req, @Param('messageId', ParseIntPipe) messageId: number) {
    return this.contactService.markAsReplied(messageId, req.user.id);
  }

  @Put('messages/:messageId/archive')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Archiver un message',
  })
  async archiveMessage(@Request() req, @Param('messageId', ParseIntPipe) messageId: number) {
    return this.contactService.archiveMessage(messageId, req.user.id);
  }

  @Delete('messages/:messageId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Supprimer un message',
  })
  async deleteMessage(@Request() req, @Param('messageId', ParseIntPipe) messageId: number) {
    return this.contactService.deleteMessage(messageId, req.user.id);
  }
}
