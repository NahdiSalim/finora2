import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class UpdateAvailabilityDto {
  @ApiProperty({ example: '08:00', required: false })
  @IsString()
  @Matches(TIME_REGEX, { message: 'startTime must be HH:MM' })
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '18:00', required: false })
  @IsString()
  @Matches(TIME_REGEX, { message: 'endTime must be HH:MM' })
  @IsOptional()
  endTime?: string;

  @ApiProperty({ example: 30, required: false })
  @IsInt()
  @Min(15)
  @Max(480)
  @Type(() => Number)
  @IsOptional()
  slotDuration?: number;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
