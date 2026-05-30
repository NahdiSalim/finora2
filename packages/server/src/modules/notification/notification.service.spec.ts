import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from './notification.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationGateway } from './notification.gateway';
import { MinioService } from '../../common/services/minio.service';

describe('NotificationService', () => {
  let service: NotificationService;

  const mockPrisma = {
    notification: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: { findMany: jest.fn() },
  };

  const mockGateway = {
    sendNotificationToUser: jest.fn(),
    sendNotificationUpdate: jest.fn(),
  };

  const mockMinio = {
    getPresignedUrl: jest.fn(),
  };

  const collaboratorId = 3;
  const accountantId = 2;
  const taskId = 15;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: NotificationGateway, useValue: mockGateway },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  // ─── 4.6.3 Test Unitaire « Réception et gestion des notifications » ──────────
  describe('4.6.3 — Réception et gestion des notifications', () => {
    const mockNotification = {
      id: 100,
      recipientId: collaboratorId,
      type: 'task',
      title: 'Nouvelle tâche assignée',
      message: 'Ahmed Ben Ali vous a assigné une nouvelle tâche',
      data: JSON.stringify({ taskId, actorId: accountantId }),
      actionUrl: `/tasks/${taskId}`,
      priority: 'normal',
      read: false,
      recipient: {
        id: collaboratorId,
        username: 'collaborateur',
        firstName: 'Fatma',
        lastName: 'Trabelsi',
        email: 'collaborateur@finora.com',
      },
    };

    it("devrait créer une notification en base lors d'une assignation de tâche", async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notify({
        recipientId: collaboratorId,
        type: 'task',
        action: 'assigned',
        actorName: 'Ahmed Ben Ali',
        actorId: accountantId,
        data: { taskId },
      });

      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: collaboratorId,
            type: 'task',
            title: 'Nouvelle tâche assignée',
            message: expect.stringContaining('Ahmed Ben Ali'),
            actionUrl: `/tasks/${taskId}`,
          }),
        })
      );
    });

    it("devrait émettre l'événement WebSocket au collaborateur concerné", async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notify({
        recipientId: collaboratorId,
        type: 'task',
        action: 'assigned',
        actorName: 'Ahmed Ben Ali',
        actorId: accountantId,
        data: { taskId },
      });

      expect(mockGateway.sendNotificationToUser).toHaveBeenCalledWith(
        collaboratorId,
        expect.objectContaining({
          type: 'task',
          title: 'Nouvelle tâche assignée',
        })
      );
    });

    it('devrait inclure actorId dans les données JSON de la notification', async () => {
      mockPrisma.notification.create.mockResolvedValue(mockNotification);

      await service.notify({
        recipientId: collaboratorId,
        type: 'task',
        action: 'assigned',
        actorName: 'Ahmed Ben Ali',
        actorId: accountantId,
        data: { taskId },
      });

      const createCall = mockPrisma.notification.create.mock.calls[0][0];
      const parsedData = JSON.parse(createCall.data.data);
      expect(parsedData.taskId).toBe(taskId);
      expect(parsedData.actorId).toBe(accountantId);
    });

    it('devrait émettre une mise à jour WebSocket lors du marquage comme lu', async () => {
      mockPrisma.notification.findFirst.mockResolvedValue({
        id: 100,
        recipientId: collaboratorId,
        read: false,
      });
      mockPrisma.notification.update.mockResolvedValue({
        ...mockNotification,
        read: true,
      });

      await service.markAsRead(100, collaboratorId);

      expect(mockPrisma.notification.update).toHaveBeenCalledWith({
        where: { id: 100 },
        data: { read: true },
      });
      expect(mockGateway.sendNotificationUpdate).toHaveBeenCalledWith(collaboratorId, {
        notificationId: 100,
        read: true,
      });
    });

    it("devrait rejeter un type d'événement sans template", async () => {
      await expect(
        service.notify({
          recipientId: collaboratorId,
          type: 'unknown',
          action: 'event',
          data: {},
        })
      ).rejects.toThrow('Template de notification non trouvé: unknown.event');
    });
  });
});
