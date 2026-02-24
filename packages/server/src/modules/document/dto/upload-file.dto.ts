import { IsOptional, IsInt } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UploadFileDto {
  @ApiPropertyOptional({ description: 'Parent folder ID (null for root)' })
  @IsOptional()
  @IsInt()
  parentId?: number;
}
