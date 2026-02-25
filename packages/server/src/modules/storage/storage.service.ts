import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';

/**
 * Service de gestion des quotas de stockage
 * Version simplifiée qui calcule l'usage en temps réel
 */
@Injectable()
export class StorageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get storage usage for a company (calculated in real-time)
   */
  async getStorageUsage(companyId: number) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
      },
    });

    if (!company) {
      throw new ApiError('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    // Calculate total storage used
    const documents = await this.prisma.document.findMany({
      where: {
        companyId,
        status: { in: ['active', 'archived'] },
        isFolder: false,
      },
      select: {
        size: true,
      },
    });

    const usedBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
    const quotaBytes = 10737418240; // 10GB default
    const usagePercent = usedBytes / quotaBytes;
    const alertThreshold = 0.8; // 80%

    return {
      status: 'success',
      code: '200',
      data: {
        companyId: company.id,
        companyName: company.name,
        quotaBytes: quotaBytes.toString(),
        quotaGB: (quotaBytes / 1073741824).toFixed(2),
        quotaMB: (quotaBytes / 1048576).toFixed(2),
        usedBytes: usedBytes.toString(),
        usedGB: (usedBytes / 1073741824).toFixed(2),
        usedMB: (usedBytes / 1048576).toFixed(2),
        availableBytes: (quotaBytes - usedBytes).toString(),
        availableGB: ((quotaBytes - usedBytes) / 1073741824).toFixed(2),
        availableMB: ((quotaBytes - usedBytes) / 1048576).toFixed(2),
        usagePercent: (usagePercent * 100).toFixed(2),
        alertThreshold: (alertThreshold * 100).toFixed(0),
        isNearLimit: usagePercent >= alertThreshold,
        isOverLimit: usagePercent >= 1,
        documentsCount: documents.length,
      },
    };
  }

  /**
   * Get all companies with their storage usage (with pagination)
   */
  async getAllCompaniesUsage(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Get total count
    const totalCompanies = await this.prisma.company.count({
      where: {
        status: 'active',
      },
    });

    // Get paginated companies
    const companies = await this.prisma.company.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
      },
      skip,
      take: limit,
      orderBy: {
        name: 'asc',
      },
    });

    const usageData = await Promise.all(
      companies.map(async (company) => {
        const documents = await this.prisma.document.findMany({
          where: {
            companyId: company.id,
            status: { in: ['active', 'archived'] },
            isFolder: false,
          },
          select: {
            size: true,
          },
        });

        const usedBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
        const quotaBytes = 10737418240; // 10GB
        const usagePercent = usedBytes / quotaBytes;

        return {
          companyId: company.id,
          companyName: company.name,
          usedGB: (usedBytes / 1073741824).toFixed(2),
          usedMB: (usedBytes / 1048576).toFixed(2),
          quotaGB: (quotaBytes / 1073741824).toFixed(2),
          quotaMB: (quotaBytes / 1048576).toFixed(2),
          usagePercent: (usagePercent * 100).toFixed(2),
          isNearLimit: usagePercent >= 0.8,
          isOverLimit: usagePercent >= 1,
          documentsCount: documents.length,
        };
      })
    );

    return {
      status: 'success',
      code: '200',
      data: usageData,
      pagination: {
        page,
        limit,
        total: totalCompanies,
        totalPages: Math.ceil(totalCompanies / limit),
      },
    };
  }

  /**
   * Get companies near their storage limit
   */
  async getCompaniesNearLimit() {
    const allUsage = await this.getAllCompaniesUsage();
    const nearLimit = allUsage.data.filter((company: any) => company.isNearLimit);

    return {
      status: 'success',
      code: '200',
      data: nearLimit,
      count: nearLimit.length,
    };
  }

  /**
   * Purge old archived documents for a company
   */
  async purgeOldDocuments(companyId: number, olderThanDays: number = 90) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new ApiError('Company not found', 404, 'COMPANY_NOT_FOUND');
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Find archived documents older than cutoff date
    const documentsToDelete = await this.prisma.document.findMany({
      where: {
        companyId,
        status: 'archived',
        updatedAt: {
          lt: cutoffDate,
        },
        isFolder: false,
      },
    });

    let totalBytesFreed = 0;
    const deletedIds: number[] = [];

    for (const doc of documentsToDelete) {
      totalBytesFreed += doc.size || 0;
      deletedIds.push(doc.id);

      // Update status to deleted
      await this.prisma.document.update({
        where: { id: doc.id },
        data: { status: 'deleted' },
      });
    }

    return {
      status: 'success',
      code: '200',
      data: {
        companyId,
        documentsDeleted: deletedIds.length,
        bytesFreed: totalBytesFreed.toString(),
        gbFreed: (totalBytesFreed / 1073741824).toFixed(2),
        mbFreed: (totalBytesFreed / 1048576).toFixed(2),
        cutoffDate,
      },
      message: `Purged ${deletedIds.length} archived documents older than ${olderThanDays} days`,
    };
  }
}
