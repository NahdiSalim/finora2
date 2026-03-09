import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { errors } from '../../common/errors/errors';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
// import { StorageService } from '../storage/storage.service';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
    // private readonly storageService: StorageService,
  ) {}

  /**
   * Create a new folder
   */
  async createFolder(userId: number, companyId: number, dto: CreateFolderDto) {
    // Verify parent folder exists if parentId is provided
    if (dto.parentId) {
      const parent = await this.prisma.document.findFirst({
        where: {
          id: dto.parentId,
          companyId,
          isFolder: true,
          status: 'active',
        },
      });

      if (!parent) {
        throw new ApiError('Parent folder not found', 404, 'PARENT_NOT_FOUND');
      }
    }

    const folder = await this.prisma.document.create({
      data: {
        name: dto.name,
        type: 'folder',
        isFolder: true,
        url: '', // Folders don't have URLs
        ownerId: userId,
        companyId,
        parentId: dto.parentId || null,
        status: 'active',
      },
    });

    return {
      status: 'success',
      code: '201',
      data: folder,
      message: 'Folder created successfully',
    };
  }

  /**
   * Upload a file
   */
  async uploadFile(
    userId: number,
    companyId: number,
    file: Express.Multer.File,
    parentId?: number,
    category?: string
  ) {
    // Verify parent folder exists if parentId is provided
    let folderPath = '';
    if (parentId) {
      const parent = await this.prisma.document.findFirst({
        where: {
          id: parentId,
          companyId,
          isFolder: true,
          status: 'active',
        },
      });

      if (!parent) {
        throw new ApiError('Parent folder not found', 404, 'PARENT_NOT_FOUND');
      }

      // Build folder path
      folderPath = await this.buildFolderPath(parentId);
    }

    try {
      // TODO: Check storage quota before upload
      // await this.storageService.incrementStorageUsage(companyId, file.size);

      // Upload file to MinIO
      const objectName = await this.minioService.uploadFile(companyId, folderPath, file);

      // Get presigned URL
      const url = await this.minioService.getPresignedUrl(objectName);

      // Save document metadata to database
      const document = await this.prisma.document.create({
        data: {
          name: file.originalname,
          type: this.getFileType(file.mimetype),
          mimeType: file.mimetype,
          size: file.size,
          url: objectName, // Store MinIO object name
          category: category || null, // Add category field
          ownerId: userId,
          companyId,
          parentId: parentId || null,
          isFolder: false,
          status: 'active',
        },
      });

      return {
        status: 'success',
        code: '201',
        data: {
          ...document,
          downloadUrl: url,
        },
        message: 'File uploaded successfully',
      };
    } catch (error) {
      // Handle MinIO not configured error
      if (error.message && error.message.includes('SERVICE_UNAVAILABLE')) {
        throw new ApiError(
          "Le service de stockage de fichiers n'est pas disponible. Veuillez contacter l'administrateur.",
          503,
          'SERVICE_UNAVAILABLE'
        );
      }
      throw error;
    }
  }

  /**
   * Get documents in a folder (or root if parentId is null) with pagination and filters
   */
  async getDocuments(
    companyId: number,
    parentId?: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
    status: string = 'active'
  ) {
    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      companyId,
      parentId: parentId || null,
      status,
    };

    // Add date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Count total documents
    const totalCount = await this.prisma.document.count({ where });

    const totalPages = Math.ceil(totalCount / limit);

    const documents = await this.prisma.document.findMany({
      where,
      orderBy: [
        { isFolder: 'desc' }, // Folders first
        { name: 'asc' },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        type: true,
        mimeType: true,
        size: true,
        isFolder: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return {
      status: 'success',
      code: '200',
      data: documents,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Get all archived documents (flat list, not hierarchical)
   */
  async getAllArchivedDocuments(
    companyId: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      companyId,
      status: 'archived',
    };

    // Add date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Count total archived documents
    const totalCount = await this.prisma.document.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    const documents = await this.prisma.document.findMany({
      where,
      orderBy: [
        { updatedAt: 'desc' }, // Most recently archived first
      ],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        type: true,
        mimeType: true,
        size: true,
        isFolder: true,
        status: true,
        parentId: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return {
      status: 'success',
      code: '200',
      data: documents,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Get archived documents with hierarchical navigation (like normal documents but archived)
   * Shows only root archived items or children of an archived parent
   */
  async getArchivedDocumentsHierarchical(
    companyId: number,
    parentId?: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date
  ) {
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      companyId,
      status: 'archived',
      parentId: parentId || null,
    };

    // Add date filters
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    // Count total
    const totalCount = await this.prisma.document.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    const documents = await this.prisma.document.findMany({
      where,
      orderBy: [
        { isFolder: 'desc' }, // Folders first
        { name: 'asc' },
      ],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        type: true,
        mimeType: true,
        size: true,
        isFolder: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return {
      status: 'success',
      code: '200',
      data: documents,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Get document details
   */
  async getDocument(id: number, companyId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        companyId,
        status: 'active',
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    let downloadUrl: string | undefined;
    if (!document.isFolder) {
      downloadUrl = await this.minioService.getPresignedUrl(document.url);
    }

    return {
      status: 'success',
      code: '200',
      data: {
        ...document,
        downloadUrl,
      },
    };
  }

  /**
   * Update document (rename or move)
   */
  async updateDocument(id: number, companyId: number, dto: UpdateDocumentDto) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        companyId,
        status: 'active',
      },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Verify new parent folder exists if parentId is provided
    if (dto.parentId !== undefined && dto.parentId !== null) {
      const parent = await this.prisma.document.findFirst({
        where: {
          id: dto.parentId,
          companyId,
          isFolder: true,
          status: 'active',
        },
      });

      if (!parent) {
        throw new ApiError('Parent folder not found', 404, 'PARENT_NOT_FOUND');
      }

      // Prevent moving a folder into itself or its descendants
      if (document.isFolder) {
        const isDescendant = await this.isDescendant(id, dto.parentId);
        if (isDescendant || id === dto.parentId) {
          throw new ApiError(
            'Cannot move folder into itself or its descendants',
            400,
            'INVALID_MOVE'
          );
        }
      }
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        name: dto.name,
        parentId: dto.parentId,
      },
    });

    return {
      status: 'success',
      code: '200',
      data: updated,
      message: 'Document updated successfully',
    };
  }

  /**
   * Delete document (soft delete)
   */
  async deleteDocument(id: number, companyId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        companyId,
        status: 'active',
      },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // If it's a folder, delete all children recursively
    if (document.isFolder) {
      await this.deleteFolderRecursively(id);
    } else {
      // Delete file from MinIO
      await this.minioService.deleteFile(document.url);
      // TODO: Update storage usage
      // if (document.size) {
      //   await this.storageService.decrementStorageUsage(companyId, document.size);
      // }
    }

    // Soft delete in database
    await this.prisma.document.update({
      where: { id },
      data: { status: 'deleted' },
    });

    return {
      status: 'success',
      code: '200',
      message: 'Document deleted successfully',
    };
  }

  /**
   * Archive a document or folder (with all children)
   */
  async archiveDocument(id: number, companyId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        companyId,
        status: 'active',
      },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // If it's a folder, archive all children recursively
    if (document.isFolder) {
      await this.archiveFolderRecursively(id);
    }

    // Archive the document/folder
    await this.prisma.document.update({
      where: { id },
      data: { status: 'archived' },
    });

    // Mark all parent folders as archived if they contain archived items
    await this.markParentFoldersAsArchived(document.parentId);

    return {
      status: 'success',
      code: '200',
      message: document.isFolder
        ? 'Folder and all its contents archived successfully'
        : 'Document archived successfully',
    };
  }

  /**
   * Unarchive a document or folder (with all children)
   */
  async unarchiveDocument(id: number, companyId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        companyId,
        status: 'archived',
      },
    });

    if (!document) {
      throw new ApiError('Document not found or not archived', 404, 'NOT_FOUND');
    }

    // If it's a folder, unarchive all children recursively
    if (document.isFolder) {
      await this.unarchiveFolderRecursively(id);
    }

    // Unarchive the document/folder
    await this.prisma.document.update({
      where: { id },
      data: { status: 'active' },
    });

    // Check if parent folders should be unarchived
    await this.unmarkParentFoldersIfNoArchivedChildren(document.parentId);

    return {
      status: 'success',
      code: '200',
      message: document.isFolder
        ? 'Folder and all its contents unarchived successfully'
        : 'Document unarchived successfully',
    };
  }

  /**
   * Download a file
   */
  async downloadFile(id: number, companyId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id,
        companyId,
        isFolder: false,
        status: 'active',
      },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    const stream = await this.minioService.getFileStream(document.url);

    return {
      stream,
      filename: document.name,
      mimeType: document.mimeType || 'application/octet-stream',
    };
  }

  /**
   * Get breadcrumb path for a document
   */
  async getBreadcrumb(id: number, companyId: number) {
    const breadcrumb: Array<{ id: number; name: string }> = [];
    let currentId: number | null = id;

    while (currentId) {
      const doc = await this.prisma.document.findFirst({
        where: {
          id: currentId,
          companyId,
          status: 'active',
        },
        select: {
          id: true,
          name: true,
          parentId: true,
        },
      });

      if (!doc) break;

      breadcrumb.unshift({ id: doc.id, name: doc.name });
      currentId = doc.parentId;
    }

    return {
      status: 'success',
      code: '200',
      data: breadcrumb,
    };
  }

  // ==================== HELPER METHODS ====================

  private async buildFolderPath(folderId: number): Promise<string> {
    const path: string[] = [];
    let currentId: number | null = folderId;

    while (currentId) {
      const folder = await this.prisma.document.findUnique({
        where: { id: currentId },
        select: { name: true, parentId: true },
      });

      if (!folder) break;

      path.unshift(folder.name);
      currentId = folder.parentId;
    }

    return path.join('/');
  }

  private async isDescendant(ancestorId: number, descendantId: number): Promise<boolean> {
    let currentId: number | null = descendantId;

    while (currentId) {
      if (currentId === ancestorId) return true;

      const doc = await this.prisma.document.findUnique({
        where: { id: currentId },
        select: { parentId: true },
      });

      if (!doc) break;
      currentId = doc.parentId;
    }

    return false;
  }

  private async deleteFolderRecursively(folderId: number): Promise<void> {
    const children = await this.prisma.document.findMany({
      where: {
        parentId: folderId,
        status: 'active',
      },
    });

    for (const child of children) {
      if (child.isFolder) {
        await this.deleteFolderRecursively(child.id);
      } else {
        await this.minioService.deleteFile(child.url);
        // TODO: Update storage usage
        // if (child.companyId && child.size) {
        //   await this.storageService.decrementStorageUsage(child.companyId, child.size);
        // }
      }
      await this.prisma.document.update({
        where: { id: child.id },
        data: { status: 'deleted' },
      });
    }
  }

  private async archiveFolderRecursively(folderId: number): Promise<void> {
    const children = await this.prisma.document.findMany({
      where: {
        parentId: folderId,
        status: 'active',
      },
    });

    for (const child of children) {
      if (child.isFolder) {
        await this.archiveFolderRecursively(child.id);
      }
      await this.prisma.document.update({
        where: { id: child.id },
        data: { status: 'archived' },
      });
    }
  }

  private async unarchiveFolderRecursively(folderId: number): Promise<void> {
    const children = await this.prisma.document.findMany({
      where: {
        parentId: folderId,
        status: 'archived',
      },
    });

    for (const child of children) {
      if (child.isFolder) {
        await this.unarchiveFolderRecursively(child.id);
      }
      await this.prisma.document.update({
        where: { id: child.id },
        data: { status: 'active' },
      });
    }
  }

  /**
   * Mark parent folders as archived if they contain archived items
   */
  private async markParentFoldersAsArchived(parentId: number | null): Promise<void> {
    if (!parentId) return;

    const parent = await this.prisma.document.findUnique({
      where: { id: parentId },
    });

    if (!parent || parent.status === 'archived') return;

    // Check if parent has any archived children
    const hasArchivedChildren = await this.prisma.document.count({
      where: {
        parentId: parent.id,
        status: 'archived',
      },
    });

    if (hasArchivedChildren > 0) {
      // Mark parent as archived
      await this.prisma.document.update({
        where: { id: parent.id },
        data: { status: 'archived' },
      });

      // Recursively mark grandparents
      await this.markParentFoldersAsArchived(parent.parentId);
    }
  }

  /**
   * Unmark parent folders from archived if they no longer contain archived items
   */
  private async unmarkParentFoldersIfNoArchivedChildren(parentId: number | null): Promise<void> {
    if (!parentId) return;

    const parent = await this.prisma.document.findUnique({
      where: { id: parentId },
    });

    if (!parent || parent.status !== 'archived') return;

    // Check if parent still has archived children
    const archivedChildrenCount = await this.prisma.document.count({
      where: {
        parentId: parent.id,
        status: 'archived',
      },
    });

    // If no more archived children, unarchive the parent
    if (archivedChildrenCount === 0) {
      await this.prisma.document.update({
        where: { id: parent.id },
        data: { status: 'active' },
      });

      // Recursively check grandparents
      await this.unmarkParentFoldersIfNoArchivedChildren(parent.parentId);
    }
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'excel';
    return 'other';
  }
}
