import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export class CreateLeaveDto {
  @ApiProperty({ example: '2026-05-01', description: 'Date début du congé (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'startDate doit être au format YYYY-MM-DD' })
  startDate: string;

  @ApiProperty({ example: '2026-05-10', description: 'Date fin du congé (YYYY-MM-DD)' })
  @IsString()
  @Matches(DATE_REGEX, { message: 'endDate doit être au format YYYY-MM-DD' })
  endDate: string;

  @ApiProperty({ example: 'Vacances annuelles', required: false })
  @IsString()
  @IsOptional()
  reason?: string;
}
