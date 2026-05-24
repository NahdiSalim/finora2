import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  UseGuards,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('chatbot')
@UseGuards(JwtAuthGuard)
@Controller('chatbot')
@ApiBearerAuth('JWT-auth')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /** Send a message — creates a new session if sessionId is omitted */
  @Post('message')
  @ApiOperation({ summary: 'Send a message to the financial chatbot agent' })
  async sendMessage(@Req() req: AuthRequest, @Body() dto: ChatMessageDto) {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        reply: "Votre compte n'est pas associé à une entreprise.",
      };
    }

    const { reply, toolsUsed, sessionId } = await this.chatbotService.chat(
      userId,
      companyId,
      dto.message,
      dto.sessionId
    );

    return { status: 'success', reply, toolsUsed, sessionId };
  }

  /** List all sessions for the current user */
  @Get('sessions')
  @ApiOperation({ summary: 'List all chatbot sessions for the current user' })
  async getSessions(@Req() req: AuthRequest) {
    const userId = req.user!.id;
    const companyId = req.user!.companyId!;
    const sessions = await this.chatbotService.getSessions(userId, companyId);
    return { status: 'success', data: sessions };
  }

  /** Get a single session with all its messages */
  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get a chatbot session with its full message history' })
  async getSession(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const session = await this.chatbotService.getSession(id, req.user!.id);
    if (!session) throw new NotFoundException('Session not found');
    return { status: 'success', data: session };
  }

  /** Rename a session */
  @Patch('sessions/:id/rename')
  @ApiOperation({ summary: 'Rename a chatbot session' })
  async renameSession(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body('title') title: string
  ) {
    const result = await this.chatbotService.renameSession(id, req.user!.id, title);
    if (!result) throw new NotFoundException('Session not found');
    return { status: 'success', data: result };
  }

  /** Delete a session and all its messages */
  @Delete('sessions/:id')
  @ApiOperation({ summary: 'Delete a chatbot session' })
  async deleteSession(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const ok = await this.chatbotService.deleteSession(id, req.user!.id);
    if (!ok) throw new NotFoundException('Session not found');
    return { status: 'success', message: 'Session deleted' };
  }
}
