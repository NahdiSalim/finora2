// dto/update-programme.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateProgrammeDto {
  @IsOptional()
  @IsString()
  nomProgramme?: string;

  @IsOptional()
  @IsString()
  nomProgrammeEn?: string;
}
