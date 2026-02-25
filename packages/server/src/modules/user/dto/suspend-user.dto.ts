import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SuspendUserDto {
  @ApiProperty({
    example: "Violation des conditions d'utilisation",
    description: 'Reason for suspension (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
