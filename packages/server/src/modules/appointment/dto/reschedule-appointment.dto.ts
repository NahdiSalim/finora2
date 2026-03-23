import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Matches } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class RescheduleAppointmentDto {
  @ApiProperty({ example: '2026-04-25', description: 'Nouvelle date (YYYY-MM-DD)' })
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, { message: 'date doit être au format YYYY-MM-DD' })
  date: string;

  @ApiProperty({ example: '14:00', description: 'Nouvelle heure (HH:MM)' })
  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, { message: 'hour doit être au format HH:MM' })
  hour: string;

  @ApiProperty({ example: 'Proposition de nouveau créneau', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
