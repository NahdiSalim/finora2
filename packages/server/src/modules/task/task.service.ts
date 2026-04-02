import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto, TaskStatus } from './dto/update-task.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { ValidateTaskDto, ValidationAction } from './dto/validate-task.dto';
import { MinioService } from '../../common/services/minio.service';
import { NotificationService } from '../notification/notification.service';

export interface TaskComment {
  id: string;
  userId: number;
  username: string;
  comment: string;
  attachments: string[];
  createdAt: string;
}

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService,
    private readonly notificationService: NotificationService
  ) {}

  /**
   * Create a new task (Accountant)
   */
  async createTask(dto: CreateTaskDto, createdById: number, files?: Express.Multer.File[]) {
    try {
      // Get creator's company
      const creator = await this.prisma.user.findUnique({
        where: { id: createdById },
        select: { companyId: true },
      });

      if (!creator?.companyId) {
        throw new ApiError(MSG.task.no_company, 400, 'NO_COMPANY');
      }

      // If clientIds are provided, verify there's a relationship between the accounting firm and each client's company
      if (dto.clientIds && dto.clientIds.length > 0) {
        // Get all client companies related to this accounting firm
        const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
          where: {
            accountingFirmId: creator.companyId,
            status: 'active',
          },
          select: { clientCompanyId: true },
        });

        const validClientCompanyIds = relationships.map((r) => r.clientCompanyId);

        // Verify all selected clients belong to valid client companies
        const clients = await this.prisma.user.findMany({
          where: { id: { in: dto.clientIds } },
          select: { id: true, companyId: true },
        });

        const invalidClients = clients.filter((c) => !validClientCompanyIds.includes(c.companyId!));

        if (invalidClients.length > 0) {
          throw new ApiError(
            'Un ou plusieurs clients ne sont pas associés à votre cabinet comptable',
            400,
            'INVALID_CLIENTS'
          );
        }
      }

      // Use creator's company as the main company for the task
      const taskCompanyId = creator.companyId;

      // Upload attachments to MinIO if provided
      const attachmentUrls: string[] = [];
      if (files && files.length > 0) {
        for (const file of files) {
          const fileName = `task-${Date.now()}-${file.originalname}`;
          const filePath = `tasks/${fileName}`;

          try {
            await this.minioService.uploadFile(taskCompanyId, filePath, file);
            attachmentUrls.push(filePath);
          } catch (error) {
            console.error('MinIO upload error:', error);
            // Continue without the file if upload fails
          }
        }
      }

      // Validate assigneeIds
      if (!dto.assigneeIds || dto.assigneeIds.length === 0) {
        throw new ApiError(MSG.task.no_assignee, 400, 'NO_ASSIGNEE');
      }

      // If multiple assignees, create one task per assignee
      if (dto.assigneeIds.length > 1) {
        const tasks = await Promise.all(
          dto.assigneeIds.map(async (assigneeId) => {
            const task = await this.prisma.task.create({
              data: {
                title: dto.title,
                description: dto.description,
                type: dto.type || 'other',
                priority: dto.priority || 'medium',
                dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
                assigneeId,
                createdById,
                companyId: taskCompanyId,
                attachments: attachmentUrls,
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
                createdBy: { select: { id: true, username: true, email: true } },
                company: { select: { id: true, name: true } },
              },
            });

            // Create TaskClient entries for each client
            if (dto.clientIds && dto.clientIds.length > 0) {
              await this.prisma.taskClient.createMany({
                data: dto.clientIds.map((clientId) => ({
                  taskId: task.id,
                  clientId,
                })),
                skipDuplicates: true,
              });
            }

            return task;
          })
        );

        // Notify each assignee
        const creator = await this.prisma.user.findUnique({
          where: { id: createdById },
          select: { firstName: true, lastName: true },
        });
        const actorName = creator
          ? `${creator.firstName} ${creator.lastName}`
          : 'Votre responsable';
        for (const t of tasks) {
          if (t.assignee) {
            this.notificationService
              .notify({
                recipientId: t.assignee.id,
                type: 'task',
                action: 'assigned',
                actorName,
                data: { taskId: t.id },
              })
              .catch(() => {});
          }
        }

        return {
          success: true,
          message: `${tasks.length} tasks created and assigned successfully`,
          data: tasks,
        };
      }

      // Single assignee
      const task = await this.prisma.task.create({
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type || 'other',
          priority: dto.priority || 'medium',
          dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
          assigneeId: dto.assigneeIds[0],
          createdById,
          companyId: taskCompanyId,
          attachments: attachmentUrls,
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
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
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

      // Create TaskClient entries for each client
      if (dto.clientIds && dto.clientIds.length > 0) {
        await this.prisma.taskClient.createMany({
          data: dto.clientIds.map((clientId) => ({
            taskId: task.id,
            clientId,
          })),
          skipDuplicates: true,
        });
      }

      // Notify single assignee
      const creatorUser = await this.prisma.user.findUnique({
        where: { id: createdById },
        select: { firstName: true, lastName: true },
      });
      this.notificationService
        .notify({
          recipientId: task.assignee!.id,
          type: 'task',
          action: 'assigned',
          actorName: creatorUser
            ? `${creatorUser.firstName} ${creatorUser.lastName}`
            : 'Votre responsable',
          data: { taskId: task.id },
        })
        .catch(() => {});

      return {
        success: true,
        message: MSG.task.created,
        data: task,
      };
    } catch (error) {
      console.error('Create task error:', error);
      throw error;
    }
  }

  /**
   * Get date range based on filter
   */
  private getDateRange(dateFilter?: string): { gte?: Date; lte?: Date } | undefined {
    if (!dateFilter) return undefined;

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    switch (dateFilter) {
      case 'today':
        return { gte: startOfDay, lte: endOfDay };

      case 'week': {
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
        startOfWeek.setHours(0, 0, 0, 0);
        return { gte: startOfWeek, lte: endOfDay };
      }

      case 'month': {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        return { gte: startOfMonth, lte: endOfDay };
      }

      default:
        return undefined;
    }
  }

  /**
   * Get my assigned tasks (Collaborator)
   */
  async getMyTasks(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    priority?: string,
    sortBy: 'priority' | 'dueDate' | 'createdAt' = 'dueDate',
    search?: string,
    dateFilter?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = { assigneeId: userId };

    if (status) {
      where.status = status;
    }

    if (priority) {
      where.priority = priority;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { assignee: { firstName: { contains: search.trim(), mode: 'insensitive' } } },
        { assignee: { lastName: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    // Apply date filter
    const dateRange = this.getDateRange(dateFilter);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const orderBy: any[] = [{ order: 'asc' }];
    if (sortBy === 'priority') {
      // Custom priority order: urgent > high > medium > low
      orderBy.push({ priority: 'desc' });
    } else if (sortBy === 'dueDate') {
      orderBy.push({ dueDate: 'asc' });
    } else {
      orderBy.push({ createdAt: 'desc' });
    }

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
          taskClients: {
            select: {
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  company: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Parse comments and generate presigned URLs for each task
    const tasksWithComments = await Promise.all(
      tasks.map(async (task) => {
        let comments: TaskComment[] = [];
        if (task.subtasks && task.subtasks.length > 0) {
          try {
            comments = JSON.parse(task.subtasks[0] || '[]');
          } catch {
            comments = [];
          }
        }

        // Generate presigned URLs for attachments
        const attachmentPresignedUrls: string[] = [];
        if (task.attachments && Array.isArray(task.attachments)) {
          for (const attachmentPath of task.attachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              attachmentPresignedUrls.push(url);
            } catch (error) {
              attachmentPresignedUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        const taskData = { ...task };
        delete (taskData as any).subtasks;
        return {
          ...taskData,
          comments,
          attachmentUrls: attachmentPresignedUrls,
        };
      })
    );

    // Count by status
    const statusCounts = await this.prisma.task.groupBy({
      by: ['status'],
      where: { assigneeId: userId },
      _count: true,
    });

    const counts = {
      todo: 0,
      in_progress: 0,
      completed: 0,
      cancelled: 0,
    };

    statusCounts.forEach((item) => {
      counts[item.status] = item._count;
    });

    return {
      success: true,
      data: tasksWithComments,
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
   * Get tasks created by me (Accountant)
   */
  async getMyCreatedTasks(
    userId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
    dateFilter?: string
  ) {
    const skip = (page - 1) * limit;
    const where: any = { createdById: userId };

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
        { assignee: { firstName: { contains: search.trim(), mode: 'insensitive' } } },
        { assignee: { lastName: { contains: search.trim(), mode: 'insensitive' } } },
      ];
    }

    // Apply date filter
    const dateRange = this.getDateRange(dateFilter);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
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
          taskClients: {
            select: {
              client: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                  company: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
    ]);

    // Parse comments and generate presigned URLs for each task
    const tasksWithComments = await Promise.all(
      tasks.map(async (task) => {
        let comments: TaskComment[] = [];
        if (task.subtasks && task.subtasks.length > 0) {
          try {
            comments = JSON.parse(task.subtasks[0] || '[]');
          } catch {
            comments = [];
          }
        }

        // Generate presigned URLs for attachments
        const attachmentPresignedUrls: string[] = [];
        if (task.attachments && Array.isArray(task.attachments)) {
          for (const attachmentPath of task.attachments) {
            try {
              const url = await this.minioService.getPresignedUrl(
                attachmentPath,
                7 * 24 * 60 * 60 // 7 days
              );
              attachmentPresignedUrls.push(url);
            } catch (error) {
              attachmentPresignedUrls.push(attachmentPath); // Fallback to path
            }
          }
        }

        const taskData = { ...task };
        delete (taskData as any).subtasks;
        return {
          ...taskData,
          comments,
          attachmentUrls: attachmentPresignedUrls,
        };
      })
    );

    return {
      success: true,
      data: tasksWithComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get task by ID
   */
  async getTaskById(taskId: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
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
        createdBy: {
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
        taskClients: {
          select: {
            client: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                company: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!task) {
      throw new ApiError(MSG.task.not_found, 404, 'TASK_NOT_FOUND');
    }

    // Check access rights - also check if user is a client of this task
    const isClient = task.taskClients.some((tc) => tc.client.id === userId);
    if (task.assigneeId !== userId && task.createdById !== userId && !isClient) {
      throw new ApiError(MSG.task.access_denied, 403, 'ACCESS_DENIED');
    }

    // Parse comments from subtasks
    let comments: TaskComment[] = [];
    if (task.subtasks && task.subtasks.length > 0) {
      try {
        comments = JSON.parse(task.subtasks[0] || '[]');
      } catch (error) {
        console.error('Error parsing comments:', error);
        comments = [];
      }
    }

    // Remove subtasks and add comments
    const taskData = { ...task };
    delete (taskData as any).subtasks;

    // Generate presigned URLs for attachments
    const attachmentPresignedUrls: string[] = [];
    if (task.attachments && Array.isArray(task.attachments)) {
      for (const attachmentPath of task.attachments) {
        try {
          const url = await this.minioService.getPresignedUrl(
            attachmentPath,
            7 * 24 * 60 * 60 // 7 days
          );
          attachmentPresignedUrls.push(url);
        } catch (error) {
          console.error('Error generating presigned URL for task attachment:', error);
          attachmentPresignedUrls.push(attachmentPath); // Fallback to path
        }
      }
    }

    return {
      success: true,
      data: {
        ...taskData,
        comments,
        attachmentUrls: attachmentPresignedUrls,
      },
    };
  }

  /**
   * Update task (Collaborator or Accountant)
   */
  async updateTask(
    taskId: number,
    dto: UpdateTaskDto,
    userId: number,
    files?: Express.Multer.File[],
    userRole?: string
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(MSG.task.not_found, 404, 'TASK_NOT_FOUND');
    }

    // Check access rights
    if (task.assigneeId !== userId && task.createdById !== userId) {
      throw new ApiError(MSG.task.access_denied, 403, 'ACCESS_DENIED');
    }

    // Role-based status restrictions
    const isAccountant = userRole === 'ACCOUNTANT' || task.createdById === userId;
    const isCollaborator = task.assigneeId === userId && !isAccountant;

    // Only accountants can archive tasks
    if (dto.status === TaskStatus.ARCHIVED && !isAccountant) {
      throw new ApiError('Only accountants can archive a task.', 403, 'FORBIDDEN_STATUS');
    }

    // Only accountants can move tasks to "in_review" status
    if (dto.status === TaskStatus.IN_REVIEW && !isAccountant) {
      throw new ApiError('Only accountants can move tasks to review.', 403, 'FORBIDDEN_STATUS');
    }

    // Upload new attachments to MinIO if provided
    const newAttachmentUrls: string[] = [];
    if (files && files.length > 0) {
      for (const file of files) {
        const fileName = `task-${taskId}-${Date.now()}-${file.originalname}`;
        const filePath = `tasks/${fileName}`;

        try {
          await this.minioService.uploadFile(task.companyId!, filePath, file);
          newAttachmentUrls.push(filePath);
        } catch (error) {
          console.error('MinIO upload error:', error);
          // Continue without the file if upload fails
        }
      }
    }

    // Merge existing attachments with new ones
    const allAttachments = [...(task.attachments || []), ...newAttachmentUrls];

    // Handle adding collaborators (creates duplicate tasks)
    if (dto.addCollaborators && dto.addCollaborators.length > 0) {
      // Get existing clients for this task
      const existingClients = await this.prisma.taskClient.findMany({
        where: { taskId: task.id },
        select: { clientId: true },
      });
      const clientIds = existingClients.map((tc) => tc.clientId);

      const newTasks = await Promise.all(
        dto.addCollaborators.map(async (assigneeId) => {
          const newTask = await this.prisma.task.create({
            data: {
              title: dto.title || task.title,
              description: dto.description || task.description,
              type: dto.type || task.type,
              priority: dto.priority || task.priority,
              status: task.status,
              dueDate: dto.dueDate ? new Date(dto.dueDate) : task.dueDate,
              assigneeId,
              createdById: task.createdById,
              companyId: task.companyId,
              attachments: allAttachments,
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

          // Copy clients to new task
          if (clientIds.length > 0) {
            await this.prisma.taskClient.createMany({
              data: clientIds.map((clientId) => ({
                taskId: newTask.id,
                clientId,
              })),
              skipDuplicates: true,
            });
          }

          return newTask;
        })
      );

      // Update the original task
      const updatedTask = await this.prisma.task.update({
        where: { id: taskId },
        data: {
          title: dto.title,
          description: dto.description,
          type: dto.type,
          priority: dto.priority,
          status: dto.status,
          dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
          assigneeId: dto.assigneeId,
          progress: dto.progress,
          order: dto.order,
          attachments: allAttachments,
          completedAt: dto.status === TaskStatus.COMPLETED ? new Date() : undefined,
        },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
          createdBy: {
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
        message: `Task updated and ${newTasks.length} new tasks created for additional collaborators`,
        data: {
          updatedTask,
          newTasks,
        },
      };
    }

    // Regular update without adding collaborators
    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        title: dto.title,
        description: dto.description,
        type: dto.type,
        priority: dto.priority,
        status: dto.status,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
        progress: dto.progress,
        order: dto.order,
        attachments: allAttachments,
        completedAt: dto.status === TaskStatus.COMPLETED ? new Date() : undefined,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Update clientIds if provided
    if (dto.clientIds !== undefined) {
      // Delete existing clients
      await this.prisma.taskClient.deleteMany({
        where: { taskId: task.id },
      });

      // Add new clients
      if (dto.clientIds.length > 0) {
        await this.prisma.taskClient.createMany({
          data: dto.clientIds.map((clientId) => ({
            taskId: task.id,
            clientId,
          })),
          skipDuplicates: true,
        });
      }
    }

    // Notify the other party about task update
    const notifyId = userId === task.assigneeId ? task.createdById : task.assigneeId;
    if (notifyId && notifyId !== userId) {
      let action = 'updated';
      if (dto.status === TaskStatus.COMPLETED) action = 'completed';
      else if (dto.status === TaskStatus.IN_REVIEW) action = 'in_review';

      this.notificationService
        .notify({
          recipientId: notifyId,
          type: 'task',
          action,
          actorName: 'Un collaborateur',
          data: { taskId },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: MSG.task.updated,
      data: updatedTask,
    };
  }
  async startTask(taskId: number, userId: number) {
    return this.updateTask(taskId, { status: TaskStatus.IN_PROGRESS, progress: 10 }, userId);
  }

  /**
   * Submit task for review (Accountant only - to send completed tasks back to review)
   */
  async submitForReview(taskId: number, userId: number) {
    return this.updateTask(taskId, { status: TaskStatus.IN_REVIEW, progress: 90 }, userId);
  }

  /**
   * Mark task as completed (Collaborator and Accountant)
   */
  async completeTask(taskId: number, userId: number) {
    return this.updateTask(taskId, { status: TaskStatus.COMPLETED, progress: 100 }, userId);
  }

  /**
   * Archive task (Accountant only)
   */
  async archiveTask(taskId: number, userId: number) {
    return this.updateTask(
      taskId,
      { status: TaskStatus.ARCHIVED },
      userId,
      undefined,
      'ACCOUNTANT'
    );
  }

  /**
   * Add comment to task (stored in subtasks array temporarily)
   */
  async addComment(
    taskId: number,
    dto: AddCommentDto,
    userId: number,
    files?: Express.Multer.File[]
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(MSG.task.not_found, 404, 'TASK_NOT_FOUND');
    }

    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
      },
    });

    // Upload attachments if provided
    const attachmentUrls: string[] = [];
    if (files && files.length > 0) {
      const task = await this.prisma.task.findUnique({
        where: { id: taskId },
        select: { companyId: true },
      });

      for (const file of files) {
        const fileName = `task-${taskId}-comment-${Date.now()}-${file.originalname}`;
        const filePath = `tasks/comments/${fileName}`;

        try {
          await this.minioService.uploadFile(task!.companyId!, filePath, file);
          attachmentUrls.push(filePath);
        } catch (error) {
          console.error('MinIO upload error:', error);
        }
      }
    }

    // Create comment object
    const comment: TaskComment = {
      id: Date.now().toString(),
      userId: user!.id,
      username: `${user!.firstName || ''} ${user!.lastName || ''}`.trim() || user!.username,
      comment: dto.comment,
      attachments: attachmentUrls,
      createdAt: new Date().toISOString(),
    };

    // Get existing comments from subtasks
    const existingComments: TaskComment[] =
      task.subtasks.length > 0 ? JSON.parse(task.subtasks[0] || '[]') : [];

    // Add new comment
    existingComments.push(comment);

    // Update task with new comments
    await this.prisma.task.update({
      where: { id: taskId },
      data: {
        subtasks: [JSON.stringify(existingComments)],
      },
    });

    return {
      success: true,
      message: MSG.task.comment_added,
      data: comment,
    };
  }

  /**
   * Validate task (Accountant)
   */
  async validateTask(taskId: number, dto: ValidateTaskDto, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(MSG.task.not_found, 404, 'TASK_NOT_FOUND');
    }

    // Only creator can validate
    if (task.createdById !== userId) {
      throw new ApiError(MSG.task.creator_only_validate, 403, 'ACCESS_DENIED');
    }

    // Task must be completed
    if (task.status !== TaskStatus.COMPLETED) {
      throw new ApiError(MSG.task.invalid_status, 400, 'INVALID_STATUS');
    }

    const isApproved = dto.action === ValidationAction.APPROVE;

    const updatedTask = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        status: isApproved ? TaskStatus.COMPLETED : TaskStatus.TODO,
        progress: isApproved ? 100 : 0,
      },
      include: {
        assignee: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    // Add validation comment
    if (dto.comment) {
      await this.addComment(taskId, { comment: `[VALIDATION] ${dto.comment}` }, userId);
    }

    // Notify assignee about validation result
    if (updatedTask.assignee) {
      this.notificationService
        .notify({
          recipientId: updatedTask.assignee.id,
          type: 'task',
          action: 'validated',
          actorName: 'Votre responsable',
          data: { taskId },
        })
        .catch(() => {});
    }

    return {
      success: true,
      message: isApproved ? MSG.task.approved : MSG.task.rejected,
      data: updatedTask,
    };
  }

  /**
   * Get task history with filters
   */
  async getTaskHistory(
    userId: number,
    startDate?: string,
    endDate?: string,
    status?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;
    const where: any = {
      OR: [{ assigneeId: userId }, { createdById: userId }],
    };

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    if (status) {
      where.status = status;
    }

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          assignee: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
      }),
    ]);

    // Parse comments for each task
    const tasksWithComments = tasks.map((task) => {
      let comments: TaskComment[] = [];
      if (task.subtasks && task.subtasks.length > 0) {
        try {
          comments = JSON.parse(task.subtasks[0] || '[]');
        } catch {
          comments = [];
        }
      }
      const taskData = { ...task };
      delete (taskData as any).subtasks;
      return {
        ...taskData,
        comments,
      };
    });

    // Statistics
    const stats = await this.prisma.task.groupBy({
      by: ['status'],
      where: {
        OR: [{ assigneeId: userId }, { createdById: userId }],
      },
      _count: true,
    });

    return {
      success: true,
      data: tasksWithComments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      statistics: stats,
    };
  }

  /**
   * Delete task (Accountant only)
   */
  async deleteTask(taskId: number, userId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new ApiError(MSG.task.not_found, 404, 'TASK_NOT_FOUND');
    }

    // Only creator can delete
    if (task.createdById !== userId) {
      throw new ApiError(MSG.task.creator_only_delete, 403, 'ACCESS_DENIED');
    }

    await this.prisma.task.delete({
      where: { id: taskId },
    });

    return {
      success: true,
      message: MSG.task.deleted,
    };
  }
  /**
   * Reorder tasks (drag & drop) — updates order field for each task
   */
  async reorderTasks(userId: number, orderedIds: { id: number; order: number }[], status?: string) {
    await Promise.all(
      orderedIds.map(({ id, order }) =>
        this.prisma.task.updateMany({
          where: {
            id,
            ...(status ? { status } : {}),
            OR: [{ assigneeId: userId }, { createdById: userId }],
          },
          data: { order },
        })
      )
    );

    return { success: true, message: MSG.task.reordered };
  }

  /**
   * Get tasks filtered by priority
   */
  async getTasksByPriority(
    userId: number,
    priority: string | string[],
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;
    const priorities = Array.isArray(priority) ? priority : [priority];

    const where: any = {
      OR: [{ assigneeId: userId }, { createdById: userId }],
      priority: { in: priorities },
    };

    const [total, tasks] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
        include: {
          assignee: { select: { id: true, username: true, firstName: true, lastName: true } },
          createdBy: { select: { id: true, username: true } },
        },
      }),
    ]);

    return {
      success: true,
      data: tasks,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get chat-accessible tasks for a collaborator (for messagerie attachments)
   */
  async getChatAccessibleTasksByCollaborator(
    collaboratorId: number,
    accountantId: number,
    page: number = 1,
    limit: number = 5
  ) {
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

    const collaborator = await this.prisma.user.findUnique({
      where: { id: collaboratorId },
      select: { id: true, companyId: true, role: { select: { code: true } } },
    });

    if (!collaborator) {
      throw new ApiError('Collaborator not found', 404, 'COLLABORATOR_NOT_FOUND');
    }

    if (collaborator.companyId !== accountant.companyId) {
      throw new ApiError('Access denied to this collaborator', 403, 'ACCESS_DENIED');
    }

    const where = {
      assigneeId: collaboratorId,
      status: { notIn: ['archived', 'cancelled'] },
    };

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get accountant's clients (from active relationships)
   */
  async getMyClients(userId: number, page: number = 1, limit: number = 20, search?: string) {
    // Get accountant's company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new ApiError('Vous devez être associé à une entreprise', 400, 'NO_COMPANY');
    }

    const skip = (page - 1) * limit;

    // Build where clause for relationships
    const relationshipWhere: any = {
      accountingFirmId: user.companyId,
      status: 'active',
    };

    // Add search filter by company name if provided
    if (search?.trim()) {
      relationshipWhere.clientCompany = {
        name: {
          contains: search.trim(),
          mode: 'insensitive',
        },
      };
    }

    // Get active relationships
    const [totalRelationships, relationships] = await Promise.all([
      this.prisma.clientAccountingFirmRelationship.count({ where: relationshipWhere }),
      this.prisma.clientAccountingFirmRelationship.findMany({
        where: relationshipWhere,
        skip,
        take: limit,
        include: {
          clientCompany: {
            select: {
              id: true,
              name: true,
              logo: true,
              owner: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { relationshipStart: 'desc' },
      }),
    ]);

    // Extract clients (company owners) from relationships
    const clients = relationships
      .filter((r) => r.clientCompany.owner)
      .map((r) => ({
        id: r.clientCompany.owner!.id,
        firstName: r.clientCompany.owner!.firstName,
        lastName: r.clientCompany.owner!.lastName,
        email: r.clientCompany.owner!.email,
        company: {
          id: r.clientCompany.id,
          name: r.clientCompany.name,
          logo: r.clientCompany.logo,
        },
      }));

    return {
      success: true,
      data: clients,
      pagination: {
        total: totalRelationships,
        page,
        limit,
        totalPages: Math.ceil(totalRelationships / limit),
      },
    };
  }
}
