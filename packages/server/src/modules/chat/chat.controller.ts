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
  Request,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChatService } from './chat.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ==================== ROOMS ====================

  @Post('rooms')
  @ApiOperation({ summary: 'Créer une salle de chat' })
  @ApiResponse({ status: 201, description: 'Salle créée avec succès' })
  async createRoom(@Request() req, @Body() dto: CreateRoomDto) {
    return this.chatService.createRoom(req.user.sub, dto);
  }

  @Get('rooms')
  @ApiOperation({ summary: "Obtenir toutes les salles de l'utilisateur" })
  @ApiResponse({ status: 200, description: 'Liste des salles' })
  async getUserRooms(@Request() req) {
    return this.chatService.getUserRooms(req.user.sub);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Obtenir une salle par ID' })
  @ApiResponse({ status: 200, description: 'Détails de la salle' })
  async getRoomById(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.chatService.getRoomById(id, req.user.sub);
  }

  @Post('rooms/:id/participants')
  @ApiOperation({ summary: 'Ajouter un participant à une salle' })
  @ApiResponse({ status: 200, description: 'Participant ajouté' })
  async addParticipant(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('participantId', ParseIntPipe) participantId: number
  ) {
    return this.chatService.addParticipant(id, req.user.sub, participantId);
  }

  @Delete('rooms/:id/participants/:participantId')
  @ApiOperation({ summary: "Retirer un participant d'une salle" })
  @ApiResponse({ status: 200, description: 'Participant retiré' })
  async removeParticipant(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('participantId', ParseIntPipe) participantId: number
  ) {
    return this.chatService.removeParticipant(id, req.user.sub, participantId);
  }

  // ==================== MESSAGES ====================

  @Get('messages/search')
  @ApiOperation({ summary: 'Rechercher dans les messages' })
  @ApiResponse({ status: 200, description: 'Résultats de recherche' })
  async searchMessages(@Request() req, @Query() dto: SearchMessagesDto) {
    return this.chatService.searchMessages(req.user.sub, dto);
  }

  @Post('messages')
  @ApiOperation({ summary: 'Envoyer un message' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Message envoyé' })
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async sendMessage(
    @Request() req,
    @Body() dto: SendMessageDto,
    @UploadedFiles() files?: Express.Multer.File[]
  ) {
    return this.chatService.sendMessage(req.user.sub, dto, files);
  }

  @Get('rooms/:id/messages')
  @ApiOperation({ summary: "Obtenir les messages d'une salle" })
  @ApiResponse({ status: 200, description: 'Liste des messages' })
  async getRoomMessages(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', ParseIntPipe) limit: number = 50,
    @Query('page', ParseIntPipe) page: number = 1
  ) {
    return this.chatService.getRoomMessages(id, req.user.sub, limit, page);
  }

  @Put('messages/:id')
  @ApiOperation({ summary: 'Modifier un message' })
  @ApiResponse({ status: 200, description: 'Message modifié' })
  async editMessage(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('content') content: string
  ) {
    return this.chatService.editMessage(id, req.user.sub, content);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Supprimer un message' })
  @ApiResponse({ status: 200, description: 'Message supprimé' })
  async deleteMessage(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.chatService.deleteMessage(id, req.user.sub);
  }

  @Post('messages/:id/read')
  @ApiOperation({ summary: 'Marquer un message comme lu' })
  @ApiResponse({ status: 200, description: 'Message marqué comme lu' })
  async markAsRead(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.chatService.markAsRead(id, req.user.sub);
  }

  // ==================== THREADS ====================

  @Post('threads')
  @ApiOperation({ summary: 'Créer un thread de discussion' })
  @ApiResponse({ status: 201, description: 'Thread créé' })
  async createThread(
    @Request() req,
    @Body('title') title: string,
    @Body('contextType') contextType?: string,
    @Body('contextId') contextId?: number
  ) {
    return this.chatService.createThread(req.user.sub, title, contextType, contextId);
  }

  @Get('threads/:id/messages')
  @ApiOperation({ summary: "Obtenir les messages d'un thread" })
  @ApiResponse({ status: 200, description: 'Messages du thread' })
  async getThreadMessages(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.chatService.getThreadMessages(id, req.user.sub);
  }
}
