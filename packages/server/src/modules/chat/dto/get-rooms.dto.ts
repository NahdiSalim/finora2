import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRoomsDto {
  @ApiPropertyOptional({
    description: 'Recherche par nom du participant ou contenu du dernier message',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filtrer par date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description:
      'Role code to filter other participants by. ' +
      'Accepts: client, collaborateur, collaborator, comptable, accountant (case-insensitive).',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1, type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Nombre de résultats par page', default: 50, type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 50;
}
