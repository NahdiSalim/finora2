import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PreComparaisonDto {
  @ApiProperty({
    example: 'Électronicien/Électronicienne pour la technique d’automatisation',
    description: 'Program name to analyse',
  })
  @IsString()
  @IsNotEmpty()
  reference_name: string;

  @ApiProperty({
    example: 'camembert',
    description: 'Comparison model',
  })
  @IsString()
  @IsNotEmpty()
  model: string;
  @ApiProperty({
    example: 'DIRECT',
    description: 'Comparison Direction',
  })
  @IsString()
  @IsNotEmpty()
  direction: string;
  @ApiProperty({
    example: 13,
    description: 'Number of similar programs to return',
  })
  @IsInt()
  @Type(() => Number)
  n: number;
}
