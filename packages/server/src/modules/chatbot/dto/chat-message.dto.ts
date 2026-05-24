import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class ChatMessageDto {
  @IsString()
  @IsNotEmpty()
  message: string;

  /** If provided, continues an existing session. If omitted, a new session is created. */
  @IsNumber()
  @IsOptional()
  sessionId?: number;
}

// Keep for backward compat
export class ChatHistoryItemDto {
  role: 'user' | 'assistant';
  content: string;
}
