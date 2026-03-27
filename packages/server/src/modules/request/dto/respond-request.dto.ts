import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class RespondRequestDto {
  @ApiProperty({
    example: 'Votre demande a été traitée. Voici les documents nécessaires...',
    description: 'Response text to the request',
    required: false,
  })
  @IsString()
  @IsOptional()
  response?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Response attachments (files)',
    required: false,
  })
  @IsOptional()
  responseAttachments?: any[];
}
