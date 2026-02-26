import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchMessagesDto {
  @ApiPropertyOptional({ description: 'Texte à rechercher' })
  @IsOptional()
  @IsString()
  query?: string;

  @ApiPropertyOptional({ description: 'ID de la salle', type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  roomId?: number;

  @ApiPropertyOptional({ description: "ID de l'expéditeur", type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  senderId?: number;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Nombre de résultats par page', default: 20, type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 20;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1, type: 'number' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;
}
