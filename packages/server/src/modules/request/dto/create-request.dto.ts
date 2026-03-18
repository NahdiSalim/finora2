import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt } from 'class-validator';

export enum RequestType {
  ACCOUNTING = 'accounting',
  TAX = 'tax',
  CONSULTATION = 'consultation',
  DOCUMENT = 'document',
  OTHER = 'other',
}

export enum RequestUrgency {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export class CreateRequestDto {
  @ApiProperty({ example: 'Demande de déclaration fiscale', description: 'Request subject' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: "J'ai besoin d'aide pour ma déclaration fiscale annuelle",
    description: 'Request description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'tax',
    enum: RequestType,
    description: 'Request type',
  })
  @IsEnum(RequestType)
  @IsNotEmpty()
  type: RequestType;

  @ApiProperty({
    example: 'high',
    enum: RequestUrgency,
    description: 'Request urgency',
    default: RequestUrgency.NORMAL,
  })
  @IsEnum(RequestUrgency)
  @IsOptional()
  urgency?: RequestUrgency;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'Attachments (optional)',
    required: false,
  })
  @IsOptional()
  attachments?: any;

  @ApiProperty({
    example: [1, 2, 3],
    description: 'IDs of existing documents from document management space',
    required: false,
    type: [Number],
  })
  @IsOptional()
  existingDocumentIds?: number[];

  @ApiProperty({
    example: 5,
    description: 'ID of the accountant (user) to send the request to',
    required: false,
    type: Number,
  })
  @IsInt()
  @IsOptional()
  accountantId?: number;
}
