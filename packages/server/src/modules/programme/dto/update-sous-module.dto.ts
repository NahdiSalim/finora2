// dto/update-sous-module.dto.ts
import { IsInt, IsOptional, IsString } from 'class-validator';

export class UpdateSousModuleDto {
  @IsInt()
  id: number;

  @IsOptional()
  @IsString()
  nomSousModule?: string;

  @IsOptional()
  @IsString()
  nomSousModuleEn?: string;
}
