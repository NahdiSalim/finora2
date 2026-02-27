import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
  Res,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AuditService } from './audit.service';
import { SearchAuditLogsDto } from './dto/search-audit-logs.dto';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: "Rechercher dans les logs d'audit" })
  @ApiResponse({ status: 200, description: 'Liste des logs' })
  async searchLogs(@Request() req, @Query() dto: SearchAuditLogsDto) {
    return this.auditService.searchLogs(dto, req.user.sub);
  }

  @Get('logs/entity/:entity/:entityId')
  @ApiOperation({ summary: "Obtenir les logs d'une entité spécifique" })
  @ApiResponse({ status: 200, description: "Logs de l'entité" })
  async getEntityLogs(
    @Request() req,
    @Param('entity') entity: string,
    @Param('entityId', ParseIntPipe) entityId: number
  ) {
    return this.auditService.getEntityLogs(entity, entityId, req.user.sub);
  }

  @Get('statistics')
  @ApiOperation({ summary: "Obtenir les statistiques d'audit" })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getStatistics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    return this.auditService.getStatistics(req.user.sub, startDate, endDate);
  }

  @Get('export')
  @ApiOperation({ summary: "Exporter les logs d'audit en Excel" })
  @ApiResponse({ status: 200, description: 'Fichier Excel' })
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename=audit-logs.xlsx')
  async exportLogs(@Request() req, @Query() dto: SearchAuditLogsDto, @Res() res: Response) {
    const buffer = await this.auditService.exportLogs(dto, req.user.sub);
    res.send(buffer);
  }

  @Post('cleanup')
  @ApiOperation({ summary: 'Nettoyer les anciens logs (admin seulement)' })
  @ApiResponse({ status: 200, description: 'Logs nettoyés' })
  @ApiQuery({ name: 'daysToKeep', required: false, type: Number })
  async cleanupOldLogs(@Query('daysToKeep', ParseIntPipe) daysToKeep: number = 90) {
    return this.auditService.cleanupOldLogs(daysToKeep);
  }
}
