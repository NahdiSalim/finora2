import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, Matches, IsArray, IsEmail } from 'class-validator';
import { AppointmentType, MeetingType } from './create-appointment.dto';

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

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

  @ApiProperty({
    example: '2026-04-20',
    description: 'Date du rendez-vous (YYYY-MM-DD)',
    required: false,
  })
  @IsString()
  @Matches(DATE_REGEX, { message: 'date doit être au format YYYY-MM-DD' })
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '14:00', description: 'Heure du rendez-vous (HH:MM)', required: false })
  @IsString()
  @Matches(TIME_REGEX, { message: 'hour doit être au format HH:MM' })
  @IsOptional()
  hour?: string;

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

  @ApiProperty({ example: '#e53935', required: false })
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, { message: 'color doit être un code hex valide' })
  @IsOptional()
  color?: string;

  @ApiProperty({ example: ['guest@example.com'], required: false, type: [String] })
  @IsArray()
  @IsEmail({}, { each: true })
  @IsOptional()
  guests?: string[];
}
