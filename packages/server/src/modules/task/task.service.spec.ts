import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from './task.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { NotificationService } from '../notification/notification.service';
import { MSG } from '../../common/messages';
import { TaskStatus } from './dto/update-task.dto';

describe('TaskService', () => {
  let service: TaskService;

  const mockPrisma = {
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    taskClient: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };

  const mockMinio = {
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
  };

  const mockNotification = {
    notify: jest.fn().mockResolvedValue(undefined),
  };

  const collaboratorId = 3;
  const accountantId = 2;
  const taskId = 10;

  const baseTask = {
    id: taskId,
    title: 'Révision des écritures comptables mars',
    description: 'Contrôler les écritures du mois de mars.',
    type: 'accounting',
    priority: 'medium',
    status: TaskStatus.TODO,
    progress: 0,
    assigneeId: collaboratorId,
    createdById: accountantId,
    companyId: 1,
    attachments: [],
    subtasks: [],
    taskClients: [],
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
  });

  // ─── 3.6.3 Test Unitaire « Mettre à jour le statut d'une tâche » ─────────────
  describe("3.6.3 — Mettre à jour le statut d'une tâche (updateTask)", () => {
    it('devrait passer le statut de « À faire » à « En cours »', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(baseTask);
      mockPrisma.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
        progress: 10,
        assignee: { id: collaboratorId, username: 'collab', email: 'c@finora.com' },
        createdBy: { id: accountantId, username: 'comptable', email: 'a@finora.com' },
      });

      const result = await service.updateTask(
        taskId,
        { status: TaskStatus.IN_PROGRESS, progress: 10 },
        collaboratorId
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe(MSG.task.updated);
      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: taskId },
          data: expect.objectContaining({
            status: TaskStatus.IN_PROGRESS,
            progress: 10,
          }),
        })
      );
      expect(result.data.status).toBe(TaskStatus.IN_PROGRESS);
    });

    it('devrait persister le changement de statut en base de données', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
      });
      mockPrisma.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.COMPLETED,
        progress: 100,
        completedAt: new Date('2026-03-20'),
        assignee: { id: collaboratorId, username: 'collab', email: 'c@finora.com' },
        createdBy: { id: accountantId, username: 'comptable', email: 'a@finora.com' },
      });

      const result = await service.completeTask(taskId, collaboratorId);

      expect(mockPrisma.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: TaskStatus.COMPLETED,
            progress: 100,
          }),
        })
      );
      expect(result.data.status).toBe(TaskStatus.COMPLETED);
    });

    it('devrait notifier le comptable lors de la mise à jour par le collaborateur', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(baseTask);
      mockPrisma.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
        assignee: { id: collaboratorId, username: 'collab', email: 'c@finora.com' },
        createdBy: { id: accountantId, username: 'comptable', email: 'a@finora.com' },
      });

      await service.startTask(taskId, collaboratorId);

      expect(mockNotification.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: accountantId,
          type: 'task',
          action: 'updated',
          data: { taskId },
        })
      );
    });

    it('devrait notifier le comptable avec action « completed » quand la tâche est terminée', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.IN_PROGRESS,
      });
      mockPrisma.task.update.mockResolvedValue({
        ...baseTask,
        status: TaskStatus.COMPLETED,
        progress: 100,
        assignee: { id: collaboratorId, username: 'collab', email: 'c@finora.com' },
        createdBy: { id: accountantId, username: 'comptable', email: 'a@finora.com' },
      });

      await service.completeTask(taskId, collaboratorId);

      expect(mockNotification.notify).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: accountantId,
          type: 'task',
          action: 'completed',
        })
      );
    });

    it("devrait refuser l'accès si l'utilisateur n'est ni assigné ni créateur", async () => {
      mockPrisma.task.findUnique.mockResolvedValue(baseTask);

      await expect(
        service.updateTask(taskId, { status: TaskStatus.IN_PROGRESS }, 999)
      ).rejects.toMatchObject({
        message: MSG.task.access_denied,
        statusCode: 403,
      });

      expect(mockPrisma.task.update).not.toHaveBeenCalled();
    });

    it('devrait rejeter la mise à jour si la tâche est introuvable', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(null);

      await expect(
        service.updateTask(999, { status: TaskStatus.IN_PROGRESS }, collaboratorId)
      ).rejects.toMatchObject({
        message: MSG.task.not_found,
        statusCode: 404,
      });
    });

    it('devrait empêcher le collaborateur de passer une tâche en « En révision »', async () => {
      mockPrisma.task.findUnique.mockResolvedValue(baseTask);

      await expect(
        service.updateTask(
          taskId,
          { status: TaskStatus.IN_REVIEW },
          collaboratorId,
          undefined,
          'COLLABORATOR'
        )
      ).rejects.toMatchObject({
        statusCode: 403,
        errorCode: 'FORBIDDEN_STATUS',
      });
    });
  });
});
