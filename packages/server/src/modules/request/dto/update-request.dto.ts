import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
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
}
