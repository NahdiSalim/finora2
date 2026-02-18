import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum ComparisonStatus {
  DIRECT = 'DE',
  INDIRECT = 'IN',
}

export class CompareProfilesDto {
  @ApiProperty({
    example: 12,
    description: 'ID of the main profile program',
  })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  profile_program_id: number;

  @ApiProperty({
    example: 27,
    description: 'ID of the profile program to compare with',
  })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  compared_program_id: number;

  @ApiProperty({
    enum: ComparisonStatus,
    example: ComparisonStatus.DIRECT,
    description: 'Comparison direction (DE = direct, IN = indirect)',
  })
  @IsEnum(ComparisonStatus)
  status: ComparisonStatus;
}
