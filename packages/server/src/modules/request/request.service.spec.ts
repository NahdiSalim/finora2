import { Test, TestingModule } from '@nestjs/testing';
import { RequestService } from './request.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { NotificationService } from '../notification/notification.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateRequestDto, RequestType, RequestUrgency } from './dto/create-request.dto';
import { ConvertToTaskDto, TaskPriority } from './dto/convert-to-task.dto';

describe('RequestService', () => {
  let service: RequestService;

  const mockPrisma = {
    user: { findUnique: jest.fn(), findMany: jest.fn() },
    request: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    clientAccountingFirmRelationship: { findFirst: jest.fn() },
    document: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    task: { create: jest.fn() },
    taskClient: { create: jest.fn() },
  };

  const mockMinio = {
    uploadFile: jest.fn(),
    getPresignedUrl: jest.fn(),
    getFileBuffer: jest.fn(),
    uploadBuffer: jest.fn(),
    getFileMetadata: jest.fn(),
  };

  const mockNotification = {
    notify: jest.fn().mockResolvedValue(undefined),
  };

  const clientId = 10;
  const accountantId = 2;
  const collaboratorId = 3;
  const companyId = 5;
  const accountingFirmId = 1;

  const validDto: CreateRequestDto = {
    subject: 'Déclaration TVA trimestrielle',
    description: "Besoin d'assistance pour la déclaration TVA du T1 2026.",
    type: RequestType.TAX,
    urgency: RequestUrgency.HIGH,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
        { provide: NotificationService, useValue: mockNotification },
      ],
    }).compile();

    service = module.get<RequestService>(RequestService);
  });

  // ─── 3.6.1 Test Unitaire « Soumettre une demande » ─────────────────────────
  describe('3.6.1 — Soumettre une demande (createRequest)', () => {
    it('devrait créer une demande avec objet et description valides', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ companyId });
      mockPrisma.clientAccountingFirmRelationship.findFirst.mockResolvedValue({
        accountingFirmId,
      });
      mockPrisma.request.create.mockResolvedValue({
        id: 1,
        subject: validDto.subject,
        description: validDto.description,
        type: validDto.type,
        urgency: validDto.urgency,
        attachments: [],
        clientId,
        companyId,
      });
      mockPrisma.request.update.mockResolvedValue({
        id: 1,
        subject: validDto.subject,
        description: validDto.description,
        attachments: [],
        client: {
          id: clientId,
          username: 'client',
          email: 'client@test.com',
          firstName: 'Mohamed',
          lastName: 'Gharbi',
        },
        company: { id: companyId, name: 'Entreprise Client' },
      });
      mockPrisma.user.findMany.mockResolvedValue([
        { id: accountantId, firstName: 'Ahmed', lastName: 'Ben Ali' },
      ]);

      const result = await service.createRequest(validDto, clientId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(MSG.request.created);
      expect(mockPrisma.request.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: validDto.subject,
            description: validDto.description,
            type: RequestType.TAX,
            clientId,
          }),
        })
      );
    });

    it('devrait rejeter une demande sans objet (champ obligatoire)', async () => {
      const dto = { ...validDto, subject: '   ' };

      await expect(service.createRequest(dto, clientId)).rejects.toMatchObject({
        message: MSG.request.subject_required,
        statusCode: 400,
        errorCode: 'SUBJECT_REQUIRED',
      });

      expect(mockPrisma.request.create).not.toHaveBeenCalled();
    });

    it("devrait rejeter une demande si le client n'appartient à aucune entreprise", async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ companyId: null });

      await expect(service.createRequest(validDto, clientId)).rejects.toMatchObject({
        message: MSG.request.no_company,
        statusCode: 400,
        errorCode: 'NO_COMPANY',
      });
    });

    it('devrait accepter une demande sans pièces jointes', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ companyId });
      mockPrisma.clientAccountingFirmRelationship.findFirst.mockResolvedValue({
        accountingFirmId,
      });
      mockPrisma.request.create.mockResolvedValue({
        id: 2,
        subject: validDto.subject,
        attachments: [],
        clientId,
        companyId,
      });
      mockPrisma.request.update.mockResolvedValue({
        id: 2,
        subject: validDto.subject,
        attachments: [],
        client: {
          id: clientId,
          username: 'client',
          email: 'c@test.com',
          firstName: 'A',
          lastName: 'B',
        },
        company: { id: companyId, name: 'Test' },
      });
      mockPrisma.user.findMany.mockResolvedValue([]);

      const result = await service.createRequest(validDto, clientId, undefined);

      expect(result.success).toBe(true);
      expect(mockMinio.uploadFile).not.toHaveBeenCalled();
      expect(mockPrisma.document.create).not.toHaveBeenCalled();
    });

    it("devrait échouer si l'objet est vide (chaîne vide)", async () => {
      await expect(
        service.createRequest({ ...validDto, subject: '' }, clientId)
      ).rejects.toBeInstanceOf(ApiError);
    });
  });

  // ─── 3.6.2 Test Unitaire « Convertir une demande en tâche » ─────────────────
  describe('3.6.2 — Convertir une demande en tâche (convertToTask)', () => {
    const requestId = 5;
    const convertDto: ConvertToTaskDto = {
      assigneeId: collaboratorId,
      priority: TaskPriority.HIGH,
      dueDate: '2026-04-30T00:00:00.000Z',
    };

    const mockRequest = {
      id: requestId,
      subject: 'Rapprochement bancaire Q1',
      description: 'Vérifier les écarts entre relevés et comptabilité.',
      type: 'accounting',
      urgency: 'high',
      status: 'pending',
      attachments: ['requests/demande-5/releve.pdf'],
      clientId,
      companyId,
      convertedToTaskId: null,
      client: { id: clientId },
    };

    const mockTask = {
      id: 42,
      title: mockRequest.subject,
      description: mockRequest.description,
      type: mockRequest.type,
      priority: 'high',
      status: 'todo',
      assigneeId: collaboratorId,
      createdById: accountantId,
      requestId: requestId,
      assignee: {
        id: collaboratorId,
        username: 'collaborateur',
        email: 'collaborateur@finora.com',
        firstName: 'Fatma',
        lastName: 'Trabelsi',
      },
    };

    it('devrait créer une tâche avec les informations de la demande', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.task.create.mockResolvedValue(mockTask);
      mockPrisma.taskClient.create.mockResolvedValue({});
      mockPrisma.request.update.mockResolvedValue({});

      const result = await service.convertToTask(requestId, convertDto, accountantId);

      expect(result.success).toBe(true);
      expect(result.message).toBe(MSG.request.converted);
      expect(mockPrisma.task.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: mockRequest.subject,
            description: mockRequest.description,
            assigneeId: collaboratorId,
            createdById: accountantId,
            requestId,
            priority: TaskPriority.HIGH,
          }),
        })
      );
      expect(result.data.task.assigneeId).toBe(collaboratorId);
    });

    it('devrait lier la demande à la tâche et mettre le statut en cours', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.task.create.mockResolvedValue(mockTask);
      mockPrisma.taskClient.create.mockResolvedValue({});
      mockPrisma.request.update.mockResolvedValue({});

      await service.convertToTask(requestId, convertDto, accountantId);

      expect(mockPrisma.request.update).toHaveBeenCalledWith({
        where: { id: requestId },
        data: expect.objectContaining({
          convertedToTaskId: mockTask.id,
          status: 'in_progress',
          assignedToId: accountantId,
        }),
      });
    });

    it("devrait créer une entrée TaskClient pour le client d'origine", async () => {
      mockPrisma.request.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.task.create.mockResolvedValue(mockTask);
      mockPrisma.taskClient.create.mockResolvedValue({});
      mockPrisma.request.update.mockResolvedValue({});

      await service.convertToTask(requestId, convertDto, accountantId);

      expect(mockPrisma.taskClient.create).toHaveBeenCalledWith({
        data: { taskId: mockTask.id, clientId },
      });
    });

    it('devrait rejeter la conversion si la demande est déjà convertie', async () => {
      mockPrisma.request.findUnique.mockResolvedValue({
        ...mockRequest,
        convertedToTaskId: 99,
      });

      await expect(
        service.convertToTask(requestId, convertDto, accountantId)
      ).rejects.toMatchObject({
        message: MSG.request.already_converted,
        statusCode: 400,
        errorCode: 'ALREADY_CONVERTED',
      });

      expect(mockPrisma.task.create).not.toHaveBeenCalled();
    });

    it('devrait rejeter la conversion si la demande est introuvable', async () => {
      mockPrisma.request.findUnique.mockResolvedValue(null);

      await expect(service.convertToTask(999, convertDto, accountantId)).rejects.toMatchObject({
        message: MSG.request.not_found,
        statusCode: 404,
      });
    });
  });
});
