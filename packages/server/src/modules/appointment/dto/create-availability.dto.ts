import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export enum DayOfWeek {
  LUNDI = 'lundi',
  MARDI = 'mardi',
  MERCREDI = 'mercredi',
  JEUDI = 'jeudi',
  VENDREDI = 'vendredi',
  SAMEDI = 'samedi',
  DIMANCHE = 'dimanche',
}

export class CreateAvailabilityDto {
  @ApiProperty({
    example: true,
    description: 'true = créneau récurrent hebdomadaire | false = date ponctuelle unique',
  })
  @IsBoolean()
  isRecurring: boolean;

  @ApiProperty({
    enum: DayOfWeek,
    example: DayOfWeek.LUNDI,
    description: 'Jour de la semaine (requis si isRecurring=true)',
    required: false,
  })
  @IsIn(Object.values(DayOfWeek), {
    message: 'dayOfWeek doit être: lundi, mardi, mercredi, jeudi, vendredi, samedi ou dimanche',
  })
  @IsOptional()
  dayOfWeek?: DayOfWeek;

  @ApiProperty({
    example: '2026-04-15',
    description: 'Date spécifique YYYY-MM-DD (requise si isRecurring=false)',
    required: false,
  })
  @IsISO8601()
  @IsOptional()
  specificDate?: string;

  @ApiProperty({
    example: '09:00',
    description: 'Heure de début HH:MM',
  })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime doit être au format HH:MM (ex: 09:00)' })
  startTime: string;

  @ApiProperty({
    example: '17:00',
    description: 'Heure de fin HH:MM',
  })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime doit être au format HH:MM (ex: 17:00)' })
  endTime: string;

  @ApiProperty({
    example: 60,
    description: "Durée d'un slot en minutes (min: 15, max: 480)",
    required: false,
    default: 60,
  })
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  @IsOptional()
  slotDuration?: number;
}
