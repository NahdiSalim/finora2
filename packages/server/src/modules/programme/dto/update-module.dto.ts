// dto/update-module.dto.ts
import { IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { UpdateSousModuleDto } from './update-sous-module.dto';

export class UpdateModuleDto {
  @IsOptional()
  @IsString()
  nomModule?: string;

  @IsOptional()
  @IsString()
  nomModuleEn?: string;

  @IsOptional()
  @IsString()
  typeModule?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateSousModuleDto)
  sousModules?: UpdateSousModuleDto[];
}
