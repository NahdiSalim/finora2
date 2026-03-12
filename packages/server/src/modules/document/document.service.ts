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
   * Check if a folder has any active content (files or subfolders with active content)
   * Returns true if folder has at least one active file, active subfolder, or is empty
   */
  private async hasActiveContent(folderId: number): Promise<boolean> {
    // Check for active files directly in this folder
    const activeFiles = await this.prisma.document.count({
      where: {
        parentId: folderId,
        isFolder: false,
        status: 'active',
      },
    });

    if (activeFiles > 0) {
      return true;
    }

    // Check for subfolders and recursively check their content
    const subfolders = await this.prisma.document.findMany({
      where: {
        parentId: folderId,
        isFolder: true,
        status: 'active',
      },
      select: { id: true },
    });

    // If folder has active subfolders, it has content
    if (subfolders.length > 0) {
      for (const subfolder of subfolders) {
        const hasContent = await this.hasActiveContent(subfolder.id);
        if (hasContent) {
          return true;
        }
      }
    } else {
      // If folder has no subfolders and no files, it's an empty folder - still show it
      return true;
    }

    return false;
  }

  /**
   * Create a new folder
   * - CLIENT: creates in their own space (user.companyId)
   * - ACCOUNTANT: must provide clientCompanyId and have active relationship
   */
  async createFolder(userId: number, userCompanyId: number, dto: CreateFolderDto) {
    // Determine target company and creator company
    let targetCompanyId = userCompanyId; // Default: client's own company
    let createdByCompanyId = userCompanyId;

    // If clientCompanyId provided, user is accountant creating in client's space
    if (dto.clientCompanyId) {
      targetCompanyId = dto.clientCompanyId;
      createdByCompanyId = userCompanyId; // Accountant's company

      // Validate accountant has active relationship with client
      const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
        where: {
          clientCompanyId: targetCompanyId,
          accountingFirmId: userCompanyId,
          status: 'active',
        },
      });

      if (!relationship) {
        throw new ApiError(
          'No active relationship with this client',
          403,
          'NO_ACTIVE_RELATIONSHIP'
        );
      }
    }

    // Verify parent folder exists if parentId is provided
    if (dto.parentId) {
      const parent = await this.prisma.document.findFirst({
        where: {
          id: dto.parentId,
          companyId: targetCompanyId,
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
        companyId: targetCompanyId,
        createdBy: userId,
        createdByCompanyId,
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
   * - CLIENT: uploads in their own space (user.companyId)
   * - ACCOUNTANT: must provide clientCompanyId and have active relationship
   */
  async uploadFile(
    userId: number,
    userCompanyId: number,
    file: Express.Multer.File,
    parentId?: number,
    category?: string,
    clientCompanyId?: number,
    customName?: string
  ) {
    // Determine target company and creator company
    let targetCompanyId = userCompanyId; // Default: client's own company
    let createdByCompanyId = userCompanyId;

    // If clientCompanyId provided, user is accountant creating in client's space
    if (clientCompanyId) {
      targetCompanyId = clientCompanyId;
      createdByCompanyId = userCompanyId; // Accountant's company

      // Validate accountant has active relationship with client
      const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
        where: {
          clientCompanyId: targetCompanyId,
          accountingFirmId: userCompanyId,
          status: 'active',
        },
      });

      if (!relationship) {
        throw new ApiError(
          'No active relationship with this client',
          403,
          'NO_ACTIVE_RELATIONSHIP'
        );
      }
    }

    // Verify parent folder exists if parentId is provided
    let folderPath = '';
    if (parentId) {
      const parent = await this.prisma.document.findFirst({
        where: {
          id: parentId,
          companyId: targetCompanyId,
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
      // await this.storageService.incrementStorageUsage(targetCompanyId, file.size);

      // Upload file to MinIO
      const objectName = await this.minioService.uploadFile(targetCompanyId, folderPath, file);

      // Get presigned URL
      const url = await this.minioService.getPresignedUrl(objectName);

      // Use custom name if provided, otherwise use original filename
      const fileName = customName && customName.trim() ? customName.trim() : file.originalname;

      // Save document metadata to database
      const document = await this.prisma.document.create({
        data: {
          name: fileName,
          type: this.getFileType(file.mimetype),
          mimeType: file.mimetype,
          size: file.size,
          url: objectName, // Store MinIO object name
          category: category || null, // Add category field
          ownerId: userId,
          companyId: targetCompanyId,
          createdBy: userId,
          createdByCompanyId,
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
   * Includes canEdit and canDelete flags based on user permissions
   * Search works across entire document tree (recursive)
   */
  async getDocuments(
    userCompanyId: number,
    userId: number,
    parentId?: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
    status: string = 'active',
    search?: string,
    category?: string
  ) {
    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      companyId: userCompanyId,
      status,
    };

    // If search is provided, search across entire tree (ignore parentId)
    // If category is provided, search across entire tree (ignore parentId)
    // Otherwise, filter by parentId for hierarchical view
    if ((search && search.trim()) || (category && category.trim())) {
      // When searching or filtering by category, search entire tree
      if (search && search.trim()) {
        where.name = {
          contains: search.trim(),
          mode: 'insensitive',
        };
      }
    } else {
      // Only filter by parentId when not searching and no category filter
      where.parentId = parentId || null;
    }

    // Add category filter (only for files, not folders)
    if (category && category.trim()) {
      where.category = {
        contains: category.trim(),
        mode: 'insensitive',
      };
    }

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
        createdBy: true,
        createdByCompanyId: true,
        companyId: true,
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Add permission flags to each document
    let documentsWithPermissions = await Promise.all(
      documents.map(async (doc) => {
        // If createdByCompanyId is null (old documents), assume it was created by the client
        const createdByCompanyId = doc.createdByCompanyId || doc.companyId;

        const isCreator = createdByCompanyId === userCompanyId;
        const isAccountantEditingClient =
          createdByCompanyId === doc.companyId && userCompanyId !== doc.companyId;

        // If it's a folder, count subfolders and files separately (count all children regardless of status)
        let foldersCount = 0;
        let filesCount = 0;
        let hasActiveContent = true; // Default true for non-folders

        if (doc.isFolder) {
          foldersCount = await this.prisma.document.count({
            where: {
              parentId: doc.id,
              isFolder: true,
              status: { not: 'deleted' }, // Count all non-deleted folders
            },
          });
          filesCount = await this.prisma.document.count({
            where: {
              parentId: doc.id,
              isFolder: false,
              status: { not: 'deleted' }, // Count all non-deleted files
            },
          });
          // Check if folder has active content
          hasActiveContent = await this.hasActiveContent(doc.id);
        }

        return {
          ...doc,
          canEdit: isCreator || isAccountantEditingClient,
          canDelete: isCreator || isAccountantEditingClient,
          ...(doc.isFolder && { foldersCount, filesCount }),
          _hasActiveContent: hasActiveContent, // Internal flag for filtering
        };
      })
    );

    // Filter out folders that have no active content (only archived/deleted children)
    if (status === 'active') {
      documentsWithPermissions = documentsWithPermissions
        .filter((doc: any) => doc._hasActiveContent)
        .map(({ _hasActiveContent, ...doc }: any) => doc);
    }

    return {
      status: 'success',
      code: '200',
      data: documentsWithPermissions,
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
   * Search works across entire tree (recursive)
   */
  async getArchivedDocumentsHierarchical(
    companyId: number,
    parentId?: number,
    page: number = 1,
    limit: number = 20,
    startDate?: Date,
    endDate?: Date,
    search?: string,
    category?: string
  ) {
    console.log('[getArchivedDocumentsHierarchical] companyId:', companyId);
    console.log('[getArchivedDocumentsHierarchical] parentId:', parentId);

    const skip = (page - 1) * limit;

    // Build where clause for archived documents
    const archivedWhere: any = {
      companyId,
      status: 'archived',
    };

    // Add search filter
    if (search && search.trim()) {
      archivedWhere.name = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    // Add category filter
    if (category && category.trim()) {
      archivedWhere.category = {
        contains: category.trim(),
        mode: 'insensitive',
      };
    }

    // Add date filters
    if (startDate || endDate) {
      archivedWhere.createdAt = {};
      if (startDate) {
        archivedWhere.createdAt.gte = startDate;
      }
      if (endDate) {
        archivedWhere.createdAt.lte = endDate;
      }
    }

    // Get ALL archived documents (entire table)
    const allArchivedDocuments = await this.prisma.document.findMany({
      where: archivedWhere,
      select: {
        id: true,
        parentId: true,
      },
    });

    console.log(
      '[getArchivedDocumentsHierarchical] Total archived documents:',
      allArchivedDocuments.length
    );

    // Collect all document IDs that are part of the archive hierarchy
    const hierarchyIds = new Set<number>();

    // For each archived document, add it and all its ancestors to the set
    for (const archivedDoc of allArchivedDocuments) {
      hierarchyIds.add(archivedDoc.id); // Add the archived document itself

      // Add all parent folders up to root
      let currentParentId = archivedDoc.parentId;
      while (currentParentId) {
        hierarchyIds.add(currentParentId);
        const parent = await this.prisma.document.findUnique({
          where: { id: currentParentId },
          select: { parentId: true },
        });
        currentParentId = parent?.parentId || null;
      }
    }

    console.log('[getArchivedDocumentsHierarchical] Total hierarchy IDs:', hierarchyIds.size);

    // Get all documents in hierarchy with their full paths
    const allHierarchyDocuments = await this.prisma.document.findMany({
      where: {
        companyId,
        id: { in: Array.from(hierarchyIds) },
      },
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
      },
    });

    // Build a map for quick lookup
    const docMap = new Map(allHierarchyDocuments.map((doc) => [doc.id, doc]));

    // For each document, build its full path
    const documentsWithPath = allHierarchyDocuments.map((doc) => {
      const path: any[] = [];
      let currentId: number | null = doc.id;

      // Build path from document to root
      while (currentId) {
        const current = docMap.get(currentId);
        if (current) {
          path.unshift({
            id: current.id,
            name: current.name,
            isFolder: current.isFolder,
            status: current.status,
          });
          currentId = current.parentId;
        } else {
          break;
        }
      }

      return {
        ...doc,
        path, // Full path from root to this document
      };
    });

    console.log(
      '[getArchivedDocumentsHierarchical] Documents with path:',
      documentsWithPath.length
    );

    // If no parentId, return only root-level documents (with their full paths)
    // If parentId is provided, return only direct children of that parent
    const filteredDocuments =
      parentId === undefined
        ? documentsWithPath.filter((doc) => doc.parentId === null)
        : documentsWithPath.filter((doc) => doc.parentId === parentId);

    console.log('[getArchivedDocumentsHierarchical] Filtered documents:', filteredDocuments.length);

    // Pagination
    const totalCount = filteredDocuments.length;
    const totalPages = Math.ceil(totalCount / limit);
    const paginatedDocuments = filteredDocuments.slice(skip, skip + limit);

    // Add children count for folders
    const documentsWithCounts = await Promise.all(
      paginatedDocuments.map(async (doc) => {
        let foldersCount = 0;
        let filesCount = 0;
        if (doc.isFolder) {
          // Count direct children (archived)
          foldersCount = await this.countDirectChildren(doc.id, true);
          filesCount = await this.countDirectChildren(doc.id, false);
        }

        return {
          ...doc,
          ...(doc.isFolder && { foldersCount, filesCount }),
        };
      })
    );

    return {
      status: 'success',
      code: '200',
      data: documentsWithCounts,
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
  async getDocument(id: number, userCompanyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
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

    // Check if user has access to this document's company
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
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
   * Permission check: user can only edit if they created it or are accountant editing client's doc
   */
  async updateDocument(id: number, userCompanyId: number, dto: UpdateDocumentDto) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user has access to this document's company
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
    }

    // Check permissions
    // If createdByCompanyId is null (old documents), assume it was created by the client
    const createdByCompanyId = document.createdByCompanyId || document.companyId;

    // isCreator: user created this document
    const isCreator = createdByCompanyId === userCompanyId;

    // isAccountantEditingClient: document was created by client (createdByCompanyId === companyId)
    // and user is NOT the client (user is accountant)
    const isAccountantEditingClient =
      createdByCompanyId === document.companyId && userCompanyId !== document.companyId;

    if (!isCreator && !isAccountantEditingClient) {
      throw new ApiError(
        'You do not have permission to edit this document',
        403,
        'PERMISSION_DENIED'
      );
    }

    // Verify new parent folder exists if parentId is provided
    if (dto.parentId !== undefined && dto.parentId !== null) {
      const parent = await this.prisma.document.findFirst({
        where: {
          id: dto.parentId,
          companyId: document.companyId,
          isFolder: true,
          status: { not: 'deleted' },
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
   * Permission check: user can only delete if they created it or are accountant editing client's doc
   * For folders: only allow deletion if folder is empty
   */
  async deleteDocument(id: number, userCompanyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user has access to this document's company
    // Either it's their own company OR they're an accountant with active relationship
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
    }

    // Check permissions
    // If createdByCompanyId is null (old documents), assume it was created by the client
    const createdByCompanyId = document.createdByCompanyId || document.companyId;

    // isCreator: user created this document
    const isCreator = createdByCompanyId === userCompanyId;

    // isAccountantEditingClient: document was created by client (createdByCompanyId === companyId)
    // and user is NOT the client (user is accountant)
    const isAccountantEditingClient =
      createdByCompanyId === document.companyId && userCompanyId !== document.companyId;

    if (!isCreator && !isAccountantEditingClient) {
      throw new ApiError(
        `You do not have permission to delete this document. createdByCompanyId: ${createdByCompanyId}, userCompanyId: ${userCompanyId}, documentCompanyId: ${document.companyId}`,
        403,
        'PERMISSION_DENIED'
      );
    }

    // If it's a folder, check if it's empty
    if (document.isFolder) {
      const childrenCount = await this.prisma.document.count({
        where: {
          parentId: id,
          status: { not: 'deleted' },
        },
      });

      if (childrenCount > 0) {
        throw new ApiError(
          'Cannot delete folder that contains files or subfolders',
          400,
          'FOLDER_NOT_EMPTY'
        );
      }
    } else {
      // Delete file from MinIO
      await this.minioService.deleteFile(document.url);
      // TODO: Update storage usage
      // if (document.size) {
      //   await this.storageService.decrementStorageUsage(userCompanyId, document.size);
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
  async archiveDocument(id: number, userCompanyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user has access to this document's company
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
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
  async unarchiveDocument(id: number, userCompanyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new ApiError('Document not found or not archived', 404, 'NOT_FOUND');
    }

    // Check if user has access to this document's company
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
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
  async downloadFile(id: number, userCompanyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document || document.isFolder) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user has access to this document's company
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
    }

    // Check if file exists in MinIO
    const fileExists = await this.minioService.fileExists(document.url);
    if (!fileExists) {
      throw new ApiError(
        'File not found in storage. The file may have been deleted.',
        404,
        'FILE_NOT_FOUND'
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
  async getBreadcrumb(id: number, userCompanyId: number) {
    // First, get the document to check access
    const document = await this.prisma.document.findUnique({
      where: { id },
      select: { companyId: true },
    });

    if (!document) {
      throw new ApiError(
        errors.NOT_FOUND.message,
        errors.NOT_FOUND.code,
        errors.NOT_FOUND.errorCode
      );
    }

    // Check if user has access to this document's company
    const hasAccess =
      document.companyId === userCompanyId ||
      (document.companyId &&
        (await this.validateAccountantClientRelationship(userCompanyId, document.companyId)));

    if (!hasAccess) {
      throw new ApiError('You do not have access to this document', 403, 'ACCESS_DENIED');
    }

    const breadcrumb: Array<{ id: number; name: string }> = [];
    let currentId: number | null = id;

    while (currentId) {
      const doc = await this.prisma.document.findUnique({
        where: { id: currentId },
        select: {
          id: true,
          name: true,
          parentId: true,
          companyId: true,
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
  /**
   * Count direct children (files and folders) that are part of the archive hierarchy
   * - Files: count archived files
   * - Folders: count active folders that contain archived content
   */
  private async countDirectChildren(
    parentId: number,
    countFolders: boolean = true
  ): Promise<number> {
    if (countFolders) {
      // For folders: count active folders that contain archived content
      const activeFolders = await this.prisma.document.findMany({
        where: {
          parentId,
          isFolder: true,
          status: 'active',
        },
        select: { id: true },
      });

      let count = 0;
      for (const folder of activeFolders) {
        // Check if this folder contains archived content
        const hasArchived = await this.prisma.document.count({
          where: {
            parentId: folder.id,
            status: 'archived',
          },
        });
        if (hasArchived > 0) {
          count++;
        }
      }
      return count;
    } else {
      // For files: count archived files directly
      const count = await this.prisma.document.count({
        where: {
          parentId,
          isFolder: false,
          status: 'archived',
        },
      });
      return count;
    }
  }

  private async markParentFoldersAsArchived(_parentId: number | null): Promise<void> {
    // Do nothing - folders are never archived, only files are
    // Folders are hidden from active view if they contain only archived content
    return;
  }

  /**
   * Unmark parent folders from archived if they no longer contain archived items
   */
  private async unmarkParentFoldersIfNoArchivedChildren(_parentId: number | null): Promise<void> {
    // Do nothing - folders are never archived, so no need to unarchive them
    return;
  }

  private getFileType(mimeType: string): string {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'word';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'excel';
    return 'other';
  }

  /**
   * Check if user can edit/delete a document
   * - User can edit if they created it (createdByCompanyId = user.companyId)
   * - Accountant can edit client's documents too
   */
  private canEditDocument(document: any, userCompanyId: number, isAccountant: boolean): boolean {
    // User created it
    if (document.createdByCompanyId === userCompanyId) {
      return true;
    }

    // Accountant can edit client's documents
    if (isAccountant && document.createdByCompanyId === document.companyId) {
      return true;
    }

    return false;
  }

  /**
   * Check if user is an accountant (has active relationship with client)
   */
  private async isAccountantForClient(
    userCompanyId: number,
    clientCompanyId: number
  ): Promise<boolean> {
    const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
      where: {
        accountingFirmId: userCompanyId,
        clientCompanyId,
        status: 'active',
      },
    });

    return !!relationship;
  }

  /**
   * Validate accountant has active relationship with client
   */
  async validateAccountantClientRelationship(
    accountantCompanyId: number,
    clientCompanyId: number
  ): Promise<boolean> {
    const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
      where: {
        accountingFirmId: accountantCompanyId,
        clientCompanyId,
        status: 'active',
      },
    });

    return !!relationship;
  }
}
