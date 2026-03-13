import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestDto, RequestStatus } from './dto/update-request.dto';
import { RespondRequestDto } from './dto/respond-request.dto';
import { ConvertToTaskDto } from './dto/convert-to-task.dto';
import { MinioService } from '../../common/services/minio.service';

@Injectable()
export class RequestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  /**
   * Create a new request (Client)
   */
  async createRequest(dto: CreateRequestDto, clientId: number, files?: Express.Multer.File[]) {
    try {
      console.log('CreateRequestDto received:', dto);
      console.log('Files received:', files?.length || 0);
      console.log('Existing document IDs:', dto.existingDocumentIds?.length || 0);

      // Validate subject field
      if (!dto.subject || dto.subject.trim() === '') {
        throw new ApiError('Subject is required', 400, 'SUBJECT_REQUIRED');
      }

      // Get client's company
      const client = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { companyId: true },
      });

      if (!client?.companyId) {
        throw new ApiError('Client must belong to a company', 400, 'NO_COMPANY');
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
          attachments: [], // Will be updated after file uploads
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
            console.log(`✓ Uploaded: ${fileName}`);
          } catch (error) {
            console.error(`✗ Failed to upload ${fileName}:`, error);
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
            console.log(`✓ Copied: ${fileName}`);
          } catch (error) {
            console.error(`✗ Failed to copy document ${doc.name}:`, error);
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
        console.log(`✓ Folder created: ${requestFolder.name}`);

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
            console.log(`✓ Document created: ${fileName}`);
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
        console.log(`✓ Folder updated with ${childIds.length} children`);
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

      return {
        success: true,
        message: 'Request created successfully',
        data: {
          ...updatedRequest,
          attachmentUrls: attachmentPresignedUrls, // URLs présignées MinIO
        },
      };
    } catch (error) {
      console.error('Create request error:', error);
      throw error;
    }
  }

  /**
   * Get my requests (Client)
   */
  async getMyRequests(clientId: number, page: number = 1, limit: number = 10, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = { clientId };

    if (status) {
      where.status = status;
    }

    const [total, requests] = await Promise.all([
      this.prisma.request.count({ where }),
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
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

    // Generate presigned URLs for attachments
    const requestsWithUrls = await Promise.all(
      requests.map(async (request) => {
        const attachmentUrls: string[] = [];

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

        return {
          ...request,
          attachmentUrls, // URLs présignées pour télécharger
          attachments: request.attachments, // Chemins originaux (optionnel)
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
    sortBy: 'urgency' | 'createdAt' = 'createdAt'
  ) {
    const skip = (page - 1) * limit;
    const where: any = { assignedToId: accountantId };

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    const orderBy: any = {};
    if (sortBy === 'urgency') {
      const urgencyOrder = ['urgent', 'high', 'normal', 'low'];
      orderBy.urgency = 'asc';
    } else {
      orderBy.createdAt = 'desc';
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
        },
      }),
      this.prisma.request.groupBy({
        by: ['status'],
        where: { assignedToId: accountantId },
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

    return {
      success: true,
      data: requests,
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
    sortBy: 'urgency' | 'createdAt' = 'createdAt'
  ) {
    // Get accountant's company
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant?.companyId) {
      throw new ApiError('Accountant must belong to a company', 400, 'NO_COMPANY');
    }

    const skip = (page - 1) * limit;
    const where: any = {
      companyId: accountant.companyId,
      assignedToId: null, // Only unassigned requests
    };

    if (status) {
      where.status = status;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    const orderBy: any = {};
    if (sortBy === 'urgency') {
      orderBy.urgency = 'desc';
    } else {
      orderBy.createdAt = 'desc';
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

    // Count by status (only unassigned requests)
    const statusCounts = await this.prisma.request.groupBy({
      by: ['status'],
      where: {
        companyId: accountant.companyId,
        assignedToId: null, // Only count unassigned requests
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

    // Generate presigned URLs for attachments
    const requestsWithUrls = await Promise.all(
      requests.map(async (request) => {
        const attachmentUrls: string[] = [];

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

        return {
          ...request,
          attachmentUrls, // URLs présignées pour télécharger
          attachments: request.attachments, // Chemins originaux (optionnel)
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
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Check access rights
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (
      request.clientId !== userId &&
      request.assignedToId !== userId &&
      request.companyId !== user?.companyId
    ) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Generate presigned URLs for attachments
    const attachmentUrls: string[] = [];
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

    return {
      success: true,
      data: {
        ...request,
        attachmentUrls, // URLs présignées pour télécharger
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
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Check access rights
    if (request.clientId !== userId && request.assignedToId !== userId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Handle file uploads if provided
    const attachmentUrls: string[] = [...request.attachments]; // Keep existing attachments

    if (files && files.length > 0) {
      const client = await this.prisma.user.findUnique({
        where: { id: request.clientId },
        select: { companyId: true },
      });

      if (!client?.companyId) {
        throw new ApiError('Company not found', 404, 'COMPANY_NOT_FOUND');
      }

      for (const file of files) {
        const fileName = `request-${Date.now()}-${file.originalname}`;
        const filePath = `requests/${fileName}`;

        try {
          await this.minioService.uploadFile(client.companyId, filePath, file);
          attachmentUrls.push(filePath);
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
    if (dto.assignedToId !== undefined && dto.assignedToId !== null) {
      // Validate that the assignee is an accountant or collaborator
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
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

      updateData.assignedToId = dto.assignedToId;
      // Note: Status is NOT automatically changed per requirement #5
    } else if (dto.assignedToId === null || dto.assignedToId === undefined) {
      // Explicitly allow null to unassign (when sent as null or empty string converted to null)
      updateData.assignedToId = null;
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

    return {
      success: true,
      message: 'Request updated successfully',
      data: updatedRequest,
    };
  }

  /**
   * Respond to request (Accountant)
   */
  async respondToRequest(requestId: number, dto: RespondRequestDto, accountantId: number) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    const updatedRequest = await this.prisma.request.update({
      where: { id: requestId },
      data: {
        response: dto.response,
        status: 'in_progress',
        assignedToId: accountantId,
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

    return {
      success: true,
      message: 'Response sent successfully',
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
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }
    if (request.convertedToTaskId) {
      throw new ApiError('Request already converted to task', 400, 'ALREADY_CONVERTED');
    }

    // Map urgency to priority
    const priorityMap = {
      low: 'low',
      normal: 'medium',
      high: 'high',
      urgent: 'urgent',
    };

    // Create task
    const task = await this.prisma.task.create({
      data: {
        title: request.subject,
        description: request.description || '',
        type: request.type,
        priority: dto.priority || priorityMap[request.urgency] || 'medium',
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        assigneeId: dto.assigneeId,
        createdById: accountantId,
        clientId: request.clientId,
        companyId: request.companyId,
        requestId: request.id,
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
      message: 'Request converted to task successfully',
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
   * Delete request
   */
  async deleteRequest(requestId: number, userId: number) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Only client can delete their own request
    if (request.clientId !== userId) {
      throw new ApiError('Only request creator can delete', 403, 'ACCESS_DENIED');
    }
    await this.prisma.request.delete({
      where: { id: requestId },
    });

    return {
      success: true,
      message: 'Request deleted successfully',
    };
  }
}
