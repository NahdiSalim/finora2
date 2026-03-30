import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { SendInvitationDto } from './dto/send-invitation.dto';
import { RespondInvitationDto, InvitationResponse } from './dto/respond-invitation.dto';
import { TerminateRelationshipDto } from './dto/terminate-relationship.dto';

@Injectable()
export class RelationshipService {
  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService
  ) {}

  /**
   * Send an invitation to establish a relationship
   */
  async sendInvitation(userId: number, dto: SendInvitationDto) {
    // Get user's company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
        email: true,
        username: true,
        company: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!user || !user.companyId || !user.company) {
      // Auto-create company if missing (clients registered before this fix)
      if (user && !user.companyId) {
        const autoCompany = await this.prisma.company.create({
          data: {
            name: user.username || user.email.split('@')[0],
            email: user.email,
            type: 'client',
            status: 'active',
            ownerId: user.id,
          },
        });
        await this.prisma.user.update({
          where: { id: userId },
          data: { companyId: autoCompany.id },
        });
        (user as any).companyId = autoCompany.id;
        (user as any).company = {
          id: autoCompany.id,
          name: autoCompany.name,
          type: autoCompany.type,
        };
      } else {
        throw new BadRequestException('Vous devez être associé à une entreprise');
      }
    }

    // Get target company
    const targetCompany = await this.prisma.company.findUnique({
      where: { id: dto.targetCompanyId },
      select: {
        id: true,
        name: true,
        type: true,
        ownerId: true,
      },
    });
    console.log(targetCompany, 'targetCompany');
    if (!targetCompany) {
      throw new NotFoundException('Entreprise cible non trouvée');
    }

    // Determine invitation type - be more permissive
    const userType = user.company?.type?.toLowerCase() || '';
    const targetType = targetCompany.type?.toLowerCase() || '';
    // Allow relationships in these cases:
    // 1. User is client and target is accounting_firm
    // 2. User is accounting_firm and target is client
    // 3. User type not set and target is accounting_firm (assume user is client)
    // 4. User is client and target type not set (assume target is accounting_firm)
    // 5. Both types not set (allow anyway)

    const isClientToAccountant =
      (userType === 'client' &&
        (targetType === 'accounting_firm' || targetType === 'accountant')) ||
      (!userType && (targetType === 'accounting_firm' || targetType === 'accountant')); // User type not set, assume client

    const isAccountantToClient =
      ((userType === 'accounting_firm' || userType === 'accountant') && targetType === 'client') ||
      ((userType === 'accounting_firm' || userType === 'accountant') && !targetType); // Target type not set, assume client

    const bothTypesNotSet = !userType && !targetType;

    if (!isClientToAccountant && !isAccountantToClient && !bothTypesNotSet) {
      throw new BadRequestException(
        `Type de relation invalide. Type utilisateur: "${userType || 'non défini'}", Type cible: "${targetType || 'non défini'}". ` +
          `Les relations doivent être entre un client et un cabinet comptable.`
      );
    }

    const invitationType = isClientToAccountant ? 'client_to_accountant' : 'accountant_to_client';
    const clientCompanyId = isClientToAccountant ? user.companyId! : dto.targetCompanyId;
    const accountingFirmId = isClientToAccountant ? dto.targetCompanyId : user.companyId!;

    // Check if relationship already exists
    const existingRelationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
      where: {
        clientCompanyId,
        accountingFirmId,
        status: { in: ['pending', 'accepted', 'active'] },
      },
    });

    if (existingRelationship) {
      throw new BadRequestException('Une relation existe déjà ou est en attente');
    }

    // Create invitation
    const invitation = await this.prisma.clientAccountingFirmRelationship.create({
      data: {
        clientCompanyId,
        accountingFirmId,
        invitedBy: userId,
        status: 'pending',
        invitationMessage: dto.invitationMessage,
      } as any,
      include: {
        clientCompany: { select: { id: true, name: true } },
        accountingFirm: { select: { id: true, name: true } },
      },
    });

    // Send notification — ownerId peut être null, fallback sur le premier user de la compagnie
    let notifyRecipientId: number | null = targetCompany.ownerId;
    if (!notifyRecipientId) {
      const companyUser = await this.prisma.user.findFirst({
        where: { companyId: targetCompany.id },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      notifyRecipientId = companyUser?.id ?? null;
    }

    if (notifyRecipientId) {
      const companyName = (user as any).company?.name ?? user.email.split('@')[0];
      const senderName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || companyName;
      await this.notificationService.notify({
        recipientId: notifyRecipientId,
        type: 'relationship',
        action: 'invitation_received',
        priority: 'high',
        actorName: senderName,
        data: {
          invitationId: invitation.id,
          companyName,
          senderName,
          invitationMessage: dto.invitationMessage ?? null,
        },
      });
    }

    return {
      success: true,
      message: 'Invitation envoyée avec succès',
      invitation,
    };
  }

  /**
   * Get pending invitations (received)
   */
  async getPendingInvitations(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user || !user.companyId) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
    }

    const invitations = await this.prisma.clientAccountingFirmRelationship.findMany({
      where: {
        OR: [{ clientCompanyId: user.companyId }, { accountingFirmId: user.companyId }],
        status: 'pending',
      },
      include: {
        clientCompany: { select: { id: true, name: true, logo: true } },
        accountingFirm: { select: { id: true, name: true, logo: true } },
      },
      orderBy: { requestDate: 'desc' },
    });

    // For now, return all invitations
    // TODO: After Prisma sync, filter by invitedBy and invitationType
    return {
      received: invitations,
      sent: [],
    };
  }

  /**
   * Respond to an invitation
   */
  async respondToInvitation(userId: number, invitationId: number, dto: RespondInvitationDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user || !user.companyId) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
    }

    const invitation = await this.prisma.clientAccountingFirmRelationship.findUnique({
      where: { id: invitationId },
      select: {
        id: true,
        status: true,
        invitedBy: true,
        clientCompanyId: true,
        accountingFirmId: true,
        rejectionReason: true,
        clientCompany: { select: { id: true, name: true } },
        accountingFirm: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      throw new NotFoundException('Invitation non trouvée');
    }

    if (invitation.status !== 'pending') {
      throw new BadRequestException('Cette invitation a déjà été traitée');
    }

    // Check if user is authorized to respond
    // For now, allow if user's company is part of the relationship
    const isRecipient =
      invitation.accountingFirmId === user.companyId ||
      invitation.clientCompanyId === user.companyId;

    if (!isRecipient) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à répondre à cette invitation");
    }

    // Update invitation
    const newStatus = dto.response === InvitationResponse.ACCEPT ? 'accepted' : 'rejected';
    const updateData: any = {
      status: newStatus,
      responseDate: new Date(),
    };

    if (dto.response === InvitationResponse.ACCEPT) {
      updateData.relationshipStart = new Date();
      updateData.status = 'active'; // Directly set to active
    } else {
      updateData.rejectionReason = dto.rejectionReason;
    }

    const updatedInvitation = await this.prisma.clientAccountingFirmRelationship.update({
      where: { id: invitationId },
      data: updateData,
    });

    // Notify the sender directly via invitedBy (the user who sent the invitation)
    const invitedByUserId = invitation.invitedBy ?? null;
    let senderRecipientId: number | null = invitedByUserId;

    // Fallback: find first user of the sender company (not the current user's company)
    if (!senderRecipientId) {
      const senderCompanyId =
        invitation.clientCompanyId === user.companyId
          ? invitation.accountingFirmId // current user is client → sender is accountant firm
          : invitation.clientCompanyId; // current user is accountant → sender is client

      const senderUser = await this.prisma.user.findFirst({
        where: { companyId: senderCompanyId },
        select: { id: true },
        orderBy: { createdAt: 'asc' },
      });
      senderRecipientId = senderUser?.id ?? null;
    }

    console.log(
      '[respondToInvitation] invitedBy:',
      invitedByUserId,
      '| senderRecipientId:',
      senderRecipientId
    );
    if (senderRecipientId) {
      const isAccepted = dto.response === InvitationResponse.ACCEPT;
      // Determine role label for the message
      const isAccountantResponding = invitation.accountingFirmId === user.companyId;
      const responderLabel = isAccountantResponding ? 'Votre comptable' : 'Votre client';
      const responderName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
      const actorLabel = responderName ? `${responderLabel} (${responderName})` : responderLabel;

      try {
        await this.notificationService.notify({
          recipientId: senderRecipientId,
          type: 'relationship',
          action: isAccepted ? 'invitation_accepted' : 'invitation_rejected',
          priority: 'normal',
          actorName: actorLabel,
          data: {
            relationshipId: updatedInvitation.id,
            status: isAccepted ? 'active' : 'rejected',
            rejectionReason: dto.rejectionReason ?? null,
          },
        });
      } catch (err) {
        console.error('[respondToInvitation] notification error:', err?.message);
      }
    }
    return {
      success: true,
      message:
        dto.response === InvitationResponse.ACCEPT
          ? 'Invitation acceptée. La relation est maintenant active.'
          : 'Invitation refusée',
      relationship: updatedInvitation,
    };
  }

  /**
   * Get active relationships
   */
  async getActiveRelationships(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true, company: { select: { type: true } } },
    });

    if (!user || !user.companyId) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
    }

    const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
      where: {
        OR: [{ clientCompanyId: user.companyId }, { accountingFirmId: user.companyId }],
        status: 'active',
      },
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            email: true,
            phone: true,
          },
        },
        accountingFirm: {
          select: {
            id: true,
            name: true,
            logo: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { relationshipStart: 'desc' },
    });

    return relationships;
  }

  /**
   * Terminate a relationship
   */
  async terminateRelationship(
    userId: number,
    relationshipId: number,
    dto: TerminateRelationshipDto
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        companyId: true,
        firstName: true,
        lastName: true,
      },
    });

    if (!user || !user.companyId) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
    }

    const relationship = await this.prisma.clientAccountingFirmRelationship.findUnique({
      where: { id: relationshipId },
      include: {
        clientCompany: { select: { id: true, name: true, ownerId: true } },
        accountingFirm: { select: { id: true, name: true, ownerId: true } },
      },
    });

    if (!relationship) {
      throw new NotFoundException('Relation non trouvée');
    }

    if (relationship.status !== 'active') {
      throw new BadRequestException("Cette relation n'est pas active");
    }

    // Check if user is part of the relationship
    const isPartOfRelationship =
      relationship.clientCompanyId === user.companyId ||
      relationship.accountingFirmId === user.companyId;

    if (!isPartOfRelationship) {
      throw new ForbiddenException("Vous n'êtes pas autorisé à résilier cette relation");
    }

    // Update relationship
    const updatedRelationship = await this.prisma.clientAccountingFirmRelationship.update({
      where: { id: relationshipId },
      data: {
        status: 'terminated',
        terminationReason: dto.terminationReason,
        relationshipEnd: new Date(),
      } as any,
    });

    // Notify the other party
    const otherPartyOwnerId =
      relationship.clientCompanyId === user.companyId
        ? relationship.accountingFirm.ownerId
        : relationship.clientCompany.ownerId;

    if (otherPartyOwnerId) {
      await this.notificationService.notify({
        recipientId: otherPartyOwnerId,
        type: 'relationship.terminated',
        action: 'view_relationships',
        priority: 'high',
        actorName: `${user.firstName} ${user.lastName}`,
        data: { relationshipId: updatedRelationship.id },
      });
    }

    return {
      success: true,
      message: 'Relation résiliée avec succès',
      relationship: updatedRelationship,
    };
  }

  /**
   * Get relationship history
   */
  async getRelationshipHistory(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user || !user.companyId) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
    }

    const history = await this.prisma.clientAccountingFirmRelationship.findMany({
      where: {
        OR: [{ clientCompanyId: user.companyId }, { accountingFirmId: user.companyId }],
        status: { in: ['rejected', 'terminated'] },
      },
      include: {
        clientCompany: { select: { id: true, name: true } },
        accountingFirm: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return history;
  }

  /**
   * Get all clients with invoice statistics for the connected accountant
   */
  async getClientsWithInvoiceStats(
    userId: number,
    page: number = 1,
    limit: number = 20,
    search?: string,
    startDate?: string,
    endDate?: string,
    isArchived?: boolean
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        companyId: true,
        role: true,
        company: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!user || !user.companyId) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
    }

    // Verify user is from an accounting firm (check both company type and user role)
    const userType = user.company?.type?.toLowerCase() || '';
    const userRoleFr = user.role?.nameFr?.toLowerCase() || '';
    const userRoleEn = user.role?.nameEn?.toLowerCase() || '';

    const isAccountant =
      userType === 'accounting_firm' ||
      userType === 'accountant' ||
      userRoleFr === 'comptable' ||
      userRoleEn === 'accountant';

    if (!isAccountant) {
      console.log('User type:', userType, 'User role FR:', userRoleFr, 'User role EN:', userRoleEn);
      throw new ForbiddenException('Cette API est réservée aux cabinets comptables');
    }

    const skip = (page - 1) * limit;

    // Build where clause with filters
    const where: any = {
      accountingFirmId: user.companyId,
      status: 'active',
    };

    // Add search filter by company name
    if (search) {
      where.clientCompany = {
        name: {
          contains: search,
          mode: 'insensitive',
        },
      };
    }

    // Add date range filter
    if (startDate || endDate) {
      where.relationshipStart = {};
      if (startDate) {
        where.relationshipStart.gte = new Date(startDate);
      }
      if (endDate) {
        where.relationshipStart.lte = new Date(endDate);
      }
    }

    // Get total count of active relationships with filters
    let totalRelationships = await this.prisma.clientAccountingFirmRelationship.count({
      where,
    });

    // Get paginated active relationships where user's company is the accounting firm
    const relationships = await this.prisma.clientAccountingFirmRelationship.findMany({
      where,
      skip,
      take: limit,
      include: {
        clientCompany: {
          select: {
            id: true,
            name: true,
            logo: true,
            email: true,
            owner: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        relationshipStart: 'desc',
      },
    });

    // For each client, get invoice statistics
    let clientsWithStats: any[] = await Promise.all(
      relationships.map(async (relationship) => {
        const clientCompanyId = relationship.clientCompanyId;

        // Count invoices by status (category = 'facture')
        // traite = extracted (includes traite, enregistre, synchronise)
        const [traiteCount, pendingCount, totalInvoices] = await Promise.all([
          this.prisma.document.count({
            where: {
              companyId: clientCompanyId,
              category: 'facture',
              processingStatus: { in: ['traite', 'enregistre', 'synchronise'] },
              isFolder: false,
              status: 'active',
            },
          }),
          this.prisma.document.count({
            where: {
              companyId: clientCompanyId,
              category: 'facture',
              processingStatus: 'pending',
              isFolder: false,
              status: 'active',
            },
          }),
          this.prisma.document.count({
            where: {
              companyId: clientCompanyId,
              category: 'facture',
              isFolder: false,
              status: 'active',
            },
          }),
        ]);

        return {
          clientId: relationship.clientCompany.id,
          clientName: relationship.clientCompany.name,
          clientLogo: relationship.clientCompany.logo,
          clientEmail: relationship.clientCompany.email,
          ownerFirstName: relationship.clientCompany.owner?.firstName || null,
          ownerLastName: relationship.clientCompany.owner?.lastName || null,
          invoiceStats: {
            traite: traiteCount,
            pending: pendingCount,
            total: totalInvoices,
          },
          relationshipId: relationship.id,
          relationshipStart: relationship.relationshipStart,
        };
      })
    );

    // Filter by isArchived if provided
    if (isArchived !== undefined) {
      clientsWithStats = await Promise.all(
        clientsWithStats.map(async (client) => {
          // Count archived documents for this client
          const archivedCount = await this.prisma.document.count({
            where: {
              companyId: client.clientId,
              status: 'archived',
            },
          });

          // Include hasArchived flag
          return {
            ...client,
            hasArchived: archivedCount > 0,
          };
        })
      );

      // Filter clients based on isArchived parameter
      if (isArchived === true) {
        // Only return clients that have archived files
        clientsWithStats = clientsWithStats.filter((client: any) => client.hasArchived);
      } else if (isArchived === false) {
        // Only return clients that don't have archived files
        clientsWithStats = clientsWithStats.filter((client: any) => !client.hasArchived);
      }

      // Recalculate total after filtering
      totalRelationships = clientsWithStats.length;
    }

    return {
      success: true,
      data: clientsWithStats,
      pagination: {
        total: totalRelationships,
        page,
        limit,
        totalPages: Math.ceil(totalRelationships / limit),
      },
      filters: {
        search: search || null,
        startDate: startDate || null,
        endDate: endDate || null,
      },
    };
  }
}
