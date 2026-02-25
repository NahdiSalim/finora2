import { IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateStorageQuotaDto {
  @ApiProperty({
    description: 'Storage quota in GB',
    example: 50,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  quotaGB: number;

  @ApiProperty({
    description: 'Alert threshold (0.0 to 1.0, e.g., 0.8 for 80%)',
    example: 0.8,
    required: false,
    minimum: 0,
    maximum: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  alertThreshold?: number;
}
