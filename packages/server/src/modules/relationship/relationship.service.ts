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
        company: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!user || !user.companyId || !user.company) {
      throw new BadRequestException('Vous devez être associé à une entreprise');
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

    if (!targetCompany) {
      throw new NotFoundException('Entreprise cible non trouvée');
    }

    // Determine invitation type - be more permissive
    const userType = user.company.type?.toLowerCase() || '';
    const targetType = targetCompany.type?.toLowerCase() || '';

    console.log('User company:', { id: user.companyId, name: user.company.name, type: userType });
    console.log('Target company:', {
      id: targetCompany.id,
      name: targetCompany.name,
      type: targetType,
    });

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
    const clientCompanyId = isClientToAccountant ? user.companyId : dto.targetCompanyId;
    const accountingFirmId = isClientToAccountant ? dto.targetCompanyId : user.companyId;

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
        status: 'pending',
        invitationMessage: dto.invitationMessage,
      } as any,
      include: {
        clientCompany: { select: { id: true, name: true } },
        accountingFirm: { select: { id: true, name: true } },
      },
    });

    // Send notification to target company owner
    if (targetCompany.ownerId) {
      await this.notificationService.notify({
        recipientId: targetCompany.ownerId,
        type: 'relationship.invitation_received',
        action: 'view_invitation',
        priority: 'normal',
        actorName: user.company.name,
        data: { invitationId: invitation.id, companyName: user.company.name },
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
      include: {
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

    // Notify the sender - get company owner
    const senderCompany =
      invitation.clientCompanyId === user.companyId
        ? invitation.accountingFirm
        : invitation.clientCompany;

    // Get owner of sender company
    const senderCompanyData = await this.prisma.company.findUnique({
      where: { id: senderCompany.id },
      select: { ownerId: true },
    });

    if (senderCompanyData?.ownerId) {
      const responseType =
        dto.response === InvitationResponse.ACCEPT
          ? 'relationship.invitation_accepted'
          : 'relationship.invitation_rejected';

      await this.notificationService.notify({
        recipientId: senderCompanyData.ownerId,
        type: responseType,
        action: 'view_relationships',
        priority: 'normal',
        actorName: `${user.firstName} ${user.lastName}`,
        data: { relationshipId: updatedInvitation.id },
      });
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
}
