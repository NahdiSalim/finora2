import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsArray,
  IsEmail,
  Matches,
} from 'class-validator';
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

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateAppointmentDto {
  @ApiProperty({ example: 'Réunion de consultation fiscale' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Discussion sur la déclaration fiscale annuelle', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    example: 'consultation',
    enum: AppointmentType,
    default: AppointmentType.MEETING,
    required: false,
  })
  @IsEnum(AppointmentType)
  @IsOptional()
  type?: AppointmentType;

  @ApiProperty({ example: '2026-04-15', description: 'Date du rendez-vous (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: 'date doit être au format YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: '09:00', description: 'Heure du rendez-vous (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'hour doit être au format HH:MM ex: 09:00' })
  hour: string;

  @ApiProperty({
    example: 'online',
    enum: MeetingType,
    default: MeetingType.IN_PERSON,
    required: false,
  })
  @IsEnum(MeetingType)
  @IsOptional()
  meetingType?: MeetingType;

  @ApiProperty({ example: 'https://meet.google.com/abc-defg-hij', required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ example: 2, description: 'Accountant ID', required: false })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  accountantId?: number;

  @ApiProperty({
    example: 3,
    description: 'Client ID (used when accountant creates the appointment)',
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  clientId?: number;

  @ApiProperty({ example: 'Documents à préparer: bilans, factures', required: false })
  @IsString()
  @IsOptional()
  clientNotes?: string;

  @ApiProperty({
    example: '#1976d2',
    description: 'Couleur hex pour affichage calendrier',
    required: false,
  })
  @IsString()
  @Matches(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/, {
    message: 'color doit être un code hex valide ex: #1976d2',
  })
  @IsOptional()
  color?: string;

  @ApiProperty({
    example: ['guest1@example.com', 'guest2@example.com'],
    description: 'Liste des emails des invités — un email de convocation leur sera envoyé',
    required: false,
    type: [String],
  })
  @IsArray()
  @IsEmail({}, { each: true, message: 'Chaque guest doit être un email valide' })
  @IsOptional()
  guests?: string[];
}
