import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class RescheduleAppointmentDto {
  @ApiProperty({
    example: '2026-03-25T14:00:00Z',
    description: 'New start time',
  })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({
    example: '2026-03-25T15:00:00Z',
    description: 'New end time',
  })
  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @ApiProperty({
    example: 'Proposition de nouveau créneau',
    description: 'Reason for rescheduling',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
