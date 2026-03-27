import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService
  ) {}

  // ==================== ROOMS ====================

  async createRoom(userId: number, dto: CreateRoomDto) {
    // Vérifier que l'utilisateur est dans les participants
    if (!dto.participants.includes(userId)) {
      dto.participants.push(userId);
    }

    const room = await this.prisma.chatRoom.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        participants: dto.participants.map(String),
        createdById: userId,
        contextId: dto.contextId,
        contextType: dto.contextType,
        admins: [String(userId)],
      },
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
      },
    });

    return room;
  }

  async getRoomById(roomId: number, userId: number) {
    const room = await this.prisma.chatRoom.findUnique({
      where: { id: roomId },
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
      },
    });

    if (!room) {
      throw new NotFoundException('Salle de chat introuvable');
    }

    // Vérifier que l'utilisateur est participant
    if (!room.participants.includes(String(userId))) {
      throw new ForbiddenException("Vous n'êtes pas participant de cette salle");
    }

    return room;
  }

  async getUserRoomsDebug(userId: number, category?: string, search?: string, date?: string) {
    // Apply the filter
    const matchedRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { has: String(userId) },
        status: 'active',
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
      },
      orderBy: { lastActivity: 'desc' },
    });

    // Enrich with participant profiles
    const allParticipantIds = [
      ...new Set(
        matchedRooms.flatMap((r) => r.participants.map(Number).filter((id) => id !== userId))
      ),
    ];

    const profiles = allParticipantIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: allParticipantIds } },
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
            company: { select: { id: true, name: true } },
            role: { select: { nameFr: true, code: true } },
          },
        })
      : [];

    const profileMap = new Map(profiles.map((p) => [p.id, p]));

    const lastMessageIds = matchedRooms
      .map((r) => r.lastMessageId)
      .filter((id): id is number => typeof id === 'number' && id > 0);

    const lastMessages = lastMessageIds.length
      ? await this.prisma.chatMessage.findMany({
          where: { id: { in: lastMessageIds } },
          select: {
            id: true,
            roomId: true,
            content: true,
            type: true,
            senderId: true,
            createdAt: true,
          },
        })
      : [];

    const lastMessageMap = new Map(lastMessages.map((m) => [m.roomId, m]));

    const enriched = matchedRooms.map((room) => ({
      ...room,
      participantProfiles: room.participants
        .map(Number)
        .filter((id) => id !== userId)
        .map((id) => profileMap.get(id) ?? null)
        .filter(Boolean),
      lastMessage: lastMessageMap.get(room.id) ?? null,
    }));

    // Map a requested category string to the set of role codes it covers.
    // Handles spelling variants (COLLABORATOR vs COLLABORATEUR, COMPTABLE vs ACCOUNTANT)
    // and case differences coming from different DB seeds or backends.
    function categoryMatchesRoleCode(cat: string, roleCode: string): boolean {
      const c = cat.toLowerCase();
      const r = roleCode.toLowerCase();
      if (c === 'client') return r === 'client' || r.startsWith('client_');
      if (c === 'collaborateur') return r === 'collaborateur' || r === 'collaborator';
      if (c === 'comptable') return r === 'comptable' || r === 'accountant';
      // Fallback: exact match
      return r === c;
    }

    // Apply category filter: keep only rooms where at least one other participant
    // has a role.code that belongs to the requested category group.
    // Runs after profile enrichment because role data lives on users, not rooms.
    let filtered = category
      ? enriched.filter((room) =>
          room.participantProfiles.some(
            (p: any) => p?.role?.code && categoryMatchesRoleCode(category, p.role.code)
          )
        )
      : enriched;

    // Apply search filter: keep only rooms where at least one other participant
    // has a name, username or email that contains the search term.
    if (search) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter((room) =>
        room.participantProfiles.some((p: any) => {
          const fullName = [p?.firstName, p?.lastName].filter(Boolean).join(' ').toLowerCase();
          const username = (p?.username ?? '').toLowerCase();
          const email = (p?.email ?? '').toLowerCase();
          return fullName.includes(term) || username.includes(term) || email.includes(term);
        })
      );
    }

    // Apply date filter: keep only rooms whose lastActivity falls on the given date (UTC).
    // date is expected as YYYY-MM-DD.
    if (date) {
      filtered = filtered.filter((room) => {
        if (!room.lastActivity) return false;
        return new Date(room.lastActivity).toISOString().slice(0, 10) === date;
      });
    }

    // Return paginated shape expected by frontend
    return {
      data: filtered,
      total: filtered.length,
      page: 1,
      pageSize: 50,
      totalPages: Math.ceil(filtered.length / 50),
    };
  }

  async getUserRooms(userId: number) {
    const rooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: {
          has: String(userId),
        },
        status: 'active',
      },
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
      },
      orderBy: {
        lastActivity: 'desc',
      },
    });

    return rooms;
  }

  async addParticipant(roomId: number, userId: number, participantId: number) {
    const room = await this.getRoomById(roomId, userId);

    // Vérifier que l'utilisateur est admin
    if (!room.admins.includes(String(userId))) {
      throw new ForbiddenException('Seuls les admins peuvent ajouter des participants');
    }

    // Ajouter le participant
    if (!room.participants.includes(String(participantId))) {
      await this.prisma.chatRoom.update({
        where: { id: roomId },
        data: {
          participants: {
            push: String(participantId),
          },
        },
      });
    }

    return { message: 'Participant ajouté avec succès' };
  }

  async removeParticipant(roomId: number, userId: number, participantId: number) {
    const room = await this.getRoomById(roomId, userId);

    // Vérifier que l'utilisateur est admin
    if (!room.admins.includes(String(userId))) {
      throw new ForbiddenException('Seuls les admins peuvent retirer des participants');
    }

    // Retirer le participant
    const updatedParticipants = room.participants.filter((p) => p !== String(participantId));

    await this.prisma.chatRoom.update({
      where: { id: roomId },
      data: {
        participants: updatedParticipants,
      },
    });

    return { message: 'Participant retiré avec succès' };
  }

  // ==================== MESSAGES ====================

  async sendMessage(userId: number, dto: SendMessageDto, files?: Express.Multer.File[]) {
    // Vérifier que l'utilisateur est participant de la salle
    const room = await this.getRoomById(dto.roomId, userId);

    const attachmentUrls: string[] = [];

    // Upload des fichiers si présents
    if (files && files.length > 0) {
      console.log('[ChatService] sendMessage file upload:', {
        roomId: dto.roomId,
        dtoType: dto.type,
        filesCount: files.length,
        firstFile: {
          originalname: files[0].originalname,
          mimetype: files[0].mimetype,
          size: files[0].size,
        },
      });
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { companyId: true },
      });

      if (!user?.companyId) {
        throw new Error('User company not found');
      }

      for (const file of files) {
        const fileName = `${Date.now()}-${file.originalname}`;
        const filePath = `chat/${dto.roomId}`;

        const objectName = await this.minioService.uploadFromBuffer(
          user.companyId,
          filePath,
          fileName,
          file.buffer,
          file.mimetype
        );

        attachmentUrls.push(objectName);
      }
    }

    // Créer le message
    // For file messages: store objectName in content field (no attachments[] column in schema)
    const messageContent = attachmentUrls.length > 0 ? attachmentUrls[0] : dto.content;
    console.log('[ChatService] messageContent computed:', {
      hasAttachments: attachmentUrls.length > 0,
      messageContent: attachmentUrls.length > 0 ? messageContent : '(dto.content)',
      dtoContent: dto.content,
      dtoType: dto.type,
    });

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: dto.roomId,
        threadId: dto.threadId,
        senderId: userId,
        content: messageContent,
        type: dto.type,
        mentions: dto.mentions ? dto.mentions.map(String) : [],
        documentId: dto.documentId,
        requestId: dto.requestId,
        taskId: dto.taskId,
        appointmentId: dto.appointmentId,
        readBy: [String(userId)],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        request: {
          select: {
            id: true,
            subject: true,
            type: true,
            status: true,
            urgency: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
            date: true,
            hour: true,
            status: true,
            type: true,
          },
        },
      },
    });
    console.log('[ChatService] chatMessage created:', {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      type: message.type,
      contentPrefix:
        typeof message.content === 'string' ? message.content.slice(0, 30) : message.content,
    });

    // Mettre à jour lastActivity de la salle
    await this.prisma.chatRoom.update({
      where: { id: dto.roomId },
      data: {
        lastActivity: new Date(),
        lastMessageId: message.id,
      },
    });

    let fileUrl: string | null = null;
    if ((dto.type === 'file' || dto.type === 'image') && messageContent) {
      try {
        fileUrl = await this.minioService.getPresignedUrl(messageContent, 7 * 24 * 60 * 60);
      } catch {
        fileUrl = null;
      }
    }

    return {
      ...message,
      attachments: attachmentUrls,
      fileUrl,
    };
  }

  async getRoomMessages(roomId: number, userId: number, limit: number = 50, page: number = 1) {
    await this.getRoomById(roomId, userId);
    const skip = (page - 1) * limit;

    const rawMessages = await this.prisma.chatMessage.findMany({
      where: { roomId, deleted: false },
      include: {
        sender: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
        request: {
          select: {
            id: true,
            subject: true,
            type: true,
            status: true,
            urgency: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        appointment: {
          select: {
            id: true,
            title: true,
            date: true,
            hour: true,
            status: true,
            type: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit,
      skip,
    });

    const total = await this.prisma.chatMessage.count({ where: { roomId, deleted: false } });

    // Generate presigned URLs for file messages (content = MinIO objectName)
    const messages = await Promise.all(
      rawMessages.map(async (msg) => {
        if ((msg.type === 'file' || msg.type === 'image') && msg.content) {
          try {
            const fileUrl = await this.minioService.getPresignedUrl(msg.content, 7 * 24 * 60 * 60);
            return { ...msg, fileUrl };
          } catch {
            return { ...msg, fileUrl: null };
          }
        }
        return { ...msg, fileUrl: null };
      })
    );

    return {
      messages: messages.reverse(),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async markAsRead(messageId: number, userId: number) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    // Ajouter l'utilisateur à readBy s'il n'y est pas déjà
    if (!message.readBy.includes(String(userId))) {
      await this.prisma.chatMessage.update({
        where: { id: messageId },
        data: {
          readBy: {
            push: String(userId),
          },
        },
      });
    }

    return { message: 'Message marqué comme lu' };
  }

  async editMessage(messageId: number, userId: number, content: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez modifier que vos propres messages');
    }

    const updatedMessage = await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content,
        edited: true,
        editedAt: new Date(),
      },
      include: {
        sender: {
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

    return updatedMessage;
  }

  async deleteMessage(messageId: number, userId: number) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message introuvable');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('Vous ne pouvez supprimer que vos propres messages');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        deleted: true,
        deletedAt: new Date(),
      },
    });

    return {
      message: 'Message supprimé avec succès',
      messageId,
      roomId: message.roomId,
    };
  }

  // ==================== SHARED DOCUMENTS ====================

  async getSharedDocuments(roomId: number, userId: number, page = 1, pageSize = 20) {
    await this.getRoomById(roomId, userId);
    const skip = (page - 1) * pageSize;

    const [messages, total] = await Promise.all([
      this.prisma.chatMessage.findMany({
        where: { roomId, deleted: false, type: { in: ['file', 'image'] } },
        select: {
          id: true,
          roomId: true,
          senderId: true,
          content: true,
          type: true,
          createdAt: true,
          documentId: true,
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: pageSize,
        skip,
      }),
      this.prisma.chatMessage.count({
        where: { roomId, deleted: false, type: { in: ['file', 'image'] } },
      }),
    ]);

    // Generate presigned URLs — strategy differs by type:
    // - Images: always generate URL; frontend handles broken URLs via onError fallback
    // - Non-images (PDF, doc, etc.): check existence first to avoid displaying raw storage
    //   error content (e.g. NoSuchKey XML) inside preview iframes/cards
    const data = await Promise.all(
      messages.map(async (msg) => {
        let fileUrl: string | null = null;
        if (msg.content) {
          try {
            if (msg.type === 'image') {
              fileUrl = await this.minioService.getPresignedUrl(msg.content, 7 * 24 * 60 * 60);
            } else {
              const exists = await this.minioService.fileExists(msg.content);
              if (exists) {
                fileUrl = await this.minioService.getPresignedUrl(msg.content, 7 * 24 * 60 * 60);
              }
            }
          } catch {
            fileUrl = null;
          }
        }
        return { ...msg, fileUrl };
      })
    );

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  // ==================== SEARCH ====================

  async searchMessages(userId: number, dto: SearchMessagesDto) {
    const where: any = {
      deleted: false,
    };

    // Filtrer par salle si spécifié
    if (dto.roomId) {
      // Vérifier que l'utilisateur est participant
      await this.getRoomById(dto.roomId, userId);
      where.roomId = dto.roomId;
    } else {
      // Sinon, chercher uniquement dans les salles où l'utilisateur est participant
      const userRooms = await this.getUserRooms(userId);
      where.roomId = {
        in: userRooms.map((r) => r.id),
      };
    }

    // Filtrer par texte
    if (dto.query) {
      where.content = {
        contains: dto.query,
        mode: 'insensitive',
      };
    }

    // Filtrer par expéditeur
    if (dto.senderId) {
      where.senderId = dto.senderId;
    }

    // Filtrer par date
    if (dto.startDate || dto.endDate) {
      where.createdAt = {};
      if (dto.startDate) {
        where.createdAt.gte = new Date(dto.startDate);
      }
      if (dto.endDate) {
        where.createdAt.lte = new Date(dto.endDate);
      }
    }

    const limit = dto.limit || 20;
    const page = dto.page || 1;
    const skip = (page - 1) * limit;

    const messages = await this.prisma.chatMessage.findMany({
      where,
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip,
    });

    const total = await this.prisma.chatMessage.count({ where });

    return {
      messages,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // ==================== THREADS ====================

  async createThread(userId: number, title: string, contextType?: string, contextId?: number) {
    const thread = await this.prisma.chatThread.create({
      data: {
        title,
        contextType,
        contextId,
        createdById: userId,
        participants: [String(userId)],
      },
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
      },
    });

    return thread;
  }

  async getThreadMessages(threadId: number, userId: number) {
    const thread = await this.prisma.chatThread.findUnique({
      where: { id: threadId },
    });

    if (!thread) {
      throw new NotFoundException('Thread introuvable');
    }

    // Vérifier que l'utilisateur est participant
    if (!thread.participants.includes(String(userId))) {
      throw new ForbiddenException("Vous n'êtes pas participant de ce thread");
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        threadId,
        deleted: false,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages;
  }
}
