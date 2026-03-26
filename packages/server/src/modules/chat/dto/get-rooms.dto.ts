import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsDateString, IsInt, Min, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class GetRoomsDto {
  @ApiPropertyOptional({
    description: 'Recherche par nom du participant ou contenu du dernier message',
  })
  @IsOptional()
  @IsString()
  searchTerm?: string;

  @ApiPropertyOptional({ description: 'Filtrer par date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    description: 'Filtrer par rôle du participant',
    enum: ['client', 'collaborateur', 'comptable'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['client', 'collaborateur', 'comptable'])
  role?: string;

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
