import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import {
  ChatMessagesResponseDto,
  ChatSessionResponseDto,
} from './dto/chat-session.dto';
import { JwtAuthGuard } from '../auth/guards';

@ApiTags('Chat')
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new chat session' })
  @ApiResponse({
    status: 201,
    description: 'Chat session created successfully',
    type: ChatSessionResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to start chat session',
  })
  async startChatSession(): Promise<ChatSessionResponseDto> {
    return this.chatService.startChatSession();
  }

  @Get('messages/:sessionId')
  @ApiOperation({ summary: 'Get all messages for a chat session' })
  @ApiParam({
    name: 'sessionId',
    description: 'Chat session ID',
    example: 'abc123-def456-ghi789',
  })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    type: ChatMessagesResponseDto,
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to get messages',
  })
  async getMessages(
    @Param('sessionId') sessionId: string,
  ): Promise<ChatMessagesResponseDto> {
    return this.chatService.getAllMessages(sessionId);
  }

  @Post('send_message')
  @ApiOperation({ summary: 'Send a message to the chat session' })
  @ApiQuery({
    name: 'session_id',
    description: 'Chat session ID',
    example: 'abc123-def456-ghi789',
    required: true,
  })
  @ApiQuery({
    name: 'question',
    description: 'The message/question to send',
    example: 'What is the weather today?',
    required: true,
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent successfully',
  })
  @ApiResponse({
    status: 500,
    description: 'Failed to send message',
  })
  async sendMessage(
    @Query('session_id') sessionId: string,
    @Query('question') question: string,
  ) {
    return this.chatService.sendMessage(sessionId, question);
  }
}
