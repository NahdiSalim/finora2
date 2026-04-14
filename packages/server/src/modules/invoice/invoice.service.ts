import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import * as puppeteer from 'puppeteer';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  /**
   * Create a new invoice and generate PDF
   */
  async createInvoice(userId: number, userCompanyId: number, dto: CreateInvoiceDto) {
    // Invoices can only be created by clients for now
    // Calculate amounts
    const amounts = this.calculateAmounts(dto);

    // Generate invoice number
    const invoiceNumber = await this.generateInvoiceNumber(userCompanyId);

    // Create invoice in database
    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        status: dto.status || 'draft',
        dueDate: new Date(dto.dueDate),
        vatRate: dto.vatRate,
        discountType: dto.discountType || null,
        discountValue: dto.discountValue || null,
        subtotal: amounts.subtotal,
        discountAmount: amounts.discountAmount,
        vatAmount: amounts.vatAmount,
        total: amounts.total,
        amountPaid: 0,
        remainingAmount: amounts.total,
        notes: dto.notes || null,
        clientName: dto.clientName || null,
        clientAddress: dto.clientAddress || null,
        companyId: userCompanyId,
        createdById: userId,
        lines: {
          create: dto.lines.map((line, index) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: this.round(line.quantity * line.unitPrice),
            order: index,
          })),
        },
      },
    });

    // Generate and upload PDF synchronously
    try {
      await this.generateAndUploadPdf(invoice.id, userCompanyId);
      this.logger.log(`PDF generated successfully for invoice ${invoice.id}`);
    } catch (err) {
      this.logger.error(`Failed to generate PDF for invoice ${invoice.id}:`, err);
      // Don't throw error - invoice is still created, PDF can be regenerated later
    }

    // Fetch updated invoice with PDF URL
    const updatedInvoice = await this.prisma.invoice.findUnique({
      where: { id: invoice.id },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    return {
      status: 'success',
      code: '201',
      data: updatedInvoice || invoice,
      message: 'Invoice created successfully',
    };
  }

  /**
   * Get all invoices for a company with filters
   */
  async getInvoicesList(
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
        { invoiceNumber: { contains: search.trim(), mode: 'insensitive' } },
        { notes: { contains: search.trim(), mode: 'insensitive' } },
        { clientName: { contains: search.trim(), mode: 'insensitive' } },
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

    const [totalCount, invoicesList] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lines: { orderBy: { order: 'asc' } },
          createdBy: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
      }),
    ]);

    // Generate presigned URLs for all PDFs (if they exist in documents)
    const invoicesListWithUrls = await Promise.all(
      invoicesList.map(async (invoice) => {
        let pdfUrl: string | undefined;

        // Try to find the document by looking up through documentId
        if (invoice.documentId) {
          try {
            const document = await this.prisma.document.findUnique({
              where: { id: invoice.documentId },
              select: { url: true },
            });
            if (document?.url) {
              pdfUrl = await this.minioService.getPresignedUrl(document.url);
            }
          } catch (error) {
            this.logger.warn(`Failed to generate presigned URL for invoice ${invoice.id}`);
          }
        }

        return {
          ...invoice,
          vatRate: Number(invoice.vatRate),
          discountValue: invoice.discountValue ? Number(invoice.discountValue) : null,
          subtotal: Number(invoice.subtotal),
          discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : null,
          vatAmount: Number(invoice.vatAmount),
          total: Number(invoice.total),
          amountPaid: Number(invoice.amountPaid),
          remainingAmount: Number(invoice.remainingAmount),
          lines: invoice.lines.map((line: any) => ({
            ...line,
            quantity: Number(line.quantity),
            unitPrice: Number(line.unitPrice),
            lineTotal: Number(line.lineTotal),
          })),
          pdfUrl,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limit);

    return {
      status: 'success',
      code: '200',
      data: invoicesListWithUrls,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(id: number, userCompanyId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { order: 'asc' } },
        createdBy: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (invoice.companyId !== userCompanyId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Generate presigned URL for PDF if exists
    let pdfUrl: string | undefined;
    if (invoice.documentId) {
      try {
        const document = await this.prisma.document.findUnique({
          where: { id: invoice.documentId },
          select: { url: true },
        });
        if (document?.url) {
          pdfUrl = await this.minioService.getPresignedUrl(document.url);
        }
      } catch (error) {
        this.logger.warn(`Failed to generate presigned URL for invoice ${id}`);
      }
    }

    return {
      status: 'success',
      code: '200',
      data: {
        ...invoice,
        vatRate: Number(invoice.vatRate),
        discountValue: invoice.discountValue ? Number(invoice.discountValue) : null,
        subtotal: Number(invoice.subtotal),
        discountAmount: invoice.discountAmount ? Number(invoice.discountAmount) : null,
        vatAmount: Number(invoice.vatAmount),
        total: Number(invoice.total),
        amountPaid: Number(invoice.amountPaid),
        remainingAmount: Number(invoice.remainingAmount),
        lines: invoice.lines.map((line: any) => ({
          ...line,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          lineTotal: Number(line.lineTotal),
        })),
        pdfUrl,
      },
    };
  }

  /**
   * Update invoice
   */
  async updateInvoice(id: number, userCompanyId: number, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!invoice) {
      throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (invoice.companyId !== userCompanyId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Recalculate amounts if lines or discount changed
    let amounts: any = {};
    if (
      dto.lines ||
      dto.discountType !== undefined ||
      dto.discountValue !== undefined ||
      dto.vatRate !== undefined
    ) {
      const dataForCalculation = {
        lines:
          dto.lines ||
          invoice.lines.map((l: any) => ({
            description: l.description,
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
          })),
        discountType: dto.discountType || invoice.discountType || 'percentage',
        discountValue:
          dto.discountValue !== undefined
            ? dto.discountValue
            : invoice.discountValue
              ? Number(invoice.discountValue)
              : 0,
        vatRate: dto.vatRate !== undefined ? dto.vatRate : Number(invoice.vatRate),
      } as any;

      amounts = this.calculateAmounts(dataForCalculation);
    }

    // Delete existing lines if new lines provided
    if (dto.lines) {
      await this.prisma.invoiceLine.deleteMany({
        where: { invoiceId: id },
      });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.dueDate && { dueDate: new Date(dto.dueDate) }),
        ...(dto.vatRate !== undefined && { vatRate: dto.vatRate }),
        ...(dto.discountType && { discountType: dto.discountType }),
        ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.clientName !== undefined && { clientName: dto.clientName }),
        ...(dto.clientAddress !== undefined && { clientAddress: dto.clientAddress }),
        ...(amounts.subtotal !== undefined && {
          subtotal: amounts.subtotal,
          discountAmount: amounts.discountAmount,
          vatAmount: amounts.vatAmount,
          total: amounts.total,
          remainingAmount: amounts.total,
        }),
        ...(dto.lines && {
          lines: {
            create: dto.lines.map((line, index) => ({
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: this.round(line.quantity * line.unitPrice),
              order: index,
            })),
          },
        }),
      },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    // Regenerate PDF synchronously if content changed
    if (dto.lines || dto.status || dto.notes || dto.vatRate !== undefined) {
      try {
        await this.generateAndUploadPdf(id, invoice.companyId);
        this.logger.log(`PDF regenerated successfully for invoice ${id}`);
      } catch (err) {
        this.logger.error(`Failed to regenerate PDF for invoice ${id}:`, err);
      }
    }

    // Fetch updated invoice
    const finalInvoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    return {
      status: 'success',
      code: '200',
      data: finalInvoice || updated,
      message: 'Invoice updated successfully',
    };
  }

  /**
   * Delete invoice
   */
  async deleteInvoice(id: number, userCompanyId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (invoice.companyId !== userCompanyId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    // Delete PDF from MinIO and document entry
    if (invoice.documentId) {
      try {
        const document = await this.prisma.document.findUnique({
          where: { id: invoice.documentId },
          select: { url: true },
        });

        if (document?.url) {
          await this.minioService.deleteFile(document.url);
        }

        // Mark document as deleted
        await this.prisma.document.update({
          where: { id: invoice.documentId },
          data: { status: 'deleted' },
        });
      } catch (error) {
        this.logger.warn(`Failed to delete PDF for invoice ${id}`);
      }
    }

    // Delete invoice from database (cascade will delete lines)
    await this.prisma.invoice.delete({
      where: { id },
    });

    return {
      status: 'success',
      code: '200',
      message: 'Invoice deleted successfully',
    };
  }

  /**
   * Download invoice PDF
   */
  async downloadInvoicePdf(id: number, userCompanyId: number) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    }

    // Check access
    if (invoice.companyId !== userCompanyId) {
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    }

    if (!invoice.documentId) {
      throw new ApiError('PDF not found', 404, 'PDF_NOT_FOUND');
    }

    const document = await this.prisma.document.findUnique({
      where: { id: invoice.documentId },
      select: { url: true },
    });

    if (!document?.url) {
      throw new ApiError('PDF not found', 404, 'PDF_NOT_FOUND');
    }

    const stream = await this.minioService.getFileStream(document.url);

    return {
      stream,
      filename: `${invoice.invoiceNumber}.pdf`,
      mimeType: 'application/pdf',
    };
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate amounts (subtotal, discount, VAT, total)
   */
  private calculateAmounts(dto: {
    lines: any[];
    discountType?: string;
    discountValue?: number;
    vatRate: number;
  }) {
    const subtotal = dto.lines.reduce((acc, line) => acc + line.quantity * line.unitPrice, 0);

    let discount = 0;
    if (dto.discountType && dto.discountValue && dto.discountValue > 0) {
      discount =
        dto.discountType === 'percentage'
          ? (subtotal * dto.discountValue) / 100
          : dto.discountValue;
    }

    const amountAfterDiscount = Math.max(subtotal - discount, 0);
    const vatAmount = (amountAfterDiscount * dto.vatRate) / 100;
    const total = amountAfterDiscount + vatAmount;

    return {
      subtotal: this.round(subtotal),
      discountAmount: this.round(discount),
      vatAmount: this.round(vatAmount),
      total: this.round(total),
    };
  }

  /**
   * Generate unique invoice number
   */
  private async generateInvoiceNumber(companyId: number): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();

    const prefix = `FAC-${year}-`;

    const latest = await this.prisma.invoice.findFirst({
      where: {
        companyId,
        invoiceNumber: { startsWith: prefix },
      },
      orderBy: { invoiceNumber: 'desc' },
      select: { invoiceNumber: true },
    });

    let nextSequence = 1;
    if (latest) {
      const parts = latest.invoiceNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) {
        nextSequence = lastSeq + 1;
      }
    }

    const sequence = String(nextSequence).padStart(3, '0');
    return `${prefix}${sequence}`;
  }

  /**
   * Generate PDF from invoice data and upload to MinIO + save in Documents
   */
  private async generateAndUploadPdf(invoiceId: number, companyId: number): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lines: { orderBy: { order: 'asc' } },
        createdBy: true,
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
          },
        },
      },
    });

    if (!invoice) {
      throw new Error(`Invoice ${invoiceId} not found`);
    }

    // Build HTML template
    const html = this.buildInvoiceHtml(invoice);

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

      // Get or create folder structure: factures/YYYY-MM-DD/
      const dateFolder = await this.ensureFactureFolderStructure(
        companyId,
        invoice.createdById,
        invoice.createdAt
      );

      // Upload PDF to MinIO in date-specific folder
      const fileName = `${invoice.invoiceNumber}.pdf`;
      const folderPath = await this.buildFolderPath(dateFolder.id);
      const objectName = await this.minioService.uploadFile(companyId, folderPath, {
        originalname: fileName,
        buffer: Buffer.from(pdfBuffer),
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
      } as Express.Multer.File);

      // Create Document entry in database
      const document = await this.prisma.document.create({
        data: {
          name: fileName,
          type: 'pdf',
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
          url: objectName,
          category: 'facture',
          ownerId: invoice.createdById,
          companyId: companyId,
          createdBy: invoice.createdById,
          createdByCompanyId: companyId,
          parentId: dateFolder.id,
          isFolder: false,
          status: 'active',
        },
      });

      // Update invoice with documentId link
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { documentId: document.id },
      });

      this.logger.log(`PDF generated and saved for invoice ${invoiceId} in documents folder`);
    } finally {
      await browser.close();
    }
  }

  /**
   * Ensure folder structure exists: factures/YYYY-MM-DD/
   */
  private async ensureFactureFolderStructure(
    companyId: number,
    ownerId: number,
    createdAt: Date
  ): Promise<any> {
    // 1. Find or create root "factures" folder
    let facturesFolder = await this.prisma.document.findFirst({
      where: {
        companyId: companyId,
        name: 'factures',
        isFolder: true,
        parentId: null,
        status: 'active',
      },
    });

    if (!facturesFolder) {
      facturesFolder = await this.prisma.document.create({
        data: {
          name: 'factures',
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
      this.logger.log(`Created factures root folder for company ${companyId}`);
    }

    // 2. Find or create date folder (YYYY-MM-DD)
    const dateString = this.formatDate(createdAt);
    let dateFolder = await this.prisma.document.findFirst({
      where: {
        companyId: companyId,
        name: dateString,
        isFolder: true,
        parentId: facturesFolder.id,
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
          parentId: facturesFolder.id,
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
  private buildInvoiceHtml(invoice: any): string {
    const formatAmount = (value: number) =>
      new Intl.NumberFormat('fr-FR', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value) + ' DT';

    const lines = (invoice.lines as any[]) || [];
    const lineItemsHtml = lines
      .map(
        (line) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 8px; font-size: 12px; width: 45%; word-wrap: break-word;">${line.description}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(Number(line.unitPrice))}</td>
        <td style="padding: 12px 8px; text-align: center; font-size: 12px; width: 15%;">${Number(line.quantity)}</td>
        <td style="padding: 12px 8px; text-align: right; font-weight: bold; font-size: 12px; width: 20%; white-space: nowrap;">${formatAmount(Number(line.lineTotal))}</td>
      </tr>
    `
      )
      .join('');

    const statusLabels: Record<string, string> = {
      draft: 'BROUILLON',
      sent: 'ENVOYÉE',
      paid: 'PAYÉE',
      partial: 'PARTIELLEMENT PAYÉE',
      overdue: 'EN RETARD',
      cancelled: 'ANNULÉE',
    };

    const statusColors: Record<string, string> = {
      draft: '#94A3B8',
      sent: '#3B82F6',
      paid: '#10B981',
      partial: '#F59E0B',
      overdue: '#EF4444',
      cancelled: '#64748B',
    };

    return `
    <!DOCTYPE html>
    <html lang="fr">
    <head>
        <meta charset="UTF-8">
        <title>Facture ${invoice.invoiceNumber}</title>
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
              <h1 class="heavy" style="font-size: 48px; text-transform: uppercase; margin: 0; padding: 0; line-height: 1; color: #10B981;">FACTURE</h1>
            </td>
            <td style="width: 40%; text-align: right; vertical-align: middle;">
              <div class="bold" style="font-size: 15px; margin-bottom: 8px;">FACTURE N° : ${invoice.invoiceNumber}</div>
              <div style="display: inline-block; padding: 6px 16px; background-color: ${statusColors[invoice.status]}; color: white; border-radius: 20px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;">
                ${statusLabels[invoice.status] || invoice.status}
              </div>
            </td>
          </tr>
        </table>

        <!-- Company and Client Info -->
        <table style="width: 100%; margin-bottom: 20px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top; padding-right: 20px;">
              <div class="bold" style="font-size: 10px; text-transform: uppercase; margin-bottom: 8px; color: #64748B;">ÉMETTEUR :</div>
              ${
                invoice.company
                  ? `
              <div class="bold" style="font-size: 13px; margin-bottom: 4px;">${invoice.company.legalName || invoice.company.name}</div>
              ${invoice.company.address ? `<div style="font-size: 11px; margin-bottom: 2px;">${invoice.company.address}</div>` : ''}
              ${invoice.company.city || invoice.company.postalCode ? `<div style="font-size: 11px; margin-bottom: 2px;">${[invoice.company.postalCode, invoice.company.city].filter(Boolean).join(' ')}</div>` : ''}
              ${invoice.company.phone ? `<div style="font-size: 11px; margin-bottom: 2px;">Tél : ${invoice.company.phone}</div>` : ''}
              ${invoice.company.email ? `<div style="font-size: 11px; margin-bottom: 2px;">${invoice.company.email}</div>` : ''}
              ${invoice.company.vatNumber ? `<div style="font-size: 11px;">N° TVA : ${invoice.company.vatNumber}</div>` : ''}
              `
                  : '<div style="font-size: 11px;">—</div>'
              }
            </td>
            <td style="width: 50%; vertical-align: top; padding-left: 20px;">
              <div class="bold" style="font-size: 10px; text-transform: uppercase; margin-bottom: 8px; color: #64748B;">DESTINATAIRE :</div>
              <div class="bold" style="font-size: 13px; margin-bottom: 4px;">${invoice.clientName || 'Non spécifié'}</div>
              ${invoice.clientAddress ? `<div style="font-size: 11px; line-height: 1.5;">${invoice.clientAddress}</div>` : ''}
            </td>
          </tr>
        </table>

        <!-- Dates -->
        <table style="width: 100%; margin-bottom: 20px; font-size: 13px; border-collapse: collapse;">
          <tr>
            <td style="width: 50%; vertical-align: top;">
              <div><span class="bold">DATE D'ÉMISSION :</span> ${new Date(invoice.createdAt).toLocaleDateString('fr-FR')}</div>
              <div><span class="bold">DATE D'ÉCHÉANCE :</span> ${new Date(invoice.dueDate).toLocaleDateString('fr-FR')}</div>
            </td>
          </tr>
        </table>

        <!-- Divider -->
        <div style="border-top: 2px solid #10B981; margin-bottom: 25px;"></div>

        <!-- Product Lines Table -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
          <thead>
            <tr style="border-bottom: 2px solid #10B981; background: linear-gradient(to bottom, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.04));">
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
            <td style="width: 55%; vertical-align: top; padding-right: 20px;">
              ${
                invoice.notes
                  ? `
              <div class="bold" style="text-transform: uppercase; margin-bottom: 10px; font-size: 13px; letter-spacing: 0.5px; color: #10B981;">NOTES :</div>
              <div style="padding: 15px; background-color: #F3F4F6; border-left: 4px solid #10B981; border-radius: 4px; line-height: 1.6; font-size: 11px; color: #374151;">
                ${invoice.notes}
              </div>
              `
                  : ''
              }
            </td>

            <td style="width: 45%; vertical-align: top; text-align: right; padding-left: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 13px; background: linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%); padding: 20px; border-radius: 8px; border: 2px solid rgba(16, 185, 129, 0.2);">
                <tr>
                  <td class="bold" style="padding: 8px 0; text-align: right; padding-right: 20px; color: #374151;">SOUS-TOTAL HT :</td>
                  <td style="padding: 8px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatAmount(Number(invoice.subtotal))}</td>
                </tr>
                ${
                  invoice.discountAmount && Number(invoice.discountAmount) > 0
                    ? `
                <tr>
                  <td class="bold" style="padding: 8px 0; text-align: right; padding-right: 20px; color: #374151;">REMISE :</td>
                  <td style="padding: 8px 0; text-align: right; white-space: nowrap; font-weight: 600;">- ${formatAmount(Number(invoice.discountAmount))}</td>
                </tr>
                `
                    : ''
                }
                <tr>
                  <td class="bold" style="padding: 8px 0; text-align: right; padding-right: 20px; color: #374151;">TVA (${Number(invoice.vatRate)}%) :</td>
                  <td style="padding: 8px 0; text-align: right; white-space: nowrap; font-weight: 600;">${formatAmount(Number(invoice.vatAmount))}</td>
                </tr>
                <tr style="border-top: 2px solid #10B981;">
                  <td class="bold" style="padding: 15px 0 8px 0; text-align: right; padding-right: 20px; font-size: 16px; color: #10B981;">TOTAL TTC :</td>
                  <td class="heavy" style="padding: 15px 0 8px 0; text-align: right; font-size: 20px; white-space: nowrap; color: #10B981;">${formatAmount(Number(invoice.total))}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #E5E7EB; text-align: center; font-size: 10px; color: #64748B;">
          <div>Document généré le ${new Date().toLocaleDateString('fr-FR')}</div>
          <div style="margin-top: 4px;">Merci pour votre confiance</div>
        </div>

      </div>
    </body>
    </html>
  `;
  }

  /** Round to 2 decimal places */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
