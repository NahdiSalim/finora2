import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto, RequestStatus } from './dto/update-request.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { ConvertToTaskDto } from './dto/convert-to-task.dto';
import { MinioService } from '../../common/services/minio.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Create a new request (Client)
   */
  /**
   * Check if client has an accounting firm relationship
   */
  async checkClientHasAccountant(clientId: number) {
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { companyId: true },
    });

    if (!client?.companyId) {
      return {
        success: true,
        hasAccountant: false,
      };
    }

    const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
      where: {
        clientCompanyId: client.companyId,
      },
    });

    return {
      success: true,
      hasAccountant: !!relationship,
    };
  }

  async createRequest(dto: CreateRequestDto, clientId: number, files?: Express.Multer.File[]) {
    try {
      console.log('CreateRequestDto received:', dto);
      console.log('Files received:', files?.length || 0);
      console.log('Existing document IDs:', dto.existingDocumentIds?.length || 0);

      // Validate subject field
      if (!dto.subject || dto.subject.trim() === '') {
        throw new ApiError(MSG.request.subject_required, 400, 'SUBJECT_REQUIRED');
      }

      // Get client's company
      const client = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { companyId: true },
      });

      if (!client?.companyId) {
        throw new ApiError(MSG.request.no_company, 400, 'NO_COMPANY');
      }

      // Find the accountant's firm linked to this client
      let accountingFirmId: number | null = null;

      if (dto.accountantId) {
        // Use the explicitly provided accountant's company
        const accountant = await this.prisma.user.findUnique({
          where: { id: dto.accountantId },
          select: { companyId: true },
        });
        accountingFirmId = accountant?.companyId ?? null;
      } else {
        // Auto-detect from active relationship
        const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
          where: {
            clientCompanyId: client.companyId,
            status: { in: ['active', 'accepted'] }, // Include both active and accepted
          },
          select: { accountingFirmId: true },
          orderBy: { createdAt: 'desc' }, // Get the most recent one
        });
        accountingFirmId = relationship?.accountingFirmId ?? null;

        // If still null, try to find any relationship regardless of status
        if (!accountingFirmId) {
          const anyRelationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
            where: { clientCompanyId: client.companyId },
            select: { accountingFirmId: true, status: true },
            orderBy: { createdAt: 'desc' },
          });
          if (anyRelationship) {
            accountingFirmId = anyRelationship.accountingFirmId;
          }
        }
      }

      // Create request first to get the ID
      const request = await this.prisma.request.create({
        data: {
          subject: dto.subject.trim(),
          topic: dto.topic?.trim() || null,
          description: dto.description?.trim() || null,
          type: dto.type,
          urgency: dto.urgency || 'normal',
          desiredResponseDate: dto.desiredResponseDate || null,
          desiredResponseTime: dto.desiredResponseTime || null,
          clientId,
          companyId: client.companyId,
          accountingFirmId: accountingFirmId,
          attachments: [],
        },
      });

      const attachmentUrls: string[] = [];
      // Create dedicated folder for this request: demande-1, demande-2, etc.
      const requestFolderName = `demande-${request.id}`;
      console.log(`Creating request folder: ${requestFolderName}`);

      // 1. Upload new files from PC to MinIO
      if (files && files.length > 0) {
        console.log(`Uploading ${files.length} new files to MinIO...`);
        for (const file of files) {
          // Add timestamp to avoid filename conflicts
          const fileName = `${Date.now()}-${file.originalname}`;
          const filePath = `requests/${requestFolderName}/${fileName}`;

          try {
            const uploadedPath = await this.minioService.uploadFile(
              client.companyId,
              `requests/${requestFolderName}`,
              file
            );
            attachmentUrls.push(uploadedPath);
            console.log(` Uploaded: ${fileName}`);
          } catch (error) {
            console.error(`Failed to upload ${fileName}:`, error);
            // Continue without the file if upload fails
          }
        }
      }

      // 2. Copy existing documents from document management space
      if (dto.existingDocumentIds && dto.existingDocumentIds.length > 0) {
        console.log(`Copying ${dto.existingDocumentIds.length} existing documents...`);

        // Convert to array of numbers if it's a string or array of strings
        let documentIds: number[] = [];
        if (typeof dto.existingDocumentIds === 'string') {
          // Single ID as string: "3" -> [3]
          documentIds = [parseInt(dto.existingDocumentIds, 10)];
        } else if (Array.isArray(dto.existingDocumentIds)) {
          // Array of strings or numbers: ["3", "4"] -> [3, 4]
          documentIds = dto.existingDocumentIds
            .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
            .filter((id) => !isNaN(id));
        }

        console.log('Document IDs to copy:', documentIds);

        const existingDocs = await this.prisma.document.findMany({
          where: {
            id: { in: documentIds },
            companyId: client.companyId,
          },
        });

        for (const doc of existingDocs) {
          try {
            // Get the file from MinIO using the url field
            const fileBuffer = await this.minioService.getFileBuffer(doc.url);

            // Create new path in request folder (keep original filename)
            const fileName = doc.name;
            const newPath = `requests/${requestFolderName}/${fileName}`;

            // Upload copy to request folder
            const mimeType = doc.mimeType || 'application/octet-stream';
            const uploadedPath = await this.minioService.uploadBuffer(
              client.companyId,
              newPath,
              fileBuffer,
              mimeType
            );
            attachmentUrls.push(uploadedPath);
            console.log(`Copied: ${fileName}`);
          } catch (error) {
            console.error(` Failed to copy document ${doc.name}:`, error);
            // Continue without this document if copy fails
          }
        }
      }

      console.log(`Total attachments: ${attachmentUrls.length}`);

      // Create a folder in "My Documents" for this request with all attachments inside
      if (attachmentUrls.length > 0) {
        console.log('Creating folder and document entries...');

        // 1. Create the folder for this request
        const requestFolder = await this.prisma.document.create({
          data: {
            name: `Demande ${request.id} - ${dto.subject}`,
            url: `requests/${requestFolderName}`, // Folder path in MinIO
            type: 'folder',
            status: 'active',
            ownerId: clientId,
            companyId: client.companyId,
            requestId: request.id,
            isFolder: true,
            size: 0,
            permissions: [],
            children: [], // Will be updated with child document IDs
          },
        });
        console.log(`Folder created: ${requestFolder.name}`);

        const childIds: string[] = [];

        // 2. Create document entries for each attachment as children of the folder
        for (const attachmentPath of attachmentUrls) {
          try {
            // Extract filename from path
            const fileName = attachmentPath.split('/').pop() || 'attachment';

            // Get file metadata from MinIO
            const metadata = await this.minioService.getFileMetadata(attachmentPath);

            const doc = await this.prisma.document.create({
              data: {
                name: fileName,
                url: attachmentPath,
                type: 'request_attachment',
                status: 'active',
                ownerId: clientId,
                companyId: client.companyId,
                requestId: request.id,
                parentId: requestFolder.id, // Link to parent folder
                size: metadata.size || 0,
                mimeType: metadata.metaData?.['content-type'] || 'application/octet-stream',
                isFolder: false,
                permissions: [],
                children: [],
              },
            });

            childIds.push(doc.id.toString());
            console.log(` Document created: ${fileName}`);
          } catch (error) {
            console.error('Error creating document entry:', error);
            // Continue even if document creation fails
          }
        }

        // 3. Update folder with children IDs
        await this.prisma.document.update({
          where: { id: requestFolder.id },
          data: { children: childIds },
        });
        console.log(`Folder updated with ${childIds.length} children`);
      }

      // Update request with attachments
      const updatedRequest = await this.prisma.request.update({
        where: { id: request.id },
        data: { attachments: attachmentUrls },
        include: {
          client: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // Generate presigned URLs for attachments
      const attachmentPresignedUrls: string[] = [];
      for (const attachmentPath of attachmentUrls) {
        try {
          const url = await this.minioService.getPresignedUrl(
            attachmentPath,
            7 * 24 * 60 * 60 // 7 days
          );
          attachmentPresignedUrls.push(url);
        } catch (error) {
          console.error('Error generating presigned URL:', error);
          attachmentPresignedUrls.push(attachmentPath); // Fallback
        }
      }

      // Auto-create tasks for collaborators if provided (not for accountants)
      if (dto.collaboratorIds && dto.collaboratorIds.length > 0) {
        // Parse collaboratorIds (may come as strings from multipart)
        const collaboratorIds = dto.collaboratorIds
          .map((id) => (typeof id === 'string' ? parseInt(id, 10) : id))
          .filter((id) => !isNaN(id));

        // Detect if this is a vocal request
        const hasAudioAttachment = attachmentUrls.some((url: string) => {
          const ext = url.split('.').pop()?.toLowerCase();
          return ['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(ext || '');
        });

        const taskDescription =
          hasAudioAttachment && !updatedRequest.description
            ? '📢 Cette tâche contient un message vocal du client. Veuillez écouter le message audio pour plus de détails.'
            : updatedRequest.description || null;

        for (const collaboratorId of collaboratorIds) {
          const task = await this.prisma.task.create({
            data: {
              title: `Demande: ${updatedRequest.subject}`,
              description: taskDescription,
              type: 'other',
              priority:
                updatedRequest.urgency === 'urgent'
                  ? 'urgent'
                  : updatedRequest.urgency === 'high'
                    ? 'high'
                    : 'medium',
              assigneeId: collaboratorId,
              createdById: clientId,
              companyId: client.companyId,
              attachments: attachmentUrls,
            },
          });

          // Create TaskClient entry for the request's client
          await this.prisma.taskClient.create({
            data: {
              taskId: task.id,
              clientId: clientId,
            },
          });
        }
      }

      // Notify accountant's firm about new request
      if (accountingFirmId) {
        const accountants = await this.prisma.user.findMany({
          where: { companyId: accountingFirmId },
          select: { id: true, firstName: true, lastName: true },
        });
        const clientUser = await this.prisma.user.findUnique({
          where: { id: clientId },
          select: { firstName: true, lastName: true },
        });
        const actorName = clientUser
          ? `${clientUser.firstName} ${clientUser.lastName}`
          : 'Un client';
        for (const accountant of accountants) {
          this.notificationService
            .notify({
              recipientId: accountant.id,
              type: 'request',
              action: 'created',
              actorName,
              data: { requestId: request.id },
            })
            .catch(() => {});
        }
      }

      return {
        success: true,
        message: MSG.request.created,
        data: {
          ...updatedRequest,
          attachmentUrls: attachmentPresignedUrls,
        },
      };
    } catch (error) {
      console.error('Create request error:', error);
      throw error;
    }
  }

  /**
   * Get requests accessible to the connected user for chat attachment.
   * - CLIENT: requests where clientId = userId
   * - ACCOUNTANT: requests where accountingFirmId = companyId OR assignedToId = userId
   * - COLLABORATOR: requests where assignedToId = userId OR companyId = companyId
   */
  async getChatAccessibleRequests(userId: number, limit = 100) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: { select: { code: true } } },
    });
    if (!user) return { success: true, data: [] };

    const roleCode = user.role?.code ?? '';
    let where: any;

    if (roleCode === 'CLIENT') {
      where = { clientId: userId };
    } else if (roleCode === 'ACCOUNTANT') {
      // Include requests linked to the firm OR directly assigned
      const orClauses: any[] = [{ assignedToId: userId }];
      if (user.companyId) orClauses.push({ accountingFirmId: user.companyId });
      where = { OR: orClauses };
    } else {
      // COLLABORATOR or other — requests assigned to them or belonging to their company
      const orClauses: any[] = [{ assignedToId: userId }];
      if (user.companyId) orClauses.push({ companyId: user.companyId });
      where = { OR: orClauses };
    }

    const requests = await this.prisma.request.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        subject: true,
        type: true,
        urgency: true,
        status: true,
        createdAt: true,
      },
    });

    return { success: true, data: requests };
  }

  /**
   * Get my requests (Client)
   */
  async getMyRequests(
    clientId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    sortBy?: 'urgency' | 'status' | 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = { clientId };

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { topic: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { type: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'urgency') {
      orderBy.urgency = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [total, requests] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          convertedToTask: {
            select: {
              id: true,
              title: true,
              status: true,
            },
          },
        },
      }),
    ]);

    // Generate presigned URLs for attachments and response attachments
    const requestsWithUrls = await Promise.all(
      requests.map(async (request) => {
        const attachmentUrls: string[] = [];
        const responseAttachmentUrls: string[] = [];

        if (request.attachments && Array.isArray(request.attachments)) {
          for (const attachmentPath of request.attachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              attachmentUrls.push(url);
            } catch (error) {
              console.error('Error generating presigned URL for attachment:', error);
              attachmentUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        const responseAttachments = (request as any).responseAttachments;
        if (responseAttachments && Array.isArray(responseAttachments)) {
          for (const attachmentPath of responseAttachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              responseAttachmentUrls.push(url);
            } catch (error) {
              console.error('Error generating presigned URL for response attachment:', error);
              responseAttachmentUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        return {
          ...request,
          attachmentUrls, // URLs présignées pour télécharger
          attachments: request.attachments, // Chemins originaux (optionnel)
          responseAttachments: responseAttachmentUrls,
        };
      })
    );

    // Count by status
    const statusCounts = await this.prisma.request.groupBy({
      by: ['status'],
      where: { clientId },
      _count: true,
    });

    const counts = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      const status = item.status as keyof typeof counts;
      if (status in counts) {
        counts[status] = item._count;
      }
    });

    return {
      success: true,
      data: requestsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    };
  }

  /**
   * Get requests assigned to me (Accountant)
   */
  async getMyAssignedRequests(
    accountantId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    urgency?: string,
    sortBy?: 'urgency' | 'status' | 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      assignedToId: accountantId,
    };

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    if (search && search.trim()) {
      where.OR = [
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { topic: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { type: { contains: search.trim(), mode: 'insensitive' } },
        { client: { firstName: { contains: search.trim(), mode: 'insensitive' } } },
        { client: { lastName: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'urgency') {
      orderBy.urgency = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [total, requests, statusCounts] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          convertedToTask: {
            select: {
              id: true,
              title: true,
              status: true,
              assignee: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        where: {
          assignedToId: accountantId,
          // Removed convertedToTaskId: null filter to count all requests including those assigned to collaborators
        },
        _count: true,
      }),
    ]);

    const counts = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      const status = item.status as keyof typeof counts;
      if (status in counts) {
        counts[status] = item._count;
      }
    });

    // Generate presigned URLs for attachments and response attachments
    const requestsWithUrls = await Promise.all(
      requests.map(async (request) => {
        const attachmentUrls: string[] = [];
        const responseAttachmentUrls: string[] = [];

        if (request.attachments && Array.isArray(request.attachments)) {
          for (const attachmentPath of request.attachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              attachmentUrls.push(url);
            } catch (error) {
              console.error('Error generating presigned URL for attachment:', error);
              attachmentUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        const responseAttachments = (request as any).responseAttachments;
        if (responseAttachments && Array.isArray(responseAttachments)) {
          for (const attachmentPath of responseAttachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              responseAttachmentUrls.push(url);
            } catch (error) {
              console.error('Error generating presigned URL for response attachment:', error);
              responseAttachmentUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        return {
          ...request,
          attachmentUrls, // URLs présignées pour télécharger
          attachments: request.attachments, // Chemins originaux (optionnel)
          responseAttachments: responseAttachmentUrls,
        };
      })
    );

    return {
      success: true,
      data: requestsWithUrls,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    };
  }

  /**
   * Get all unassigned requests (Accountant) - Client requests waiting for assignment
   */
  async getAllRequests(
    accountantId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    urgency?: string,
    sortBy?: 'urgency' | 'status' | 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    search?: string
  ) {
    // Get accountant's company
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError(MSG.accountant.no_company, 400, 'NO_COMPANY');
    }

    // Get all client company IDs that have a relationship with this accounting firm
    const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
      where: {
        accountingFirmId: accountant.companyId,
      },
      select: { clientCompanyId: true },
    });

    const clientCompanyIds = relationships.map((r) => r.clientCompanyId);

    const skip = (page - 1) * limit;
    const where: any = {
      OR: [
        // Requests with accountingFirmId set
        {
          accountingFirmId: accountant.companyId,
          assignedToId: null,
          convertedToTaskId: null,
        },
        // Requests from client companies connected to this firm (even if accountingFirmId is null)
        {
          companyId: { in: clientCompanyIds },
          assignedToId: null,
          convertedToTaskId: null,
        },
      ],
    };

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    if (search && search.trim()) {
      where.OR = [
        { subject: { contains: search.trim(), mode: 'insensitive' } },
        { topic: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { type: { contains: search.trim(), mode: 'insensitive' } },
        { client: { firstName: { contains: search.trim(), mode: 'insensitive' } } },
        { client: { lastName: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    const orderBy: any = {};
    if (sortBy === 'urgency') {
      orderBy.urgency = sortOrder;
    } else if (sortBy === 'status') {
      orderBy.status = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [total, requests] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          client: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          convertedToTask: {
            select: {
              id: true,
              title: true,
              status: true,
              assignee: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // Count by status (only unassigned requests)
    const statusCounts = await this.prisma.request.groupBy({
      by: ['status'],
      where: {
        OR: [
          {
            accountingFirmId: accountant.companyId,
            assignedToId: null,
            convertedToTaskId: null,
          },
          {
            companyId: { in: clientCompanyIds },
            assignedToId: null,
            convertedToTaskId: null,
          },
        ],
      },
      _count: true,
    });

    const counts = {
      pending: 0,
      in_progress: 0,
      resolved: 0,
      rejected: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      const status = item.status as keyof typeof counts;
      if (status in counts) {
        counts[status] = item._count;
      }
    });

    // Generate presigned URLs for attachments and response attachments
    const requestsWithUrls = await Promise.all(
      requests.map(async (request) => {
        const attachmentUrls: string[] = [];
        const responseAttachmentUrls: string[] = [];

        if (request.attachments && Array.isArray(request.attachments)) {
          for (const attachmentPath of request.attachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              attachmentUrls.push(url);
            } catch (error) {
              console.error('Error generating presigned URL for attachment:', error);
              attachmentUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        const responseAttachments = (request as any).responseAttachments;
        if (responseAttachments && Array.isArray(responseAttachments)) {
          for (const attachmentPath of responseAttachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              responseAttachmentUrls.push(url);
            } catch (error) {
              console.error('Error generating presigned URL for response attachment:', error);
              responseAttachmentUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        return {
          ...request,
          attachmentUrls, // URLs présignées pour télécharger
          attachments: request.attachments, // Chemins originaux (optionnel)
          responseAttachments: responseAttachmentUrls,
        };
      })
    );

    return {
      success: true,
      data: requestsWithUrls,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      counts,
    };
  }

  /**
   * Get request by ID
   */
  async getRequestById(requestId: number, userId: number) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        convertedToTask: {
          select: {
            id: true,
            title: true,
            status: true,
            assignee: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!request) {
      throw new ApiError(MSG.request.not_found, 404, 'REQUEST_NOT_FOUND');
    }

    // Check access rights
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: { select: { code: true } } },
    });

    // Allow access if:
    // 1. User is the client
    // 2. User is assigned to the request
    // 3. Request's accountingFirmId matches user's company
    // 4. User's accounting firm has a relationship with the client's company
    let hasAccess =
      request.clientId === userId ||
      request.assignedToId === userId ||
      (request.accountingFirmId && request.accountingFirmId === user?.companyId);

    // For accountants/collaborators, also check for company relationships
    if (!hasAccess && user?.companyId && request.companyId) {
      const isAccountantOrCollab = ['ACCOUNTANT', 'COLLABORATOR', 'ADMINISTRATOR'].includes(
        user.role?.code || ''
      );

      if (isAccountantOrCollab) {
        const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
          where: {
            clientCompanyId: request.companyId,
            accountingFirmId: user.companyId,
          },
        });
        hasAccess = !!relationship;
      }
    }

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Generate presigned URLs for attachments and response attachments
    const attachmentUrls: string[] = [];
    const responseAttachmentUrls: string[] = [];

    if (request.attachments && Array.isArray(request.attachments)) {
      for (const attachmentPath of request.attachments) {
        try {
          const url = await this.minioService.getPresignedUrl(
            attachmentPath,
            7 * 24 * 60 * 60 // 7 days
          );
          attachmentUrls.push(url);
        } catch (error) {
          console.error('Error generating presigned URL for attachment:', error);
          attachmentUrls.push(attachmentPath); // Fallback to path
        }
      }
    }

    if (request.responseAttachments && Array.isArray(request.responseAttachments)) {
      for (const attachmentPath of request.responseAttachments) {
        try {
          const url = await this.minioService.getPresignedUrl(
            attachmentPath,
            7 * 24 * 60 * 60 // 7 days
          );
          responseAttachmentUrls.push(url);
        } catch (error) {
          console.error('Error generating presigned URL for response attachment:', error);
          responseAttachmentUrls.push(attachmentPath); // Fallback to path
        }
      }
    }

    return {
      success: true,
      data: {
        ...request,
        attachmentUrls, // URLs présignées pour télécharger
        responseAttachments: responseAttachmentUrls,
      },
    };
  }

  /**
   * Update request
   */
  async updateRequest(
    requestId: number,
    dto: UpdateRequestDto,
    userId: number,
    files?: Express.Multer.File[]
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new ApiError(MSG.request.not_found, 404, 'REQUEST_NOT_FOUND');
    }

    // Check access rights
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, role: { select: { code: true } } },
    });

    const isAccountingFirmMember =
      (user?.role?.code === 'ACCOUNTANT' ||
        user?.role?.code === 'ADMINISTRATOR' ||
        user?.role?.code === 'COLLABORATOR') &&
      request.accountingFirmId === user.companyId;

    // Allow access if: user is the client, assigned to the request, or from the accounting firm
    if (request.clientId !== userId && request.assignedToId !== userId && !isAccountingFirmMember) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Handle file uploads if provided
    let attachmentUrls: string[] = [...request.attachments]; // Start with existing attachments

    if (files && files.length > 0) {
      const client = await this.prisma.user.findUnique({
        where: { id: request.clientId },
        select: { companyId: true },
      });

      if (!client?.companyId) {
        throw new ApiError('Company not found', 404, 'COMPANY_NOT_FOUND');
      }

      // Check if the new files are audio files (voice request update)
      const audioMimeTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/wave',
        'audio/x-wav',
        'audio/ogg',
        'audio/webm',
        'audio/mp4',
        'audio/x-m4a',
      ];
      const isAudioUpdate = files.some((f) => audioMimeTypes.includes(f.mimetype));

      // If updating with audio files, REPLACE all existing audio attachments
      if (isAudioUpdate) {
        // Remove all existing audio files from attachmentUrls
        attachmentUrls = attachmentUrls.filter((url) => {
          const ext = url.split('.').pop()?.toLowerCase();
          return !['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(ext || '');
        });
      }

      // Upload new files to the request-specific folder
      const requestFolderName = `demande-${requestId}`;
      for (const file of files) {
        try {
          const uploadedPath = await this.minioService.uploadFile(
            client.companyId,
            `requests/${requestFolderName}`,
            file
          );
          attachmentUrls.push(uploadedPath);
        } catch (error) {
          console.error('MinIO upload error:', error);
          // Continue without the file if upload fails
        }
      }
    }

    const updateData: any = {};
    if (dto.subject !== undefined) updateData.subject = dto.subject;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.urgency !== undefined) updateData.urgency = dto.urgency;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.topic !== undefined) updateData.topic = dto.topic;
    if (dto.desiredResponseDate !== undefined)
      updateData.desiredResponseDate = dto.desiredResponseDate;
    if (dto.desiredResponseTime !== undefined)
      updateData.desiredResponseTime = dto.desiredResponseTime;

    // Handle assignment changes
    // Check if assignedToId is explicitly being set (could be a number or null)
    // The DTO Transform already converts empty strings to null
    if (dto.assignedToId !== undefined) {
      // If it's null or 0, unassign
      if (dto.assignedToId === null || dto.assignedToId === 0) {
        updateData.assignedToId = null;
        // If there's a converted task, cancel it
        if (request.convertedToTaskId) {
          await this.prisma.task.update({
            where: { id: request.convertedToTaskId },
            data: { status: 'cancelled' },
          });
          // Clear the conversion reference
          updateData.convertedToTaskId = null;
          updateData.convertedAt = null;
        }
      } else {
        // Validate that the assignee is an accountant or collaborator
        const assignee = await this.prisma.user.findUnique({
          where: { id: dto.assignedToId as number },
          include: {
            role: {
              select: {
                code: true,
              },
            },
          },
        });

        if (!assignee) {
          throw new ApiError('Assignee user not found', 404, 'ASSIGNEE_NOT_FOUND');
        }

        if (assignee.role?.code !== 'ACCOUNTANT' && assignee.role?.code !== 'COLLABORATOR') {
          throw new ApiError(
            'Only accountants and collaborators can be assigned to requests',
            400,
            'INVALID_ASSIGNEE_ROLE'
          );
        }

        // If assigning to a COLLABORATOR, convert to task automatically
        if (assignee.role?.code === 'COLLABORATOR') {
          // Map urgency to priority
          const priorityMap = {
            low: 'low',
            normal: 'medium',
            high: 'high',
            urgent: 'urgent',
          };

          // Check if request is already converted to a task
          if (request.convertedToTaskId) {
            // Update existing task's assignee
            await this.prisma.task.update({
              where: { id: request.convertedToTaskId },
              data: {
                assigneeId: dto.assignedToId,
                title: dto.subject || undefined,
                description: dto.description || undefined,
                type: dto.type || undefined,
                priority: dto.urgency ? priorityMap[dto.urgency] : undefined,
                dueDate: dto.desiredResponseDate ? new Date(dto.desiredResponseDate) : undefined,
              },
            });

            updateData.status = 'in_progress';
            updateData.assignedToId = userId; // Keep accountant as the request owner

            // Notify the new collaborator
            this.notificationService
              .notify({
                recipientId: assignee.id,
                type: 'task',
                action: 'assigned',
                actorName: 'Votre comptable',
                data: { taskId: request.convertedToTaskId },
              })
              .catch(() => {});
          } else {
            // Detect if this is a vocal request (has audio attachments)
            const hasAudioAttachment = request.attachments?.some((att: string) => {
              const ext = att.split('.').pop()?.toLowerCase();
              return ['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(ext || '');
            });

            // For vocal requests, enhance the description
            let taskDescription = dto.description || request.description || '';
            if (hasAudioAttachment && !taskDescription) {
              taskDescription =
                '📢 Cette tâche contient un message vocal du client. Veuillez écouter le message audio pour plus de détails.';
            }

            // Create new task for the collaborator
            const task = await this.prisma.task.create({
              data: {
                title: dto.subject || request.subject,
                description: taskDescription,
                type: dto.type || request.type,
                priority: priorityMap[dto.urgency || request.urgency] || 'medium',
                dueDate: dto.desiredResponseDate
                  ? new Date(dto.desiredResponseDate)
                  : request.desiredResponseDate
                    ? new Date(request.desiredResponseDate)
                    : null,
                assigneeId: dto.assignedToId,
                createdById: userId,
                companyId: request.companyId,
                requestId: request.id,
                attachments: attachmentUrls,
              },
            });

            // Create TaskClient entry for the request's client
            if (request.clientId) {
              await this.prisma.taskClient.create({
                data: {
                  taskId: task.id,
                  clientId: request.clientId,
                },
              });
            }

            // Mark request as converted
            updateData.convertedToTaskId = task.id;
            updateData.convertedAt = new Date();
            updateData.status = 'in_progress';
            updateData.assignedToId = userId; // Keep accountant as the assigned person for the request

            // Notify the collaborator
            this.notificationService
              .notify({
                recipientId: assignee.id,
                type: 'task',
                action: 'assigned',
                actorName: 'Votre comptable',
                data: { taskId: task.id },
              })
              .catch(() => {});
          }
        } else {
          // Assigning to an ACCOUNTANT - keep as request
          updateData.assignedToId = dto.assignedToId as number;
          // Note: Status is NOT automatically changed per requirement #5
        }
      }
    }

    // Update attachments if new files were uploaded
    if (files && files.length > 0) {
      updateData.attachments = attachmentUrls;
    }

    if (dto.status === RequestStatus.RESOLVED) {
      updateData.resolvedAt = new Date();
    }

    const updatedRequest = await this.prisma.request.update({
      where: { id: requestId },
      data: updateData,
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        convertedToTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    // Notify the other party about the update
    const recipientId =
      userId === request.clientId ? updatedRequest.assignedTo?.id : updatedRequest.client.id;

    if (recipientId) {
      this.notificationService
        .notify({
          recipientId,
          type: 'request',
          action: dto.status ? 'status_changed' : 'updated',
          actorName: userId === request.clientId ? 'Le client' : 'Votre comptable',
          data: { requestId, status: dto.status },
        })
        .catch(() => {});
    }

    // Generate presigned URLs for attachments
    const attachmentPresignedUrls: string[] = [];
    if (updatedRequest.attachments && Array.isArray(updatedRequest.attachments)) {
      for (const attachmentPath of updatedRequest.attachments) {
        try {
          const url = await this.minioService.getPresignedUrl(
            attachmentPath,
            7 * 24 * 60 * 60 // 7 days
          );
          attachmentPresignedUrls.push(url);
        } catch (error) {
          console.error('Error generating presigned URL for attachment:', error);
          attachmentPresignedUrls.push(attachmentPath); // Fallback to path
        }
      }
    }

    return {
      success: true,
      message: MSG.request.updated,
      data: {
        ...updatedRequest,
        attachmentUrls: attachmentPresignedUrls,
      },
    };
  }
  async respondToRequest(
    requestId: number,
    dto: RespondRequestDto,
    accountantId: number,
    files?: Express.Multer.File[]
  ) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: {
          select: { companyId: true },
        },
      },
    });

    if (!request) {
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Get accountant's company for MinIO bucket
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError('Accountant must belong to a company', 400, 'NO_COMPANY');
    }

    // Upload response attachments to MinIO if provided
    const responseAttachmentUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `request-response-${Date.now()}-${file.originalname}`;
        const filePath = `requests/responses/${fileName}`;

        try {
          await this.minioService.uploadFile(accountant.companyId, filePath, file);
          responseAttachmentUrls.push(filePath);
        } catch (error) {
          console.error('MinIO upload error:', error);
        }
      }
    }

    const updatedRequest = await this.prisma.request.update({
      where: { id: requestId },
      data: {
        response: dto.response,
        responseAttachments: responseAttachmentUrls,
        status: 'in_progress',
        respondedAt: new Date(),
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Notify client about accountant's response
    this.notificationService
      .notify({
        recipientId: updatedRequest.client.id,
        type: 'request',
        action: 'responded',
        actorName: 'Votre comptable',
        data: { requestId },
      })
      .catch(() => {});

    return {
      success: true,
      message: MSG.request.responded,
      data: updatedRequest,
    };
  }

  /**
   * Convert request to task (Accountant)
   */
  async convertToTask(requestId: number, dto: ConvertToTaskDto, accountantId: number) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
      include: {
        client: true,
      },
    });

    if (!request) {
      throw new ApiError(MSG.request.not_found, 404, 'REQUEST_NOT_FOUND');
    }
    if (request.convertedToTaskId) {
      throw new ApiError(MSG.request.already_converted, 400, 'ALREADY_CONVERTED');
    }

    // Map urgency to priority
    const priorityMap = {
      low: 'low',
      normal: 'medium',
      high: 'high',
      urgent: 'urgent',
    };

    // Detect if this is a vocal request
    const hasAudioAttachment = request.attachments?.some((att: string) => {
      const ext = att.split('.').pop()?.toLowerCase();
      return ['mp3', 'wav', 'm4a', 'ogg', 'webm'].includes(ext || '');
    });

    const taskDescription =
      hasAudioAttachment && !request.description
        ? '📢 Cette tâche contient un message vocal du client. Veuillez écouter le message audio pour plus de détails.'
        : request.description || '';

    // Create task
    const task = await this.prisma.task.create({
      data: {
        title: request.subject,
        description: taskDescription,
        type: request.type,
        priority: dto.priority || priorityMap[request.urgency] || 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId,
        createdById: accountantId,
        companyId: request.companyId,
        requestId: request.id,
        attachments: request.attachments || [],
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Create TaskClient entry for the request's client
    if (request.clientId) {
      await this.prisma.taskClient.create({
        data: {
          taskId: task.id,
          clientId: request.clientId,
        },
      });
    }

    // Update request with task reference
    await this.prisma.request.update({
      where: { id: requestId },
      data: {
        convertedToTaskId: task.id,
        convertedAt: new Date(),
        status: 'in_progress',
        assignedToId: accountantId,
      },
    });

    return {
      success: true,
      message: MSG.request.converted,
      data: {
        request: {
          id: request.id,
          subject: request.subject,
          status: 'in_progress',
        },
        task,
      },
    };
  }

  /**
   * Get chat-accessible requests for a client (for messagerie attachments)
   */
  async getChatAccessibleRequestsByClient(
    clientId: number,
    accountantId: number,
    page: number = 1,
    limit: number = 5
  ) {
    // Verify accountant has access to this client
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError(
        'Accountant not found or not associated with a company',
        403,
        'ACCESS_DENIED'
      );
    }

    // Verify client exists
    const client = await this.prisma.user.findUnique({
      where: { id: clientId },
      select: { id: true },
    });

    if (!client) {
      throw new ApiError('Client not found', 404, 'CLIENT_NOT_FOUND');
    }

    const where = {
      clientId,
      accountingFirmId: accountant.companyId,
      status: { notIn: ['cancelled', 'rejected'] },
    };

    const [requests, total] = await Promise.all([
      this.prisma.request.findMany({
        where,
        select: {
          id: true,
          subject: true,
          type: true,
          urgency: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.request.count({ where }),
    ]);

    return {
      success: true,
      data: requests,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete request
   */
  async deleteRequest(requestId: number, userId: number) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new ApiError(MSG.request.not_found, 404, 'REQUEST_NOT_FOUND');
    }

    // Only client can delete their own request
    if (request.clientId !== userId) {
      throw new ApiError(MSG.request.creator_only_delete, 403, 'ACCESS_DENIED');
    }
    await this.prisma.request.delete({
      where: { id: requestId },
    });

    return {
      success: true,
      message: MSG.request.deleted,
    };
  }
}
