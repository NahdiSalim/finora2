import {
  Controller,
  Post,
  Get,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatbotService } from './chatbot.service';
import { AiInsightsService } from './ai-insights.service';
import { ChatMessageDto } from './dto/chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('chatbot')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
@Controller('chatbot')
@ApiBearerAuth('JWT-auth')
export class ChatbotController {
  private readonly logger = new Logger(ChatbotController.name);

  constructor(
    private readonly chatbotService: ChatbotService,
    private readonly aiInsightsService: AiInsightsService
  ) {}

  /** Upload a file/audio attachment for use in the next chatbot message */
  @Post('upload')
  @ApiOperation({ summary: 'Upload a file or audio attachment for the chatbot' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAttachment(@Req() req: AuthRequest, @UploadedFile() file: Express.Multer.File) {
    this.logger.log(`[upload] Request received — file present: ${!!file}, user: ${req.user?.id}`);
    if (!file) {
      this.logger.warn('[upload] No file in request — check FormData key = "file"');
      throw new BadRequestException(
        'Aucun fichier fourni. Assurez-vous d\'utiliser le champ "file".'
      );
    }
    const companyId = req.user!.companyId;
    if (!companyId) {
      return { status: 'error', message: "Votre compte n'est pas associé à une entreprise." };
    }
    return this.chatbotService.uploadAttachment(companyId, file);
  }

  /** Send a message — creates a new session if sessionId is omitted */
  @Post('message')
  @ApiOperation({ summary: 'Send a message to the financial chatbot agent' })
  async sendMessage(@Req() req: AuthRequest, @Body() dto: ChatMessageDto) {
    if (!dto.message?.trim() && !dto.attachment?.objectPath) {
      throw new BadRequestException('Le message ne peut pas être vide.');
    }

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
      dto.sessionId,
      dto.attachment
    );

    return { status: 'success', reply, toolsUsed, sessionId };
  }

  /** Stream a chatbot response via Server-Sent Events */
  @Post('message/stream')
  @ApiOperation({ summary: 'Stream a chatbot response via SSE (text/event-stream)' })
  async streamMessage(@Req() req: AuthRequest, @Body() dto: ChatMessageDto, @Res() res: Response) {
    if (!dto.message?.trim() && !dto.attachment?.objectPath) {
      res.status(400).json({ status: 'error', message: 'Le message ne peut pas être vide.' });
      return;
    }

    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      res
        .status(400)
        .json({ status: 'error', message: "Votre compte n'est pas associé à une entreprise." });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const emit = (event: string, data: Record<string, unknown>) => {
      if (!res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    try {
      await this.chatbotService.chatStream(
        userId,
        companyId,
        (dto.message ?? '').trim(),
        dto.sessionId,
        dto.confirmId,
        dto.attachment,
        emit
      );
    } catch {
      emit('error', { message: "Une erreur inattendue s'est produite." });
    } finally {
      if (!res.writableEnded) res.end();
    }
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

  /** Get proactive AI insights for the current company */
  @Get('insights')
  @ApiOperation({ summary: 'Get proactive AI insights for the current company' })
  async getInsights(@Req() req: AuthRequest) {
    const companyId = req.user!.companyId;
    if (!companyId) {
      return {
        status: 'error',
        message: "Votre compte n'est pas associé à une entreprise.",
        data: [],
      };
    }
    try {
      const insights = await this.aiInsightsService.getInsights(companyId);
      return { status: 'success', data: insights };
    } catch (err: any) {
      this.logger.error(`[insights] ERROR — ${err?.message}`, err?.stack);
      return { status: 'error', message: 'Erreur lors du calcul des insights.', data: [] };
    }
  }
}
