import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { AppointmentType, MeetingType } from './create-appointment.dto';

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export class UpdateAppointmentDto {
  @ApiProperty({ example: 'Titre mis à jour', required: false })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiProperty({ example: 'Description mise à jour', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: AppointmentType, required: false })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiProperty({ example: '2026-03-20T10:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '2026-03-20T11:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;

  @ApiProperty({ enum: MeetingType, required: false })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiProperty({ example: 'Nouvelle adresse ou lien', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ enum: AppointmentStatus, required: false })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;

  @ApiProperty({ example: 'Notes du client', required: false })
  @IsString()
  @IsOptional()
  clientNotes?: string;

  @ApiProperty({ example: 'Notes du comptable', required: false })
  @IsString()
  @IsOptional()
  accountantNotes?: string;
}
