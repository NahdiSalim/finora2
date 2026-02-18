import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ExtractionType } from '../extraction.types';

export class CreateExtractionDto {
  @ApiProperty({
    enum: ExtractionType,
    description: 'Type of extraction',
  })
  @IsEnum(ExtractionType)
  type: ExtractionType;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'File to upload',
  })
  @IsOptional() // 👈 VERY IMPORTANT
  file?: File;
}
