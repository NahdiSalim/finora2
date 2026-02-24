import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class SuspendAccountantDto {
  @ApiProperty({
    example: 'Non-respect des conditions générales',
    description: 'Reason for suspension',
    required: false,
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
