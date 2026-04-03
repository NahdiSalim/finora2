import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsNumber } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class SendMessageDto {
  @ApiProperty({ description: 'ID de la salle de chat', type: 'number' })
  @Type(() => Number)
  @IsNumber()
  roomId: number;

  @ApiPropertyOptional({ description: 'ID du thread (pour les réponses)', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  threadId?: number;

  @ApiProperty({ description: 'Contenu du message' })
  @IsString()
  content: string;

  @ApiProperty({
    description: 'Type de message',
    enum: ['text', 'file', 'image', 'system', 'call'],
    default: 'text',
  })
  @IsEnum(['text', 'file', 'image', 'system', 'call'])
  type: string = 'text';

  @ApiPropertyOptional({
    description: 'IDs des utilisateurs mentionnés (séparés par des virgules)',
    type: 'string',
    example: '1,2,3',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.split(',').map((id) => parseInt(id.trim(), 10));
    }
    return value;
  })
  mentions?: number[];

  @ApiPropertyOptional({ description: 'ID du document lié', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  documentId?: number;

  @ApiPropertyOptional({ description: 'ID de la demande liée', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  requestId?: number;

  @ApiPropertyOptional({ description: 'ID de la tâche liée', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taskId?: number;

  @ApiPropertyOptional({ description: 'ID du rendez-vous lié', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  appointmentId?: number;

  @ApiPropertyOptional({ description: "ID de l'appel lié", type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  callId?: number;

  @ApiPropertyOptional({
    description: 'Fichiers attachés (max 10)',
    type: 'array',
    items: { type: 'string', format: 'binary' },
  })
  attachments?: any[];
}
