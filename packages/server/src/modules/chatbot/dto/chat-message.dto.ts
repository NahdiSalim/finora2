import { IsString, IsNumber, IsOptional, MaxLength, IsObject } from 'class-validator';

/** Metadata returned by POST /chatbot/upload and carried in subsequent message requests. */
export interface ChatAttachmentMeta {
  url: string; // presigned URL (short-lived — not persisted; only used for immediate display)
  name: string; // original filename
  mimeType: string; // MIME type
  size: number; // bytes
  objectPath: string; // MinIO object key — persisted in DB for URL regeneration
}

export class ChatMessageDto {
  @IsString()
  @MaxLength(4000)
  message!: string;

  /** If provided, continues an existing session. If omitted, a new session is created. */
  @IsNumber()
  @IsOptional()
  sessionId?: number;

  /** UUID confirming a pending write action. Only present when message === '__CONFIRM__'. */
  @IsString()
  @IsOptional()
  @MaxLength(64)
  confirmId?: string;

  /**
   * Attachment metadata from a prior POST /chatbot/upload.
   * class-validator does not deep-validate this object — it is already validated
   * by the upload endpoint before being returned to the client.
   */
  @IsObject()
  @IsOptional()
  attachment?: ChatAttachmentMeta;
}

// Keep for backward compat
export class ChatHistoryItemDto {
  role!: 'user' | 'assistant';
  content!: string;
}
