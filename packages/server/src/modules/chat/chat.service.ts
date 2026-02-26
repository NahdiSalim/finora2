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
    const message = await this.prisma.chatMessage.create({
      data: {
        roomId: dto.roomId,
        threadId: dto.threadId,
        senderId: userId,
        content: dto.content,
        type: dto.type,
        mentions: dto.mentions ? dto.mentions.map(String) : [],
        documentId: dto.documentId,
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
      },
    });

    // Mettre à jour lastActivity de la salle
    await this.prisma.chatRoom.update({
      where: { id: dto.roomId },
      data: {
        lastActivity: new Date(),
        lastMessageId: message.id,
      },
    });

    return {
      ...message,
      attachments: attachmentUrls,
    };
  }

  async getRoomMessages(roomId: number, userId: number, limit: number = 50, page: number = 1) {
    // Vérifier que l'utilisateur est participant
    await this.getRoomById(roomId, userId);

    const skip = (page - 1) * limit;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        roomId,
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
        createdAt: 'desc',
      },
      take: limit,
      skip,
    });

    const total = await this.prisma.chatMessage.count({
      where: {
        roomId,
        deleted: false,
      },
    });

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

    return { message: 'Message supprimé avec succès' };
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
