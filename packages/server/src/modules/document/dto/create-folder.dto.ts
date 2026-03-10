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

  @ApiPropertyOptional({
    description: 'Client company ID (required for accountants, ignored for clients)',
  })
  @IsOptional()
  @IsInt()
  clientCompanyId?: number;
}
