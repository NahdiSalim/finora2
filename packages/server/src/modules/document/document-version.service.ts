import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';

@Injectable()
export class DocumentVersionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  /**
   * Upload a new version of an existing document.
   * The current file becomes version N, the new file becomes version N+1.
   */
  async uploadNewVersion(
    documentId: number,
    userId: number,
    userCompanyId: number,
    file: Express.Multer.File,
    comment?: string
  ) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.isFolder || document.status === 'deleted') {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // Access check
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId && (await this.validateRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    const nextVersion = (document.currentVersion ?? 1) + 1;

    // Save current file as a version snapshot before replacing
    await this.prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: document.currentVersion ?? 1,
        url: document.url,
        name: document.name,
        size: document.size,
        uploadedBy: userId,
        comment: comment ?? null,
      },
    });

    // Upload new file to MinIO
    const folderPath = document.parentId ? await this.buildFolderPath(document.parentId) : '';

    const objectName = await this.minioService.uploadFile(document.companyId!, folderPath, file);

    // Update document with new file + increment version
    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        url: objectName,
        size: file.size,
        currentVersion: nextVersion,
        name: document.name, // keep same name
      },
    });

    const downloadUrl = await this.minioService.getPresignedUrl(objectName);

    return {
      status: 'success',
      code: '201',
      message: `Version ${nextVersion} uploaded successfully`,
      data: { ...updated, downloadUrl, currentVersion: nextVersion },
    };
  }

  /**
   * Get version history for a document (paginated).
   */
  async getVersionHistory(documentId: number, userCompanyId: number, page = 1, limit = 20) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.isFolder || document.status === 'deleted') {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId && (await this.validateRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    const skip = (page - 1) * limit;

    const [total, versions] = await Promise.all([
      this.prisma.documentVersion.count({ where: { documentId } }),
      this.prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { versionNumber: 'desc' },
        skip,
        take: limit,
        include: {
          uploader: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
    ]);

    // Add presigned download URL to each version
    const versionsWithUrls = await Promise.all(
      versions.map(async (v) => ({
        ...v,
        downloadUrl: await this.minioService.getPresignedUrl(v.url),
      }))
    );

    return {
      status: 'success',
      code: '200',
      data: {
        currentVersion: document.currentVersion ?? 1,
        documentName: document.name,
        versions: versionsWithUrls,
      },
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        limitPerPage: limit,
        totalCount: total,
      },
    };
  }

  /**
   * Restore a specific version — makes it the current file.
   * The current file is saved as a new version snapshot first.
   */
  async restoreVersion(
    documentId: number,
    versionId: number,
    userId: number,
    userCompanyId: number
  ) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document || document.isFolder || document.status === 'deleted') {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId && (await this.validateRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    const version = await this.prisma.documentVersion.findUnique({ where: { id: versionId } });

    if (!version || version.documentId !== documentId) {
      throw new ApiError('Version not found', 404, 'VERSION_NOT_FOUND');
    }

    const nextVersion = (document.currentVersion ?? 1) + 1;

    // Save current state as a version snapshot
    await this.prisma.documentVersion.create({
      data: {
        documentId,
        versionNumber: document.currentVersion ?? 1,
        url: document.url,
        name: document.name,
        size: document.size,
        uploadedBy: userId,
        comment: `Avant restauration vers v${version.versionNumber}`,
      },
    });

    // Restore the chosen version as current
    const restored = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        url: version.url,
        size: version.size,
        currentVersion: nextVersion,
      },
    });

    const downloadUrl = await this.minioService.getPresignedUrl(version.url);

    return {
      status: 'success',
      code: '200',
      message: `Restored to version ${version.versionNumber} (now v${nextVersion})`,
      data: { ...restored, downloadUrl, currentVersion: nextVersion },
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private async validateRelationship(
    accountingFirmId: number,
    clientCompanyId: number
  ): Promise<boolean> {
    const rel = await this.prisma.clientAccountingFirmRelationship.findFirst({
      where: { clientCompanyId, accountingFirmId, status: 'active' },
    });
    return !!rel;
  }

  private async buildFolderPath(folderId: number): Promise<string> {
    const parts: string[] = [];
    let currentId: number | null = folderId;

    while (currentId) {
      const folder = await this.prisma.document.findUnique({
        where: { id: currentId },
        select: { name: true, parentId: true },
      });
      if (!folder) break;
      parts.unshift(folder.name);
      currentId = folder.parentId;
    }

    return parts.join('/');
  }
}
