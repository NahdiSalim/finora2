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
    const amounts = this.calculateAmounts({ lines: dto.lines, tvaRate: dto.tvaRate });

    // Use provided number or fall back to auto-generated
    const number = dto.number || (await this.generateDevisNumber());

    // Create devis in database
    const devis = await this.prisma.devis.create({
      data: {
        number,
        status: dto.status,
        tvaRate: dto.tvaRate,
        validUntil: new Date(dto.validUntil),
        lines: dto.lines as any,
        notes: dto.notes || null,
        amountHT: amounts.amountHT,
        amountTVA: amounts.amountTVA,
        amountTTC: amounts.amountTTC,
        ownerId: userId,
        companyId: targetCompanyId,
        createdBy: userId,
        createdByCompanyId,
        ...(dto.supplierId && { supplierId: dto.supplierId }),
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
        {
          supplier: {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { company: { contains: search.trim(), mode: 'insensitive' } },
              { taxId: { contains: search.trim(), mode: 'insensitive' } },
            ],
          },
        },
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

    const [totalCount, devisList, countEnAttente, countAccepte, countRefuse] = await Promise.all([
      this.prisma.devis.count({ where }),
      this.prisma.devis.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          owner: {
            select: { id: true, username: true, email: true },
          },
          supplier: {
            select: {
              id: true,
              name: true,
              company: true,
              email: true,
              phone: true,
              address: true,
              taxId: true,
              logoUrl: true,
            },
          },
        },
      }),
      this.prisma.devis.count({ where: { companyId: userCompanyId, status: 'en_attente' } }),
      this.prisma.devis.count({ where: { companyId: userCompanyId, status: 'accepte' } }),
      this.prisma.devis.count({ where: { companyId: userCompanyId, status: 'refuse' } }),
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
      counts: {
        en_attente: countEnAttente,
        accepte: countAccepte,
        refuse: countRefuse,
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
          select: { id: true, username: true, email: true },
        },
        supplier: {
          select: {
            id: true,
            name: true,
            company: true,
            email: true,
            phone: true,
            address: true,
            taxId: true,
            logoUrl: true,
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

    // Recalculate amounts if lines or tvaRate changed
    let amounts: any = {};
    if (dto.lines || dto.tvaRate !== undefined) {
      const dataForCalculation = {
        lines: dto.lines || devis.lines,
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
  private calculateAmounts(dto: { lines: any[]; tvaRate: number }) {
    const subtotal = dto.lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);
    const amountHT = subtotal;
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
        company: {
          select: {
            name: true,
            legalName: true,
            address: true,
            city: true,
            postalCode: true,
            phone: true,
            email: true,
            vatNumber: true,
            logo: true,
          },
        },
        supplier: {
          select: {
            name: true,
            company: true,
            email: true,
            phone: true,
            address: true,
            taxId: true,
            logoUrl: true,
          },
        },
      },
    });

    if (!devis) {
      throw new Error(`Devis ${devisId} not found`);
    }

    // Build HTML template
    const html = await this.buildDevisHtml(devis);

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

      // Get or create folder structure: devis/YYYY-MM/supplier/
      const dateFolder = await this.ensureDevisFolderStructure(
        companyId,
        devis.ownerId,
        devis.createdAt,
        devis.supplier as { name: string; company: string } | null
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
   * Ensure folder structure exists: devis/YYYY-MM/supplier/
   * Creates folders if they don't exist
   */
  private async ensureDevisFolderStructure(
    companyId: number,
    ownerId: number,
    createdAt: Date,
    supplier?: { name: string; company: string } | null
  ): Promise<any> {
    // 1. Root "devis" folder
    let devisFolder = await this.prisma.document.findFirst({
      where: {
        companyId,
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
          ownerId,
          companyId,
          createdBy: ownerId,
          createdByCompanyId: companyId,
          parentId: null,
          status: 'active',
        },
      });
      this.logger.log(`Created devis root folder for company ${companyId}`);
    }

    // 2. Month folder: YYYY-MM
    const monthStr = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, '0')}`;
    let monthFolder = await this.prisma.document.findFirst({
      where: {
        companyId,
        name: monthStr,
        isFolder: true,
        parentId: devisFolder.id,
        status: 'active',
      },
    });

    if (!monthFolder) {
      monthFolder = await this.prisma.document.create({
        data: {
          name: monthStr,
          type: 'folder',
          isFolder: true,
          url: '',
          ownerId,
          companyId,
          createdBy: ownerId,
          createdByCompanyId: companyId,
          parentId: devisFolder.id,
          status: 'active',
        },
      });
      this.logger.log(`Created month folder ${monthStr} for company ${companyId}`);
    }

    // 3. Supplier folder: "<name> - <company>" (or "Sans fournisseur" if none)
    const supplierFolderName = supplier
      ? `${supplier.name} - ${supplier.company}`.slice(0, 100)
      : 'Sans fournisseur';

    let supplierFolder = await this.prisma.document.findFirst({
      where: {
        companyId,
        name: supplierFolderName,
        isFolder: true,
        parentId: monthFolder.id,
        status: 'active',
      },
    });

    if (!supplierFolder) {
      supplierFolder = await this.prisma.document.create({
        data: {
          name: supplierFolderName,
          type: 'folder',
          isFolder: true,
          url: '',
          ownerId,
          companyId,
          createdBy: ownerId,
          createdByCompanyId: companyId,
          parentId: monthFolder.id,
          status: 'active',
        },
      });
      this.logger.log(`Created supplier folder "${supplierFolderName}" for company ${companyId}`);
    }

    return supplierFolder;
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
   * Build HTML template for PDF generation
   */
  private async buildDevisHtml(devis: any): Promise<string> {
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

    // Build issuer lines (client company)
    const issuerLines: string[] = [];
    if (devis.company) {
      if (devis.company.legalName || devis.company.name)
        issuerLines.push(devis.company.legalName || devis.company.name);
      if (devis.company.address) issuerLines.push(devis.company.address);
      if (devis.company.city || devis.company.postalCode)
        issuerLines.push([devis.company.postalCode, devis.company.city].filter(Boolean).join(' '));
      if (devis.company.phone) issuerLines.push('Tél : ' + devis.company.phone);
      if (devis.company.email) issuerLines.push(devis.company.email);
      if (devis.company.vatNumber) issuerLines.push('N° TVA : ' + devis.company.vatNumber);
    }
    if (issuerLines.length === 0) issuerLines.push('Votre Entreprise');

    // Build recipient lines (supplier)
    const recipientLines: string[] = [];
    if (devis.supplier) {
      if (devis.supplier.name) recipientLines.push(devis.supplier.name);
      if (devis.supplier.company) recipientLines.push(devis.supplier.company);
      if (devis.supplier.address) recipientLines.push(devis.supplier.address);
      if (devis.supplier.email) recipientLines.push('Email : ' + devis.supplier.email);
      if (devis.supplier.phone) recipientLines.push('Tél : ' + devis.supplier.phone);
      if (devis.supplier.taxId) recipientLines.push('Matricule : ' + devis.supplier.taxId);
    }
    if (recipientLines.length === 0) recipientLines.push('Destinataire');

    // Fetch company logo as base64 data URI using MinIO SDK directly
    const emetteurName = devis.company?.legalName || devis.company?.name || 'Émetteur';
    let emetteurLogoDataUri: string | undefined;
    if (devis.company?.logo) {
      try {
        const buffer = await this.minioService.downloadFile(devis.company.logo);
        const ext = devis.company.logo.split('.').pop()?.toLowerCase() ?? 'png';
        const mimeMap: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          webp: 'image/webp',
          svg: 'image/svg+xml',
        };
        const contentType = mimeMap[ext] ?? 'image/png';
        emetteurLogoDataUri = `data:${contentType};base64,${buffer.toString('base64')}`;
      } catch (error) {
        this.logger.warn(`Failed to fetch logo for devis ${devis.id}, will use company name`);
        emetteurLogoDataUri = undefined;
      }
    }

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
            .page-container { max-width: 800px; margin: 0 auto; }
        </style>
    </head>
    <body>
      <div class="page-container">

        <!-- Header -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 40%; vertical-align: middle;">
              ${
                emetteurLogoDataUri
                  ? `<img src="${emetteurLogoDataUri}" alt="${emetteurName}" style="height: 50px; max-width: 200px; object-fit: contain;" />`
                  : `<div style="font-size: 20px; font-weight: 700; color: #111827;">${emetteurName}</div>`
              }
            </td>
            <td style="width: 60%; text-align: right; vertical-align: middle;">
              <h1 class="heavy" style="font-size: 48px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1;">DEVIS</h1>
            </td>
          </tr>
        </table>

        <!-- Date and Devis Number -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE :</span> ${new Date(devis.createdAt).toLocaleDateString('fr-FR')}</div>
              <div><span class="bold">VALIDE JUSQU'AU :</span> ${new Date(devis.validUntil).toLocaleDateString('fr-FR')}</div>
            </td>
            <td style="width: 50%; text-align: right; vertical-align: top;">
              <div class="bold" style="font-size: 15px;">DEVIS N° : ${devis.number}</div>
            </td>
          </tr>
        </table>

        <div style="border-top: 2px solid #333; margin-bottom: 25px;"></div>

        <!-- Issuer and Recipient -->
        <table style="width: 100%; margin-bottom: 40px; font-size: 12px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 8px; font-size: 11px; letter-spacing: 0.5px;">ÉMETTEUR :</div>
              ${issuerLines.map((line, i) => `<div ${i === 0 ? 'class="bold" style="font-size: 14px; margin-bottom: 4px;"' : 'style="margin-bottom: 2px;"'}>${line}</div>`).join('')}
            </td>
            <td style="width: 50%; vertical-align: top; text-align: right; padding-left: 20px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 8px; font-size: 11px; letter-spacing: 0.5px;">DESTINATAIRE :</div>
              ${recipientLines.map((line, i) => `<div ${i === 0 ? 'class="bold" style="font-size: 14px; margin-bottom: 4px;"' : 'style="margin-bottom: 2px;"'}>${line}</div>`).join('')}
            </td>
          </tr>
        </table>

        <!-- Product Lines Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #333;">
              <th class="bold" style="text-align: left; padding: 10px 8px; font-size: 12px; width: 45%;">Description</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 12px; width: 20%;">Prix Unitaire</th>
              <th class="bold" style="text-align: center; padding: 10px 8px; font-size: 12px; width: 15%;">Quantité</th>
              <th class="bold" style="text-align: right; padding: 10px 8px; font-size: 12px; width: 20%;">Total</th>
            </tr>
          </thead>
          <tbody>${lineItemsHtml}</tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; margin-bottom: 30px; border-collapse: collapse;">
          <tr>
            <td style="width: 55%; vertical-align: top; padding-right: 20px; font-size: 12px;">
              <div class="bold" style="text-transform: uppercase; margin-bottom: 10px; font-size: 13px;">CONDITIONS :</div>
              <div style="margin-top: 10px; font-size: 10px; color: #6b7280; line-height: 1.4;">
                Ce devis est valable jusqu'au ${new Date(devis.validUntil).toLocaleDateString('fr-FR')}.<br/>
                Veuillez le retourner signé avec la mention "Bon pour accord".
              </div>
            </td>
            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TOTAL HT :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(devis.amountHT)}</td>
                </tr>
                <tr>
                  <td class="bold" style="padding: 6px 0; text-align: right; padding-right: 15px;">TVA (${devis.tvaRate}%) :</td>
                  <td style="padding: 6px 0; text-align: right; white-space: nowrap;">${formatAmount(devis.amountTVA)}</td>
                </tr>
                <tr style="border-top: 2px solid #333;">
                  <td class="bold" style="padding: 12px 0 6px 0; text-align: right; padding-right: 15px; font-size: 15px;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 12px 0 6px 0; text-align: right; font-size: 17px; white-space: nowrap;">${formatAmount(devis.amountTTC)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        ${devis.notes ? `<div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #6b7280;"><strong style="color: #111827;">Note :</strong> ${devis.notes}</div>` : ''}

      </div>
    </body>
    </html>`;
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
