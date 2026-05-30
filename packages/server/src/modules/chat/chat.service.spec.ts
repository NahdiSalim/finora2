import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ForbiddenException } from '@nestjs/common';

describe('ChatService', () => {
  let service: ChatService;

  const creatorId = 2;
  const clientId = 4;
  const collaborateurId = 3;

  const mockPrisma = {
    chatRoom: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    chatMessage: { create: jest.fn() },
  };

  const mockMinio = {
    uploadFromBuffer: jest.fn(),
    getPresignedUrl: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MinioService, useValue: mockMinio },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  // ─── 4.6.2 Test Unitaire « Création d'une conversation de groupe » ───────────
  describe("4.6.2 — Création d'une conversation de groupe (createRoom)", () => {
    const groupDto = {
      name: 'Suivi comptable T1',
      type: 'group' as const,
      description: 'Coordination entre cabinet et client',
      participants: [collaborateurId, clientId],
    };

    const mockRoom = {
      id: 10,
      name: groupDto.name,
      type: 'group',
      description: groupDto.description,
      participants: [String(creatorId), String(collaborateurId), String(clientId)],
      admins: [String(creatorId)],
      createdById: creatorId,
      status: 'active',
      createdBy: {
        id: creatorId,
        username: 'comptable',
        email: 'comptable@finora.com',
        firstName: 'Ahmed',
        lastName: 'Ben Ali',
      },
    };

    it('devrait créer une conversation de groupe avec tous les participants', async () => {
      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);

      const result = await service.createRoom(creatorId, groupDto);

      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Suivi comptable T1',
            type: 'group',
            description: groupDto.description,
            participants: expect.arrayContaining([
              String(creatorId),
              String(collaborateurId),
              String(clientId),
            ]),
            createdById: creatorId,
            admins: [String(creatorId)],
          }),
        })
      );
      expect(result.participants).toHaveLength(3);
      expect(result.participants).toContain(String(clientId));
      expect(result.participants).toContain(String(collaborateurId));
    });

    it('devrait inclure automatiquement le créateur dans la liste des participants', async () => {
      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);

      await service.createRoom(creatorId, {
        ...groupDto,
        participants: [clientId], // créateur absent de la liste
      });

      expect(mockPrisma.chatRoom.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            participants: expect.arrayContaining([String(creatorId), String(clientId)]),
          }),
        })
      );
    });

    it('devrait dédupliquer les participants en double', async () => {
      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);

      await service.createRoom(creatorId, {
        ...groupDto,
        participants: [clientId, clientId, collaborateurId, creatorId],
      });

      const createCall = mockPrisma.chatRoom.create.mock.calls[0][0];
      const participants = createCall.data.participants as string[];
      expect(participants.filter((p) => p === String(clientId))).toHaveLength(1);
    });

    it('devrait définir le créateur comme administrateur de la salle', async () => {
      mockPrisma.chatRoom.create.mockResolvedValue(mockRoom);

      const result = await service.createRoom(creatorId, groupDto);

      expect(result.admins).toContain(String(creatorId));
    });
  });

  describe("sendMessage — contrôle d'accès", () => {
    it("devrait refuser l'envoi si l'utilisateur n'est pas participant", async () => {
      mockPrisma.chatRoom.findUnique.mockResolvedValue({
        id: 1,
        participants: [String(99)],
      });

      await expect(
        service.sendMessage(creatorId, { roomId: 1, content: 'Test', type: 'text' })
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
