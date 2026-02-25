import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFolderDto {
  @ApiProperty({ description: 'Folder name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Parent folder ID (null for root)' })
  @IsOptional()
  @IsInt()
  parentId?: number;
}
