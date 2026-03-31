import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateRoomDto } from './dto/create-room.dto';
import { SearchMessagesDto } from './dto/search-messages.dto';

/** Convert Prisma appointment (date + hour) to the startTime/endTime shape the client expects. */
function normalizeAppointment(
  apt:
    | { id: number; title: string; date: Date; hour: string; status: string; type: string }
    | null
    | undefined
) {
  if (!apt) return null;
  const dateStr = (apt.date instanceof Date ? apt.date : new Date(apt.date))
    .toISOString()
    .slice(0, 10);
  const parts = (apt.hour ?? '00:00').split(':').map(Number);
  const h = parts[0] ?? 0;
  const m = parts[1] ?? 0;
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    id: apt.id,
    title: apt.title,
    startTime: `${dateStr}T${pad(h)}:${pad(m)}:00.000Z`,
    endTime: `${dateStr}T${pad((h + 1) % 24)}:${pad(m)}:00.000Z`,
    status: apt.status,
    type: apt.type,
  };
}

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService
  ) {}

  // ==================== ROOMS ====================

  /**
   * Find or create a direct (1-on-1) chat room between two users.
   * Returns existing room if found, otherwise creates a new one.
   */
  async findOrCreateDirectRoom(userId: number, targetUserId: number) {
    // Check if a direct room already exists between these two users
    const existingRoom = await this.prisma.chatRoom.findFirst({
      where: {
        type: 'direct',
        status: 'active',
        AND: [
          { participants: { has: String(userId) } },
          { participants: { has: String(targetUserId) } },
        ],
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (existingRoom) {
      // Enrich with participant profiles
      const participantIds = existingRoom.participants.map(Number).filter((id) => id !== userId);
      const profiles = await this.prisma.user.findMany({
        where: { id: { in: participantIds } },
        select: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
          email: true,
          company: { select: { id: true, name: true } },
          role: { select: { nameFr: true, code: true } },
        },
      });

      return {
        ...existingRoom,
        participantProfiles: profiles,
        lastMessage: null,
        unreadCount: 0,
      };
    }

    // Create new direct room
    const newRoom = await this.prisma.chatRoom.create({
      data: {
        type: 'direct',
        participants: [String(userId), String(targetUserId)],
        createdById: userId,
        status: 'active',
      },
      include: {
        createdBy: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    // Enrich with participant profiles
    const profiles = await this.prisma.user.findMany({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        firstName: true,
        lastName: true,
        email: true,
        company: { select: { id: true, name: true } },
        role: { select: { nameFr: true, code: true } },
      },
    });

    return {
      ...newRoom,
      participantProfiles: profiles,
      lastMessage: null,
      unreadCount: 0,
    };
  }

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
    // Get user info to determine what potential contacts they have
    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        role: { select: { code: true } },
      },
    });

    // Get existing chat rooms
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

    // Get all potential contacts based on role
    const potentialContactIds: number[] = [];

    // If comptable/accountant, get all clients from active relationships
    if (currentUser?.role?.code === 'ACCOUNTANT' && currentUser.companyId) {
      const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
        where: {
          accountingFirmId: currentUser.companyId,
          status: 'active',
        },
        include: {
          clientCompany: {
            select: {
              employees: {
                select: { id: true },
                where: {
                  role: { code: 'CLIENT' },
                },
              },
            },
          },
        },
      });

      const clientIds = relationships.flatMap((rel) =>
        rel.clientCompany.employees.map((emp) => emp.id)
      );
      potentialContactIds.push(...clientIds);

      // Also get collaborators from same company
      const collaborators = await this.prisma.user.findMany({
        where: {
          companyId: currentUser.companyId,
          id: { not: userId },
          role: { code: { in: ['COLLABORATOR', 'COLLABORATEUR'] } },
        },
        select: { id: true },
      });
      potentialContactIds.push(...collaborators.map((c) => c.id));
    }
    // If client, get their accountant and collaborators
    else if (currentUser?.role?.code === 'CLIENT' && currentUser.companyId) {
      const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
        where: {
          clientCompanyId: currentUser.companyId,
          status: 'active',
        },
        include: {
          accountingFirm: {
            select: {
              employees: {
                select: { id: true },
                where: {
                  role: { code: 'ACCOUNTANT' },
                },
              },
            },
          },
        },
      });

      const accountantIds = relationships.flatMap((rel) =>
        rel.accountingFirm.employees.map((emp) => emp.id)
      );
      potentialContactIds.push(...accountantIds);
    }
    // If collaborator, get accountants from same company
    else if (currentUser?.companyId) {
      const colleagues = await this.prisma.user.findMany({
        where: {
          companyId: currentUser.companyId,
          id: { not: userId },
          role: { code: 'ACCOUNTANT' },
        },
        select: { id: true },
      });
      potentialContactIds.push(...colleagues.map((c) => c.id));
    }

    // Combine room participants + potential contacts
    const allUserIds = [...new Set([...allParticipantIds, ...potentialContactIds])];

    const profiles = allUserIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: allUserIds } },
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

    // Count unread messages per room: sent by someone else AND not yet in readBy for this user
    const unreadCounts = matchedRooms.length
      ? await this.prisma.chatMessage.groupBy({
          by: ['roomId'],
          where: {
            roomId: { in: matchedRooms.map((r) => r.id) },
            deleted: false,
            senderId: { not: userId },
            NOT: { readBy: { has: String(userId) } },
          },
          _count: { id: true },
        })
      : [];

    const unreadMap = new Map(unreadCounts.map((u) => [u.roomId, u._count.id]));

    const enriched = matchedRooms.map((room) => ({
      ...room,
      participantProfiles: room.participants
        .map(Number)
        .filter((id) => id !== userId)
        .map((id) => profileMap.get(id) ?? null)
        .filter(Boolean),
      lastMessage: lastMessageMap.get(room.id) ?? null,
      unreadCount: unreadMap.get(room.id) ?? 0,
    }));

    // Create virtual rooms for contacts who don't have an existing room yet
    const existingParticipantIds = new Set(allParticipantIds);
    const contactsWithoutRooms = potentialContactIds.filter(
      (id) => !existingParticipantIds.has(id)
    );

    const virtualRooms = contactsWithoutRooms.map((contactId) => {
      const profile = profileMap.get(contactId);
      return {
        id: -contactId, // Negative ID to indicate virtual room
        name: null,
        type: 'direct',
        description: null,
        participants: [String(userId), String(contactId)],
        createdById: userId,
        lastMessageId: null,
        lastActivity: new Date(0), // Epoch to sort at bottom
        contextId: null,
        contextType: null,
        pinnedMessages: [],
        admins: [],
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: null,
        participantProfiles: profile ? [profile] : [],
        lastMessage: null,
        unreadCount: 0,
        messages: [],
      };
    });

    // Combine existing rooms + virtual rooms
    const allRooms = [...enriched, ...virtualRooms];

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
      ? allRooms.filter((room) =>
          room.participantProfiles.some(
            (p: any) => p?.role?.code && categoryMatchesRoleCode(category, p.role.code)
          )
        )
      : allRooms;

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

      // Validate file sizes (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      for (const file of files) {
        if (file.size > MAX_FILE_SIZE) {
          throw new BadRequestException(
            `Le fichier "${file.originalname}" est trop volumineux. Taille maximale: 10 MB.`
          );
        }
      }

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
        requestId: dto.requestId ?? null,
        taskId: dto.taskId ?? null,
        appointmentId: dto.appointmentId ?? null,
        readBy: [String(userId)],
      },
      include: {
        sender: {
          select: { id: true, username: true, email: true, firstName: true, lastName: true },
        },
        request: { select: { id: true, subject: true, type: true, status: true, urgency: true } },
        task: { select: { id: true, title: true, status: true, priority: true } },
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
      appointment: normalizeAppointment(message.appointment),
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
        request: { select: { id: true, subject: true, type: true, status: true, urgency: true } },
        task: { select: { id: true, title: true, status: true, priority: true } },
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
        const appointment = normalizeAppointment(msg.appointment);
        if ((msg.type === 'file' || msg.type === 'image') && msg.content) {
          try {
            const fileUrl = await this.minioService.getPresignedUrl(msg.content, 7 * 24 * 60 * 60);
            return { ...msg, appointment, fileUrl };
          } catch {
            return { ...msg, appointment, fileUrl: null };
          }
        }
        return { ...msg, appointment, fileUrl: null };
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

  /**
   * Mark all unread messages in a room as read for the given user.
   * Updates readBy[] on every message not yet read by this user.
   */
  async markRoomAsRead(roomId: number, userId: number) {
    await this.getRoomById(roomId, userId);

    // Bulk-update: add userId to readBy for all unread messages in this room
    await this.prisma.chatMessage.updateMany({
      where: {
        roomId,
        deleted: false,
        senderId: { not: userId },
        NOT: { readBy: { has: String(userId) } },
      },
      data: {
        readBy: { push: String(userId) },
      },
    });

    return { success: true };
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

  /**
   * Get recent messages (last N) across all user's rooms.
   * Returns individual messages with sender info, room context, and unread status.
   */
  async getRecentMessages(userId: number, limit: number = 3) {
    // Get all rooms the user is a participant in
    const userRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { has: String(userId) },
        status: 'active',
      },
      select: { id: true, type: true, participants: true },
    });

    if (userRooms.length === 0) {
      return { messages: [], unreadCount: 0 };
    }

    const roomIds = userRooms.map((r) => r.id);

    // Get recent received messages (not sent by current user)
    // Fetch more than we need so we can filter to unique senders
    const allRecentMessages = await this.prisma.chatMessage.findMany({
      where: {
        roomId: { in: roomIds },
        deleted: false,
        senderId: { not: userId },
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        room: {
          select: {
            id: true,
            name: true,
            type: true,
            participants: true,
          },
        },
        request: {
          select: { id: true, subject: true },
        },
        task: {
          select: { id: true, title: true },
        },
        appointment: {
          select: { id: true, title: true, date: true, hour: true, status: true, type: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50, // Fetch more to ensure we get enough unique senders
    });

    // Get last message from each unique sender (limit to N different users)
    const seenSenders = new Set<number>();
    const rawMessages: typeof allRecentMessages = [];

    for (const msg of allRecentMessages) {
      if (!seenSenders.has(msg.senderId)) {
        rawMessages.push(msg);
        seenSenders.add(msg.senderId);

        if (rawMessages.length >= limit) {
          break;
        }
      }
    }

    // Get participant profiles to determine category
    const allParticipantIds = [
      ...new Set(
        rawMessages
          .map((msg) => msg.room?.participants ?? [])
          .flat()
          .map(Number)
          .filter((id) => id !== userId && !isNaN(id))
      ),
    ];

    const participantProfiles = allParticipantIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: allParticipantIds } },
          select: {
            id: true,
            role: { select: { code: true } },
          },
        })
      : [];

    const profileMap = new Map(participantProfiles.map((p) => [p.id, p]));

    // Determine room category for each message (for navigation)
    const messagesWithCategory = await Promise.all(
      rawMessages.map(async (msg) => {
        // Find other participant in the room
        const otherParticipantId = msg.room?.participants.map(Number).find((id) => id !== userId);

        const otherProfile = otherParticipantId ? profileMap.get(otherParticipantId) : null;

        const otherRoleCode = (otherProfile?.role?.code ?? '').toLowerCase();

        const category =
          otherRoleCode === 'client' || otherRoleCode.startsWith('client_')
            ? 'client'
            : 'collaborateur';

        // Check if message is unread by current user
        const isUnread = msg.senderId !== userId && !msg.readBy.includes(String(userId));

        // Generate presigned URL for file messages
        let fileUrl: string | null = null;
        if ((msg.type === 'file' || msg.type === 'image') && msg.content) {
          try {
            fileUrl = await this.minioService.getPresignedUrl(msg.content, 7 * 24 * 60 * 60);
          } catch {
            fileUrl = null;
          }
        }

        return {
          id: msg.id,
          roomId: msg.roomId,
          senderId: msg.senderId,
          content: msg.content,
          type: msg.type,
          createdAt: msg.createdAt,
          unread: isUnread,
          sender: msg.sender,
          room: {
            id: msg.room?.id,
            name: msg.room?.name,
            category,
          },
          fileUrl,
          request: msg.request,
          task: msg.task,
          appointment: msg.appointment ? normalizeAppointment(msg.appointment) : null,
        };
      })
    );

    // Count total unread messages across all rooms
    const unreadCount = await this.prisma.chatMessage.count({
      where: {
        roomId: { in: roomIds },
        deleted: false,
        senderId: { not: userId },
        NOT: { readBy: { has: String(userId) } },
      },
    });

    return {
      messages: messagesWithCategory,
      unreadCount,
    };
  }

  /**
   * Get total count of unread messages across all user's rooms.
   */
  async getUnreadMessagesCount(userId: number) {
    // Get all rooms the user is a participant in
    const userRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { has: String(userId) },
        status: 'active',
      },
      select: { id: true },
    });

    if (userRooms.length === 0) {
      return { count: 0 };
    }

    const roomIds = userRooms.map((r) => r.id);

    const count = await this.prisma.chatMessage.count({
      where: {
        roomId: { in: roomIds },
        deleted: false,
        senderId: { not: userId },
        NOT: { readBy: { has: String(userId) } },
      },
    });

    return { count };
  }

  /**
   * Mark all unread messages across all user's rooms as read.
   */
  async markAllRoomsAsRead(userId: number) {
    // Get all rooms the user is a participant in
    const userRooms = await this.prisma.chatRoom.findMany({
      where: {
        participants: { has: String(userId) },
        status: 'active',
      },
      select: { id: true },
    });

    if (userRooms.length === 0) {
      return { success: true, updatedCount: 0 };
    }

    const roomIds = userRooms.map((r) => r.id);

    // Bulk update: add userId to readBy for all unread messages
    const result = await this.prisma.chatMessage.updateMany({
      where: {
        roomId: { in: roomIds },
        deleted: false,
        senderId: { not: userId },
        NOT: { readBy: { has: String(userId) } },
      },
      data: {
        readBy: { push: String(userId) },
      },
    });

    return { success: true, updatedCount: result.count };
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
