import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsEnum, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { AuditAction } from './create-audit-log.dto';

export class SearchAuditLogsDto {
  @ApiPropertyOptional({ description: "ID de l'utilisateur" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  userId?: number;

  @ApiPropertyOptional({ description: 'Action effectuée', enum: AuditAction })
  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @ApiPropertyOptional({ description: "Type d'entité (User, Task, Document, etc.)" })
  @IsOptional()
  @IsString()
  entity?: string;

  @ApiPropertyOptional({ description: "ID de l'entité" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  entityId?: number;

  @ApiPropertyOptional({ description: 'Date de début' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Date de fin' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Adresse IP' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Statut', enum: ['success', 'failed'] })
  @IsOptional()
  @IsEnum(['success', 'failed'])
  status?: string;

  @ApiPropertyOptional({ description: 'Nombre de résultats par page', default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 50;

  @ApiPropertyOptional({ description: 'Numéro de page', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;
}
