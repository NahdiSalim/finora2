import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SendContactMessageDto } from './dto/send-contact-message.dto';
import { MailService } from '../mail/mail.service';

@Injectable()
export class ContactService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService
  ) {}

  /**
   * Send a contact message from a visitor to an accountant
   */
  async sendContactMessage(
    accountantId: number,
    dto: SendContactMessageDto,
    ipAddress?: string,
    userAgent?: string
  ) {
    // Get accountant information
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!accountant) {
      throw new NotFoundException('Comptable non trouvé');
    }

    // Save contact message to database
    const contactMessage = await this.prisma.contactMessage.create({
      data: {
        accountantId,
        companyId: accountant.companyId,
        visitorName: dto.visitorName,
        visitorEmail: dto.visitorEmail,
        visitorPhone: dto.visitorPhone,
        visitorCompany: dto.visitorCompany,
        subject: dto.subject,
        message: dto.message,
        status: 'new',
        ipAddress,
        userAgent,
      },
    });

    // Send email to accountant
    const accountantEmail = accountant.email;
    const companyEmail = accountant.company?.email;
    const recipientEmail = companyEmail || accountantEmail;

    try {
      await this.mailService.sendEmail(
        recipientEmail,
        `Nouveau message de contact: ${dto.subject}`,
        this.generateContactEmailTemplate(dto, accountant)
      );
    } catch (error) {
      console.error('Failed to send contact email:', error);
      // Don't throw error - message is saved in database
    }

    return {
      success: true,
      message: 'Votre message a été envoyé avec succès. Le comptable vous contactera bientôt.',
      contactMessageId: contactMessage.id,
    };
  }

  /**
   * Get contact messages for an accountant
   */
  async getContactMessages(
    accountantId: number,
    filters?: {
      status?: string;
      page?: number;
      limit?: number;
    }
  ) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { accountantId };

    if (filters?.status) {
      where.status = filters.status;
    }

    const [messages, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return {
      data: messages,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single contact message
   */
  async getContactMessageById(messageId: number, accountantId: number) {
    const message = await this.prisma.contactMessage.findFirst({
      where: {
        id: messageId,
        accountantId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    // Mark as read
    if (message.status === 'new') {
      await this.prisma.contactMessage.update({
        where: { id: messageId },
        data: { status: 'read' },
      });
    }

    return message;
  }

  /**
   * Mark message as replied
   */
  async markAsReplied(messageId: number, accountantId: number) {
    const message = await this.prisma.contactMessage.findFirst({
      where: {
        id: messageId,
        accountantId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    return this.prisma.contactMessage.update({
      where: { id: messageId },
      data: {
        status: 'replied',
        isReplied: true,
        repliedAt: new Date(),
      },
    });
  }

  /**
   * Archive a contact message
   */
  async archiveMessage(messageId: number, accountantId: number) {
    const message = await this.prisma.contactMessage.findFirst({
      where: {
        id: messageId,
        accountantId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    return this.prisma.contactMessage.update({
      where: { id: messageId },
      data: { status: 'archived' },
    });
  }

  /**
   * Delete a contact message
   */
  async deleteMessage(messageId: number, accountantId: number) {
    const message = await this.prisma.contactMessage.findFirst({
      where: {
        id: messageId,
        accountantId,
      },
    });

    if (!message) {
      throw new NotFoundException('Message non trouvé');
    }

    await this.prisma.contactMessage.delete({
      where: { id: messageId },
    });

    return { success: true, message: 'Message supprimé' };
  }

  /**
   * Generate email template for contact message
   */
  private generateContactEmailTemplate(dto: SendContactMessageDto, accountant: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
          .info-row { margin: 10px 0; }
          .label { font-weight: bold; color: #4F46E5; }
          .message-box { background-color: white; padding: 15px; margin-top: 15px; border-left: 4px solid #4F46E5; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Nouveau Message de Contact</h2>
          </div>
          
          <div class="content">
            <p>Bonjour ${accountant.firstName} ${accountant.lastName},</p>
            <p>Vous avez reçu un nouveau message de contact via votre profil FINORA.</p>
            
            <div class="info-row">
              <span class="label">De:</span> ${dto.visitorName}
            </div>
            <div class="info-row">
              <span class="label">Email:</span> ${dto.visitorEmail}
            </div>
            ${
              dto.visitorPhone
                ? `
            <div class="info-row">
              <span class="label">Téléphone:</span> ${dto.visitorPhone}
            </div>
            `
                : ''
            }
            ${
              dto.visitorCompany
                ? `
            <div class="info-row">
              <span class="label">Entreprise:</span> ${dto.visitorCompany}
            </div>
            `
                : ''
            }
            <div class="info-row">
              <span class="label">Sujet:</span> ${dto.subject}
            </div>
            
            <div class="message-box">
              <p><strong>Message:</strong></p>
              <p>${dto.message.replace(/\n/g, '<br>')}</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Vous pouvez répondre directement à cet email pour contacter ${dto.visitorName}.</p>
            <p>Cet email a été envoyé automatiquement par FINORA.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
