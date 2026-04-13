import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateDevisDto } from './dto/create-devis.dto';
import { UpdateDevisDto } from './dto/update-devis.dto';
import * as puppeteer from 'puppeteer';

@Injectable()
export class DevisService {
  private readonly logger = new Logger(DevisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  /**
   * Create a new devis and generate PDF
   */
  async createDevis(userId: number, userCompanyId: number, dto: CreateDevisDto) {
    // Determine target company
    let targetCompanyId = userCompanyId;
    let createdByCompanyId = userCompanyId;

    // If clientCompanyId provided, user is accountant creating for client
    if (dto.clientCompanyId) {
      targetCompanyId = dto.clientCompanyId;
      createdByCompanyId = userCompanyId;

      // Validate accountant has active relationship with client
      const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
        where: {
          clientCompanyId: targetCompanyId,
          accountingFirmId: userCompanyId,
          status: 'active',
        },
      });

      if (!relationship) {
        throw new ApiError(
          'No active relationship with this client',
          403,
          'NO_ACTIVE_RELATIONSHIP'
        );
      }
    }

    // Calculate amounts
    const amounts = this.calculateAmounts(dto);

    // Generate devis number
    const number = await this.generateDevisNumber();

    // Create devis in database
    const devis = await this.prisma.devis.create({
      data: {
        number,
        status: dto.status,
        tvaRate: dto.tvaRate,
        validUntil: new Date(dto.validUntil),
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        lines: dto.lines as any,
        notes: dto.notes || null,
        amountHT: amounts.amountHT,
        amountTVA: amounts.amountTVA,
        amountTTC: amounts.amountTTC,
        ownerId: userId,
        companyId: targetCompanyId,
        createdBy: userId,
        createdByCompanyId,
      },
    });

    // Generate and upload PDF synchronously
    try {
      await this.generateAndUploadPdf(devis.id, targetCompanyId);
      this.logger.log(`PDF generated successfully for devis ${devis.id}`);
    } catch (err) {
      this.logger.error(`Failed to generate PDF for devis ${devis.id}:`, err);
      // Don't throw error - devis is still created, PDF can be regenerated later
    }

    // Fetch updated devis with pdfUrl
    const updatedDevis = await this.prisma.devis.findUnique({
      where: { id: devis.id },
    });

    return {
      status: 'success',
      code: '201',
      data: updatedDevis || devis,
      message: 'Devis created successfully',
    };
  }

  /**
   * Get all devis for a company with filters
   */
  async getDevisList(
    userCompanyId: number,
    page: number = 1,
    limit: number = 20,
    status?: string,
    search?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId: userCompanyId,
    };

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      where.OR = [
        { number: { contains: search.trim(), mode: 'insensitive' } },
        { notes: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    const [totalCount, devisList] = await Promise.all([
      this.prisma.devis.count({ where }),
      this.prisma.devis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          owner: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Generate presigned URLs for all PDFs
    const devisListWithUrls = await Promise.all(
      devisList.map(async (devis) => {
        let pdfUrl: string | undefined;
        if (devis.pdfUrl) {
          try {
            pdfUrl = await this.minioService.getPresignedUrl(devis.pdfUrl);
          } catch (error) {
            this.logger.warn(`Failed to generate presigned URL for devis ${devis.id}`);
          }
        }
        return {
          ...devis,
          pdfUrl,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    return {
      status: 'success',
      code: '200',
      data: devisListWithUrls,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Get devis by ID
   */
  async getDevis(id: number, userCompanyId: number) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!devis) {
      throw new ApiError('Devis not found', 404, 'NOT_FOUND');
    }

    // Check access
    const hasAccess =
      devis.companyId === userCompanyId ||
      (await this.validateAccountantClientRelationship(userCompanyId, devis.companyId));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Generate presigned URL for PDF if exists
    let pdfUrl: string | undefined;
    if (devis.pdfUrl) {
      try {
        pdfUrl = await this.minioService.getPresignedUrl(devis.pdfUrl);
      } catch (error) {
        this.logger.warn(`Failed to generate presigned URL for devis ${id}`);
      }
    }

    return {
      status: 'success',
      code: '200',
      data: {
        ...devis,
        pdfUrl,
      },
    };
  }

  /**
   * Update devis
   */
  async updateDevis(id: number, userCompanyId: number, dto: UpdateDevisDto) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
    });

    if (!devis) {
      throw new ApiError('Devis not found', 404, 'NOT_FOUND');
    }

    // Check access
    const hasAccess =
      devis.companyId === userCompanyId ||
      (await this.validateAccountantClientRelationship(userCompanyId, devis.companyId));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Recalculate amounts if lines or discount changed
    let amounts: any = {};
    if (
      dto.lines ||
      dto.discountType !== undefined ||
      dto.discountValue !== undefined ||
      dto.tvaRate !== undefined
    ) {
      const dataForCalculation = {
        lines: dto.lines || devis.lines,
        discountType: dto.discountType || devis.discountType,
        discountValue: dto.discountValue !== undefined ? dto.discountValue : devis.discountValue,
        tvaRate: dto.tvaRate !== undefined ? dto.tvaRate : devis.tvaRate,
      } as any;

      amounts = this.calculateAmounts(dataForCalculation);
    }

    const updated = await this.prisma.devis.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.tvaRate !== undefined && { tvaRate: dto.tvaRate }),
        ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
        ...(dto.discountType && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.lines && { lines: dto.lines as any }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(amounts.amountHT !== undefined && {
          amountHT: amounts.amountHT,
          amountTVA: amounts.amountTVA,
          amountTTC: amounts.amountTTC,
        }),
      },
    });

    // Regenerate PDF synchronously if content changed
    if (dto.lines || dto.status || dto.notes || dto.tvaRate !== undefined) {
      try {
        await this.generateAndUploadPdf(id, devis.companyId);
        this.logger.log(`PDF regenerated successfully for devis ${id}`);
      } catch (err) {
        this.logger.error(`Failed to regenerate PDF for devis ${id}:`, err);
      }
    }

    // Fetch updated devis with pdfUrl
    const finalDevis = await this.prisma.devis.findUnique({
      where: { id },
    });

    return {
      status: 'success',
      code: '200',
      data: finalDevis || updated,
      message: 'Devis updated successfully',
    };
  }

  /**
   * Delete devis
   */
  async deleteDevis(id: number, userCompanyId: number) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
    });

    if (!devis) {
      throw new ApiError('Devis not found', 404, 'NOT_FOUND');
    }

    // Check access
    const hasAccess =
      devis.companyId === userCompanyId ||
      (await this.validateAccountantClientRelationship(userCompanyId, devis.companyId));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Delete PDF from MinIO if exists
    if (devis.pdfUrl) {
      try {
        await this.minioService.deleteFile(devis.pdfUrl);
      } catch (error) {
        this.logger.warn(`Failed to delete PDF for devis ${id}`);
      }

      // Also delete Document entry from database
      try {
        await this.prisma.document.updateMany({
          where: {
            url: devis.pdfUrl,
            category: 'devis',
            companyId: devis.companyId,
          },
          data: {
            status: 'deleted',
          },
        });
      } catch (error) {
        this.logger.warn(`Failed to delete document entry for devis ${id}`);
      }
    }

    // Delete devis from database
    await this.prisma.devis.delete({
      where: { id },
    });

    return {
      status: 'success',
      code: '200',
      message: 'Devis deleted successfully',
    };
  }

  /**
   * Download devis PDF
   */
  async downloadDevisPdf(id: number, userCompanyId: number) {
    const devis = await this.prisma.devis.findUnique({
      where: { id },
    });

    if (!devis) {
      throw new ApiError('Devis not found', 404, 'NOT_FOUND');
    }

    // Check access
    const hasAccess =
      devis.companyId === userCompanyId ||
      (await this.validateAccountantClientRelationship(userCompanyId, devis.companyId));

    if (!hasAccess) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    if (!devis.pdfUrl) {
      throw new ApiError('PDF not found', 404, 'PDF_NOT_FOUND');
    }

    const stream = await this.minioService.getFileStream(devis.pdfUrl);

    return {
      stream,
      filename: `${devis.number}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate amounts (HT, TVA, TTC)
   */
  private calculateAmounts(dto: {
    lines: any[];
    discountType: string;
    discountValue: number;
    tvaRate: number;
  }) {
    const subtotal = dto.lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);

    const discount =
      dto.discountType === 'percentage' ? (subtotal * dto.discountValue) / 100 : dto.discountValue;

    const amountHT = Math.max(subtotal - discount, 0);
    const amountTVA = (amountHT * dto.tvaRate) / 100;
    const amountTTC = amountHT + amountTVA;

    return {
      amountHT: Math.round(amountHT * 100) / 100,
      amountTVA: Math.round(amountTVA * 100) / 100,
      amountTTC: Math.round(amountTTC * 100) / 100,
    };
  }

  /**
   * Generate unique devis number
   */
  private async generateDevisNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const timestamp = now.getTime();
    const suffix = String(timestamp).slice(-5);

    return `DEV-${year}-${suffix}`;
  }

  /**
   * Generate PDF from devis data and upload to MinIO + save in Documents
   */
  private async generateAndUploadPdf(devisId: number, companyId: number): Promise<void> {
    const devis = await this.prisma.devis.findUnique({
      where: { id: devisId },
      include: {
        owner: true,
      },
    });

    if (!devis) {
      throw new Error(`Devis ${devisId} not found`);
    }

    // Build HTML template
    const html = this.buildDevisHtml(devis);

    // Generate PDF using puppeteer
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
      });

      // Get or create folder structure: devis/YYYY-MM-DD/
      const dateFolder = await this.ensureDevisFolderStructure(
        companyId,
        devis.ownerId,
        devis.createdAt
      );

      // Upload PDF to MinIO in date-specific folder
      const fileName = `${devis.number}.pdf`;
      const folderPath = await this.buildFolderPath(dateFolder.id);
      const objectName = await this.minioService.uploadFile(companyId, folderPath, {
        originalname: fileName,
        buffer: Buffer.from(pdfBuffer),
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
      } as Express.Multer.File);

      // Get presigned URL
      const presignedUrl = await this.minioService.getPresignedUrl(objectName);

      // Create Document entry in database
      const document = await this.prisma.document.create({
        data: {
          name: fileName,
          type: 'pdf',
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
          url: objectName,
          category: 'devis',
          ownerId: devis.ownerId,
          companyId: companyId,
          createdBy: devis.createdBy,
          createdByCompanyId: devis.createdByCompanyId,
          parentId: dateFolder.id,
          isFolder: false,
          status: 'active',
        },
      });

      // Update devis with PDF URL
      await this.prisma.devis.update({
        where: { id: devisId },
        data: { pdfUrl: objectName },
      });

      this.logger.log(`PDF generated and saved for devis ${devisId} in documents folder`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Ensure folder structure exists: devis/YYYY-MM-DD/
   * Creates folders if they don't exist
   */
  private async ensureDevisFolderStructure(
    companyId: number,
    ownerId: number,
    createdAt: Date
  ): Promise<any> {
    // 1. Find or create root "devis" folder
    let devisFolder = await this.prisma.document.findFirst({
      where: {
        companyId: companyId,
        name: 'devis',
        isFolder: true,
        parentId: null,
        status: 'active',
      },
    });

    if (!devisFolder) {
      devisFolder = await this.prisma.document.create({
        data: {
          name: 'devis',
          type: 'folder',
          isFolder: true,
          url: '',
          ownerId: ownerId,
          companyId: companyId,
          createdBy: ownerId,
          createdByCompanyId: companyId,
          parentId: null,
          status: 'active',
        },
      });
      this.logger.log(`Created devis root folder for company ${companyId}`);
    }

    // 2. Find or create date folder (YYYY-MM-DD)
    const dateString = this.formatDate(createdAt);
    let dateFolder = await this.prisma.document.findFirst({
      where: {
        companyId: companyId,
        name: dateString,
        isFolder: true,
        parentId: devisFolder.id,
        status: 'active',
      },
    });

    if (!dateFolder) {
      dateFolder = await this.prisma.document.create({
        data: {
          name: dateString,
          type: 'folder',
          isFolder: true,
          url: '',
          ownerId: ownerId,
          companyId: companyId,
          createdBy: ownerId,
          createdByCompanyId: companyId,
          parentId: devisFolder.id,
          status: 'active',
        },
      });
      this.logger.log(`Created date folder ${dateString} for company ${companyId}`);
    }

    return dateFolder;
  }

  /**
   * Build folder path from document ID
   */
  private async buildFolderPath(folderId: number): Promise<string> {
    const path: string[] = [];
    let currentId: number | null = folderId;

    while (currentId) {
      const folder = await this.prisma.document.findUnique({
        where: { id: currentId },
        select: { name: true, parentId: true },
      });

      if (!folder) break;

      path.unshift(folder.name);
      currentId = folder.parentId;
    }

    return path.join('/');
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Build HTML template for PDF generation
   */
  private buildDevisHtml(devis: any): string {
    const formatAmount = (value: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + ' DT';

    const lines = (devis.lines as any[]) || [];
    const lineItemsHtml = lines
      .map(
        (line) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 12px; width: 45%; word-wrap: break-word;">${line.description}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(line.unitPrice)}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 15%;">${line.quantity}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(line.quantity * line.unitPrice)}</td>
      </tr>
    `
      )
      .join('');

    const statusLabels: Record<string, string> = {
      en_attente: 'EN ATTENTE',
      accepte: 'ACCEPTÉ',
      refuse: 'REFUSÉ',
    };

    const statusColors: Record<string, string> = {
      en_attente: '#F59E0B',
      accepte: '#10B981',
      refuse: '#EF4444',
    };

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Devis ${devis.number}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700;800&display=swap');
            body { 
              font-family: 'Montserrat', 'Helvetica Neue', Helvetica, Arial, sans-serif;
              color: #111827;
              margin: 0;
              padding: 40px;
              line-height: 1.5;
              font-size: 12px;
            }
            .bold { font-weight: 700; }
            .heavy { font-weight: 800; }
            .page-container {
              max-width: 800px;
              margin: 0 auto;
            }
        </style>
    </head>
    <body>
      <div class="page-container">
        
        <!-- Header with Title -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 60%; vertical-align: middle;">
              <h1 class="heavy" style="font-size: 48px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1; color: #3B82F6;">DEVIS</h1>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: middle;">
              <div class="bold" style="font-size: 15px; margin-bottom: 8px;">DEVIS N° : ${devis.number}</div>
              <div style="display: inline-block; padding: 6px 16px; background-color: ${statusColors[devis.status]}; color: white; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                ${statusLabels[devis.status]}
              </div>
            </td>
          </tr>
        </table>

        <!-- Dates -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE :</span> ${new Date(devis.createdAt).toLocaleDateString('fr-FR')}</div>
              <div><span class="bold">VALIDE JUSQU'AU :</span> ${new Date(devis.validUntil).toLocaleDateString('fr-FR')}</div>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <div style="border-top: 2px solid #3B82F6; margin-bottom: 25px;"></div>

        <!-- Product Lines Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #3B82F6; background: linear-gradient(to bottom, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.04));">
              <th class="bold" style="text-align: left; padding: 12px 8px; font-size: 12px; width: 45%;">Description :</th>
              <th class="bold" style="text-align: center; padding: 12px 8px; font-size: 12px; width: 20%;">Prix Unitaire :</th>
              <th class="bold" style="text-align: center; padding: 12px 8px; font-size: 12px; width: 15%;">Quantité :</th>
              <th class="bold" style="text-align: right; padding: 12px 8px; font-size: 12px; width: 20%;">Total :</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHtml}
          </tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-right: 20px; font-size: 12px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 10px; font-size: 13px; letter-spacing: 0.5px; color: #3B82F6;">CONDITIONS :</div>
              <div style="padding: 15px; background-color: #F3F4F6; border-left: 4px solid #3B82F6; border-radius: 4px; line-height: 1.6;">
                <div class="bold" style="margin-bottom: 8px;">Validité du devis :</div>
                <div style="margin-bottom: 12px; font-size: 11px; color: #374151;">
                  Ce devis est valable jusqu'au ${new Date(devis.validUntil).toLocaleDateString('fr-FR')}. Au-delà de cette date, les prix et conditions peuvent être révisés.
                </div>
                <div class="bold" style="margin-bottom: 8px;">Modalités de paiement :</div>
                <div style="font-size: 11px; color: #374151;">
                  50% à la commande, solde à la livraison. Paiement par virement bancaire ou chèque.
                </div>
              </div>
            </td>

            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(14, 165, 233, 0.05) 100%); padding: 20px; border-radius: 8px; border: 2px solid rgba(59, 130, 246, 0.2);">
                <tr>
                  <td class="bold" style="padding: 8px 0; text-align: right; padding-right: 20px; color: #374151;">TOTAL HT :</td>
                  <td style="padding: 8px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatAmount(devis.amountHT)}</td>
                </tr>
                <tr>
                  <td class="bold" style="padding: 8px 0; text-align: right; padding-right: 20px; color: #374151;">TVA (${devis.tvaRate}%) :</td>
                  <td style="padding: 8px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatAmount(devis.amountTVA)}</td>
                </tr>
                <tr style="border-top: 2px solid #3B82F6;">
                  <td class="bold" style="padding: 15px 0 8px 0; text-align: right; padding-right: 20px; font-size: 16px; color: #3B82F6;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 15px 0 8px 0; text-align: right; font-size: 20px; white-space: nowrap; color: #3B82F6;">${formatAmount(devis.amountTTC)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer Notes -->
        <div style="margin-top: 40px; padding: 20px; background-color: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
          <div style="margin-bottom: 15px;">
            <span class="bold" style="color: #3B82F6; font-size: 12px;">NOTE :</span>
            <div style="margin-top: 5px; font-size: 11px; color: #374151; line-height: 1.6;">
              ${devis.notes || 'Aucune note spécifique pour ce devis.'}
            </div>
          </div>
        </div>

      </div>
    </body>
    </html>
  `;
  }

  /**
   * Validate accountant has active relationship with client
   */
  private async validateAccountantClientRelationship(
    accountantCompanyId: number,
    clientCompanyId: number
  ): Promise<boolean> {
    const relationship = await this.prisma.clientAccountingFirmRelationship.findFirst({
      where: {
        accountingFirmId: accountantCompanyId,
        clientCompanyId,
        status: 'active',
      },
    });

    return !!relationship;
  }
}
