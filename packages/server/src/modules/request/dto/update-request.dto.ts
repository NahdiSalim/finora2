import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { RequestType, RequestUrgency } from './create-request.dto';

export enum RequestStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class UpdateRequestDto {
  @ApiProperty({ example: 'Demande mise à jour', required: false })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Sujet de la demande', required: false })
  @IsString()
  @IsOptional()
  topic?: string;

  @ApiProperty({ example: 'Description mise à jour', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: RequestType, required: false })
  @IsEnum(RequestType)
  @IsOptional()
  type?: RequestType;

  @ApiProperty({ enum: RequestUrgency, required: false })
  @IsEnum(RequestUrgency)
  @IsOptional()
  urgency?: RequestUrgency;

  @ApiProperty({ enum: RequestStatus, required: false })
  @IsEnum(RequestStatus)
  @IsOptional()
  status?: RequestStatus;

  @ApiProperty({
    example: 5,
    description:
      'ID of accountant or collaborator to assign request to. Send null or empty to unassign.',
    required: false,
  })
  @Transform(({ value }) => {
    if (value === '' || value === null || value === undefined) return null;
    const num = Number(value);
    return isNaN(num) ? null : num;
  })
  @Type(() => Number)
  @IsOptional()
  assignedToId?: number | null;

  @ApiProperty({ example: '2024-12-31', required: false })
  @IsString()
  @IsOptional()
  desiredResponseDate?: string;

  @ApiProperty({ example: '17:00', required: false })
  @IsString()
  @IsOptional()
  desiredResponseTime?: string;

  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'binary' },
    description: 'New attachments (optional)',
    required: false,
  })
  @IsOptional()
  attachments?: any;
}
