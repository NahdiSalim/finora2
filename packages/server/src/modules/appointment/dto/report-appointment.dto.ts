import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class ReportAppointmentDto {
  @ApiProperty({ example: '2026-05-20', description: 'Nouvelle date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: 'newDate doit être au format YYYY-MM-DD' })
  newDate: string;

  @ApiProperty({ example: '14:00', description: 'Nouvelle heure (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'newHour doit être au format HH:MM' })
  newHour: string;

  @ApiProperty({ example: 'Indisponibilité imprévue', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
