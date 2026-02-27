import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAuditLogDto, AuditAction } from './dto/create-audit-log.dto';
import { SearchAuditLogsDto } from './dto/search-audit-logs.dto';
import * as ExcelJS from 'exceljs';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create an audit log entry
   */
  async createLog(dto: CreateAuditLogDto) {
    try {
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: dto.userId,
          action: dto.action,
          entity: dto.entity,
          entityId: dto.entityId,
          changes: dto.changes ? JSON.stringify(dto.changes) : null,
          metadata: dto.metadata ? JSON.stringify(dto.metadata) : null,
          ipAddress: dto.ipAddress,
          userAgent: dto.userAgent,
          companyId: dto.companyId,
          status: dto.status || 'success',
          errorMessage: dto.errorMessage,
        },
      });

      return auditLog;
    } catch (error) {
      console.error('Failed to create audit log:', error);
      return null;
    }
  }

  /**
   * Log a simple action
   */
  async log(
    action: AuditAction,
    entity: string,
    userId?: number,
    entityId?: number,
    changes?: any,
    metadata?: any
  ) {
    return this.createLog({
      userId,
      action,
      entity,
      entityId,
      changes,
      metadata,
    });
  }

  /**
   * Search audit logs
   */
  async searchLogs(dto: SearchAuditLogsDto, requestingUserId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { companyId: true },
    });

    const where: any = {};

    if (user?.companyId) {
      where.companyId = user.companyId;
    }

    if (dto.userId) {
      where.userId = dto.userId;
    }

    if (dto.action) {
      where.action = dto.action;
    }

    if (dto.entity) {
      where.entity = dto.entity;
    }

    if (dto.entityId) {
      where.entityId = dto.entityId;
    }

    if (dto.ipAddress) {
      where.ipAddress = dto.ipAddress;
    }

    if (dto.status) {
      where.status = dto.status;
    }

    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    const limit = dto.limit || 50;
    const page = dto.page || 1;
    const skip = (page - 1) * limit;

    const [total, logs] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: limit,
        skip,
      }),
    ]);

    const parsedLogs = logs.map((log) => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return {
      success: true,
      data: parsedLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get audit logs for a specific entity
   */
  async getEntityLogs(entity: string, entityId: number, requestingUserId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { companyId: true },
    });

    const logs = await this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
        companyId: user?.companyId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const parsedLogs = logs.map((log) => ({
      ...log,
      changes: log.changes ? JSON.parse(log.changes) : null,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));

    return {
      success: true,
      data: parsedLogs,
    };
  }

  /**
   * Get audit statistics
   */
  async getStatistics(requestingUserId: number, startDate?: string, endDate?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: requestingUserId },
      select: { companyId: true },
    });

    const where: any = {
      companyId: user?.companyId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const actionCounts = await this.prisma.auditLog.groupBy({
      by: ['action'],
      where,
      _count: true,
    });

    const entityCounts = await this.prisma.auditLog.groupBy({
      by: ['entity'],
      where,
      _count: true,
    });

    const statusCounts = await this.prisma.auditLog.groupBy({
      by: ['status'],
      where,
      _count: true,
    });

    const userActivity = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      where: {
        ...where,
        userId: { not: null },
      },
      _count: true,
      orderBy: {
        _count: {
          userId: 'desc',
        },
      },
      take: 10,
    });

    const userIds = userActivity.map((u) => u.userId).filter((id): id is number => id !== null);
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    const userActivityWithDetails = userActivity.map((activity) => ({
      user: users.find((u) => u.id === activity.userId),
      count: activity._count,
    }));

    return {
      success: true,
      data: {
        byAction: actionCounts.map((item) => ({
          action: item.action,
          count: item._count,
        })),
        byEntity: entityCounts.map((item) => ({
          entity: item.entity,
          count: item._count,
        })),
        byStatus: statusCounts.map((item) => ({
          status: item.status,
          count: item._count,
        })),
        topUsers: userActivityWithDetails,
      },
    };
  }

  /**
   * Export audit logs to Excel
   */
  async exportLogs(dto: SearchAuditLogsDto, requestingUserId: number): Promise<Buffer> {
    const result = await this.searchLogs({ ...dto, limit: 100000, page: 1 }, requestingUserId);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Audit Logs');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Date/Heure', key: 'createdAt', width: 20 },
      { header: 'Utilisateur', key: 'username', width: 20 },
      { header: 'Action', key: 'action', width: 15 },
      { header: 'Entité', key: 'entity', width: 15 },
      { header: 'ID Entité', key: 'entityId', width: 12 },
      { header: 'Statut', key: 'status', width: 12 },
      { header: 'Adresse IP', key: 'ipAddress', width: 15 },
      { header: 'Modifications', key: 'changes', width: 40 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    result.data.forEach((log: any) => {
      worksheet.addRow({
        id: log.id,
        createdAt: new Date(log.createdAt).toLocaleString('fr-FR'),
        username: log.user ? `${log.user.firstName} ${log.user.lastName}` : 'Système',
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        status: log.status,
        ipAddress: log.ipAddress,
        changes: log.changes ? JSON.stringify(log.changes, null, 2) : '',
      });
    });

    worksheet.autoFilter = {
      from: 'A1',
      to: 'I1',
    };

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Delete old audit logs (cleanup)
   */
  async cleanupOldLogs(daysToKeep: number = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.prisma.auditLog.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return {
      success: true,
      message: `Deleted ${result.count} old audit logs`,
      deletedCount: result.count,
    };
  }
}
