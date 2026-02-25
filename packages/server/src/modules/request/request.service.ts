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
      console.log('Subject value:', dto.subject);
      console.log('Subject type:', typeof dto.subject);

      // Validate subject field
      if (!dto.subject || dto.subject.trim() === '') {
        throw new ApiError('Subject is required', 400, 'SUBJECT_REQUIRED');
      }

      // Get client's company
      const client = await this.prisma.user.findUnique({
        where: { id: clientId },
        select: { companyId: true },
      });

      // Upload attachments to MinIO if provided
      const attachmentUrls: string[] = [];
      if (files && files.length > 0 && client?.companyId) {
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

      // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
      const request = await this.prisma.request.create({
        data: {
          subject: dto.subject.trim(),
          description: dto.description?.trim() || null,
          type: dto.type,
          urgency: dto.urgency || 'normal',
          clientId,
          // @ts-expect-error - Prisma types not yet generated
          companyId: client?.companyId,
          // @ts-expect-error - Prisma types not yet generated
          attachments: attachmentUrls,
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
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      return {
        success: true,
        message: 'Request created successfully',
        data: request,
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

    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
    const [total, requests] = await Promise.all([
      // @ts-expect-error - Prisma types not yet generated
      this.prisma.request.count({ where }),
      // @ts-expect-error - Prisma types not yet generated
      this.prisma.request.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          // @ts-expect-error - Prisma types not yet generated
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
   * Get all requests (Accountant)
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
    const where: any = { companyId: accountant.companyId };

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
          // @ts-expect-error - Prisma types not yet generated
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

    // Count by status
    const statusCounts = await this.prisma.request.groupBy({
      by: ['status'],
      where: { companyId: accountant.companyId },
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
      counts[item.status] = item._count;
    });

    return {
      success: true,
      data: requests,
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
        // @ts-expect-error - Prisma types not yet generated
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
        // @ts-expect-error - Prisma types not yet generated
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

    // @ts-expect-error - Handle both old and new field names
    const assignedToId = request.assignedToId || request.accountantId;

    if (
      request.clientId !== userId &&
      assignedToId !== userId &&
      request.companyId !== user?.companyId
    ) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    return {
      success: true,
      data: request,
    };
  }

  /**
   * Update request
   */
  async updateRequest(requestId: number, dto: UpdateRequestDto, userId: number) {
    const request = await this.prisma.request.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      throw new ApiError('Request not found', 404, 'REQUEST_NOT_FOUND');
    }

    // Check access rights
    // @ts-expect-error - Prisma types not yet generated
    if (request.clientId !== userId && request.assignedToId !== userId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    const updatedRequest = await this.prisma.request.update({
      where: { id: requestId },
      data: {
        subject: dto.subject,
        description: dto.description,
        type: dto.type,
        urgency: dto.urgency,
        status: dto.status,
        resolvedAt: dto.status === RequestStatus.RESOLVED ? new Date() : undefined,
      },
      include: {
        client: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        // @ts-expect-error - Prisma types not yet generated
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
        // @ts-expect-error - Prisma types not yet generated
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

    // @ts-expect-error - Prisma types not yet generated
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
        // @ts-expect-error - Prisma types not yet generated
        title: request.subject,
        // @ts-expect-error - Prisma types not yet generated
        description: request.description || '',
        // @ts-expect-error - Prisma types not yet generated
        type: request.type,
        // @ts-expect-error - Prisma types not yet generated
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
    await this.prisma.request.update({
      where: { id: requestId },
      data: {
        // @ts-expect-error - Prisma types not yet generated
        convertedToTaskId: task.id,
        // @ts-expect-error - Prisma types not yet generated
        convertedAt: new Date(),
        // @ts-expect-error - Prisma types not yet generated
        status: 'in_progress',
        // @ts-expect-error - Prisma types not yet generated
        assignedToId: accountantId,
      },
    });

    return {
      success: true,
      message: 'Request converted to task successfully',
      data: {
        request: {
          id: request.id,
          // @ts-expect-error - Prisma types not yet generated
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
    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
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

    // @ts-expect-error - Prisma types will be generated after running 'npx prisma generate'
    await this.prisma.request.delete({
      where: { id: requestId },
    });

    return {
      success: true,
      message: 'Request deleted successfully',
    };
  }
}
