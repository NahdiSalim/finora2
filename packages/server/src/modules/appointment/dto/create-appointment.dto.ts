import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export enum AppointmentType {
  MEETING = 'meeting',
  CONSULTATION = 'consultation',
  REVIEW = 'review',
  OTHER = 'other',
}

export enum MeetingType {
  IN_PERSON = 'in_person',
  ONLINE = 'online',
  PHONE = 'phone',
}

export class CreateAppointmentDto {
  @ApiProperty({ example: 'Réunion de consultation fiscale', description: 'Appointment title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Discussion sur la déclaration fiscale annuelle',
    description: 'Appointment description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'consultation',
    enum: AppointmentType,
    description: 'Appointment type',
    default: AppointmentType.MEETING,
  })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiProperty({
    example: '2026-03-20T10:00:00Z',
    description: 'Appointment start time',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: '2026-03-20T11:00:00Z',
    description: 'Appointment end time',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    example: 'online',
    enum: MeetingType,
    description: 'Meeting type',
    default: MeetingType.IN_PERSON,
  })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiProperty({
    example: 'https://meet.google.com/abc-defg-hij',
    description: 'Meeting location or link',
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({
    example: 2,
    description: 'Accountant ID (optional - can be assigned later)',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  accountantId?: number;

  @ApiProperty({
    example: 5,
    description: 'ID du slot de disponibilité choisi (retourné par GET /appointments/slots)',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  availabilitySlotId?: number;

  @ApiProperty({
    example: 'Documents à préparer: bilans, factures',
    description: 'Client notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  clientNotes?: string;
}
