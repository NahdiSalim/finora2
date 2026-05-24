import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { resolveTemplate } from '../../common/utils/invoice-template.util';
import * as puppeteer from 'puppeteer';

@Injectable()
export class InvoiceService {
  private readonly logger = new Logger(InvoiceService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  // ==================== CRUD ====================

  async createInvoice(userId: number, userCompanyId: number, dto: CreateInvoiceDto) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
    if (!supplier) throw new ApiError('Supplier not found', 404, 'SUPPLIER_NOT_FOUND');
    if (supplier.companyId !== userCompanyId)
      throw new ApiError('Supplier does not belong to your company', 403, 'ACCESS_DENIED');

    const amounts = this.calculateAmounts(dto);
    const amountPaid = dto.amountPaid ?? 0;
    const remainingAmount = amounts.total - amountPaid;

    let invoice: any;
    try {
      invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber: dto.invoiceNumber,
          status: dto.status || 'draft',
          dueDate: new Date(dto.dueDate),
          vatRate: dto.vatRate,
          discountType: dto.discountType || null,
          discountValue: dto.discountValue || null,
          subtotal: amounts.subtotal,
          discountAmount: amounts.discountAmount,
          vatAmount: amounts.vatAmount,
          total: amounts.total,
          amountPaid,
          remainingAmount,
          notes: dto.notes || null,
          supplierId: dto.supplierId,
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
        include: { lines: { orderBy: { order: 'asc' } } },
      });
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new ApiError(
          'Ce numéro de facture existe déjà pour votre entreprise',
          400,
          'DUPLICATE_INVOICE_NUMBER'
        );
      }
      throw error;
    }

    // Generate PDF asynchronously for non-draft invoices
    if ((dto.status || 'draft') !== 'draft') {
      this.generateAndSavePdf(invoice.id, userCompanyId).catch((err) =>
        this.logger.error(`PDF generation failed for invoice ${invoice.id}: ${err.message}`)
      );
    }

    return {
      status: 'success',
      code: '201',
      data: invoice,
      message: 'Invoice created successfully',
    };
  }

  async getInvoicesList(
    userCompanyId: number,
    page: number = 1,
    limit: number = 10,
    status?: string,
    search?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const skip = (page - 1) * limit;

    const baseWhere: any = { companyId: userCompanyId };

    if (search && search.trim()) {
      baseWhere.OR = [
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
      baseWhere.createdAt = {};
      if (startDate) baseWhere.createdAt.gte = startDate;
      if (endDate) baseWhere.createdAt.lte = endDate;
    }

    const where: any = { ...baseWhere };
    if (status) {
      const statuses = status
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      where.status = statuses.length === 1 ? statuses[0] : { in: statuses };
    }

    const [
      totalCount,
      invoicesList,
      countDraft,
      countReview,
      countSent,
      countPaid,
      countPartial,
      countOverdue,
      countCancelled,
      analyticsRaw,
    ] = await Promise.all([
      this.prisma.invoice.count({ where }),
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          lines: { orderBy: { order: 'asc' } },
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
        },
      }) as Promise<any[]>,
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'draft' } }),
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'review' } }),
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'sent' } }),
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'paid' } }),
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'partial' } }),
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'overdue' } }),
      this.prisma.invoice.count({ where: { ...baseWhere, status: 'cancelled' } }),
      this.prisma.invoice.aggregate({
        where: { companyId: userCompanyId },
        _sum: { total: true, amountPaid: true, remainingAmount: true },
        _count: { id: true },
      }),
    ]);

    const analytics = {
      totalInvoices: analyticsRaw._count.id,
      totalRevenue: this.round(Number(analyticsRaw._sum.total ?? 0)),
      totalPaid: this.round(Number(analyticsRaw._sum.amountPaid ?? 0)),
      totalRemaining: this.round(Number(analyticsRaw._sum.remainingAmount ?? 0)),
      counts: {
        draft: countDraft,
        review: countReview,
        sent: countSent,
        paid: countPaid,
        partial: countPartial,
        overdue: countOverdue,
        cancelled: countCancelled,
      },
    };

    // Generate presigned URLs for supplier logos + company logo
    const invoicesListWithUrls = await Promise.all(
      invoicesList.map(async (invoice) => {
        let supplierLogoUrl: string | undefined;
        if ((invoice.supplier as any)?.logoUrl) {
          try {
            supplierLogoUrl = await this.minioService.getPresignedUrl(
              (invoice.supplier as any).logoUrl
            );
          } catch {
            supplierLogoUrl = (invoice.supplier as any).logoUrl;
          }
        }

        let companyLogoUrl: string | undefined;
        if ((invoice.company as any)?.logo) {
          try {
            companyLogoUrl = await this.minioService.getPresignedUrl(
              (invoice.company as any).logo,
              7 * 24 * 60 * 60
            );
          } catch {
            companyLogoUrl = undefined;
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
          supplier: invoice.supplier ? { ...invoice.supplier, logoUrl: supplierLogoUrl } : null,
          company: invoice.company
            ? { ...invoice.company, logoUrl: companyLogoUrl, logo: undefined }
            : null,
        };
      })
    );

    return {
      status: 'success',
      code: '200',
      data: invoicesListWithUrls,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limitPerPage: limit,
        totalCount,
      },
      counts: analytics.counts,
      analytics,
    };
  }

  async getInvoice(id: number, userCompanyId: number) {
    const invoice = (await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        lines: { orderBy: { order: 'asc' } },
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
      },
    })) as any;

    if (!invoice) throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.companyId !== userCompanyId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

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
      },
    };
  }

  async updateInvoice(id: number, userCompanyId: number, dto: UpdateInvoiceDto) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: { lines: true },
    });

    if (!invoice) throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.companyId !== userCompanyId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

    let amounts: any = {};
    if (
      dto.lines ||
      dto.discountType !== undefined ||
      dto.discountValue !== undefined ||
      dto.vatRate !== undefined
    ) {
      amounts = this.calculateAmounts({
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
      } as any);
    }

    if (dto.lines) {
      await this.prisma.invoiceLine.deleteMany({ where: { invoiceId: id } });
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
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(dto.amountPaid !== undefined && {
          amountPaid: dto.amountPaid,
          remainingAmount: (amounts.total ?? Number(invoice.total)) - dto.amountPaid,
        }),
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

    return {
      status: 'success',
      code: '200',
      data: updated,
      message: 'Invoice updated successfully',
    };
  }

  async deleteInvoice(id: number, userCompanyId: number) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.companyId !== userCompanyId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');

    await this.prisma.invoice.delete({ where: { id } });

    return { status: 'success', code: '200', message: 'Invoice deleted successfully' };
  }

  async publishInvoice(id: number, userCompanyId: number, newStatus: string) {
    const invoice = await this.prisma.invoice.findUnique({ where: { id } });
    if (!invoice) throw new ApiError('Invoice not found', 404, 'NOT_FOUND');
    if (invoice.companyId !== userCompanyId)
      throw new ApiError('Access denied', 403, 'ACCESS_DENIED');
    if (invoice.status !== 'draft')
      throw new ApiError('Only draft invoices can be published', 400, 'INVALID_STATUS');
    if (!['sent', 'overdue'].includes(newStatus))
      throw new ApiError('Invalid target status', 400, 'INVALID_STATUS');

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: newStatus },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    // Generate PDF now that invoice is published
    this.generateAndSavePdf(id, userCompanyId).catch((err) =>
      this.logger.error(`PDF generation failed for invoice ${id}: ${err.message}`)
    );

    return {
      status: 'success',
      code: '200',
      data: updated,
      message: 'Invoice published successfully',
    };
  }

  // ==================== HELPERS ====================

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

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  // ==================== PDF GENERATION ====================

  /**
   * Generate PDF using Puppeteer and save to MinIO under factures/YYYY-MM-DD/
   * Runs asynchronously — does not block the API response.
   */
  private async generateAndSavePdf(invoiceId: number, companyId: number): Promise<void> {
    const invoice = (await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        lines: { orderBy: { order: 'asc' } },
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
    })) as any;

    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

    const html = await this.buildHtml(invoice);

    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--allow-running-insecure-content',
      ],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' },
      });

      // Ensure folder structure: factures/YYYY-MM/supplier/
      const dateFolder = await this.ensureFolderStructure(
        companyId,
        invoice.createdById,
        invoice.createdAt,
        invoice.supplier as { name: string; company: string } | null
      );
      const folderPath = await this.buildFolderPath(dateFolder.id);
      const fileName = `${invoice.invoiceNumber}.pdf`;

      const objectName = await this.minioService.uploadFile(companyId, folderPath, {
        originalname: fileName,
        buffer: Buffer.from(pdfBuffer),
        size: pdfBuffer.length,
        mimetype: 'application/pdf',
      } as Express.Multer.File);

      const document = await this.prisma.document.create({
        data: {
          name: fileName,
          type: 'pdf',
          mimeType: 'application/pdf',
          size: pdfBuffer.length,
          url: objectName,
          category: 'facture',
          ownerId: invoice.createdById,
          companyId,
          createdBy: invoice.createdById,
          createdByCompanyId: companyId,
          parentId: dateFolder.id,
          isFolder: false,
          status: 'active',
        },
      });

      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { documentId: document.id },
      });

      this.logger.log(`PDF saved for invoice ${invoiceId}`);
    } finally {
      await browser.close();
    }
  }

  /** Build the HTML template — mirrors FactureTemplate.tsx on the frontend */
  private async buildHtml(invoice: any): Promise<string> {
    const fmt = (v: number) =>
      new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        v
      ) + ' DT';

    // Issuer (client company)
    const issuerLines: string[] = [];
    if (invoice.company) {
      if (invoice.company.legalName || invoice.company.name)
        issuerLines.push(invoice.company.legalName || invoice.company.name);
      if (invoice.company.address) issuerLines.push(invoice.company.address);
      if (invoice.company.city || invoice.company.postalCode)
        issuerLines.push(
          [invoice.company.postalCode, invoice.company.city].filter(Boolean).join(' ')
        );
      if (invoice.company.phone) issuerLines.push('Tél : ' + invoice.company.phone);
      if (invoice.company.email) issuerLines.push(invoice.company.email);
      if (invoice.company.vatNumber) issuerLines.push('N° TVA : ' + invoice.company.vatNumber);
    }

    // Recipient (supplier)
    const recipientLines: string[] = [];
    if (invoice.supplier) {
      if (invoice.supplier.name) recipientLines.push(invoice.supplier.name);
      if (invoice.supplier.company) recipientLines.push(invoice.supplier.company);
      if (invoice.supplier.address) recipientLines.push(invoice.supplier.address);
      if (invoice.supplier.email) recipientLines.push('Email : ' + invoice.supplier.email);
      if (invoice.supplier.phone) recipientLines.push('Tél : ' + invoice.supplier.phone);
      if (invoice.supplier.taxId) recipientLines.push('Matricule : ' + invoice.supplier.taxId);
    }

    // Company logo — fetch via MinIO SDK and embed as base64 data URI
    // (Puppeteer cannot reach the MinIO HTTP endpoint from the server process)
    const emetteurName = invoice.company?.legalName || invoice.company?.name || 'Émetteur';
    let logoImgTag = '';
    if (invoice.company?.logo) {
      try {
        const buf = await this.minioService.downloadFile(invoice.company.logo);
        const ext = invoice.company.logo.split('.').pop()?.toLowerCase() ?? 'png';
        const mime: Record<string, string> = {
          png: 'image/png',
          jpg: 'image/jpeg',
          jpeg: 'image/jpeg',
          gif: 'image/gif',
          webp: 'image/webp',
          svg: 'image/svg+xml',
        };
        const dataUri = `data:${mime[ext] ?? 'image/png'};base64,${buf.toString('base64')}`;
        logoImgTag = `<img src="${dataUri}" alt="${emetteurName}" style="height:50px;max-width:200px;object-fit:contain;"/>`;
      } catch {
        // fallback to company name text
      }
    }

    const ht = Number(invoice.subtotal);
    const tva = Number(invoice.vatAmount);
    const ttc = Number(invoice.total);
    const rate = Number(invoice.vatRate);
    const dateCreated = new Date(invoice.createdAt).toLocaleDateString('fr-FR');
    const dateDue = new Date(invoice.dueDate).toLocaleDateString('fr-FR');
    const hasDiscount = invoice.discountAmount && Number(invoice.discountAmount) > 0;

    const templateId = resolveTemplate(invoice.company?.invoiceTemplate);

    // ── Moderne ───────────────────────────────────────────────────────────────
    if (templateId === 'moderne') {
      const logoHtml =
        logoImgTag ||
        `<span style="color:rgba(255,255,255,0.9);font-size:16px;font-weight:700">${emetteurName}</span>`;
      const discountRowHtml = hasDiscount
        ? `<tr><td style="padding:4px 16px 4px 0;text-align:right;color:#6366f1;font-size:12px">Remise${invoice.discountType === 'percentage' ? ` (${invoice.discountValue}%)` : ''}</td><td style="padding:4px 0;text-align:right;font-weight:600;font-size:12px;white-space:nowrap;color:#1e293b">- ${fmt(Number(invoice.discountAmount))}</td></tr>`
        : '';
      const linesHtml = (invoice.lines as any[])
        .map(
          (l, i) =>
            `<tr class="${i % 2 === 0 ? 'odd' : 'even'}"><td>${l.description}</td><td style="text-align:center">${fmt(Number(l.unitPrice))}</td><td style="text-align:center">${Number(l.quantity)}</td><td style="text-align:right;font-weight:600">${fmt(Number(l.quantity) * Number(l.unitPrice))}</td></tr>`
        )
        .join('');
      return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1e293b;background:#f5f3ff;line-height:1.5;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:0 auto;background:#f5f3ff;width:100%}
.hdr{background:#4f46e5;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hdr td{padding:18px 40px;vertical-align:middle}
.meta{background:#3730a3;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.meta td{padding:7px 40px;font-size:11px;color:rgba(255,255,255,0.8)}
.content{padding:24px 40px 40px 40px;width:100%}
.accent-wrap{border-left:4px solid #818cf8;padding-left:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.parties{width:100%;border-collapse:collapse;margin-bottom:24px}
.plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#6366f1;margin-bottom:6px}
.pname{font-size:13px;font-weight:700;color:#1e293b;margin-bottom:3px}
.pline{font-size:11px;color:#64748b;margin-bottom:2px}
table.lines{width:100%;border-collapse:collapse;margin-bottom:20px}
table.lines thead th{background:#4f46e5;color:#fff;padding:10px 12px;font-size:11px;font-weight:600;text-align:left;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.lines tbody tr.odd{background:#eef2ff;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.lines tbody tr.even{background:#ffffff}
table.lines tbody td{padding:10px 12px;font-size:12px;border-bottom:1px solid #e0e7ff}
table.totals{width:100%;border-collapse:collapse;margin-bottom:0}
table.totals td{padding:4px 0;font-size:12px;vertical-align:middle}
table.totals td.lbl{text-align:right;padding-right:16px;color:#64748b;white-space:nowrap}
table.totals td.val{text-align:right;font-weight:600;color:#1e293b;white-space:nowrap}
table.ttc-band{width:100%;border-collapse:collapse;background:#4f46e5;margin-top:10px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ttc-band td{padding:10px 16px;color:#fff}
.notes{margin-top:24px;padding:12px 16px;background:#ede9fe;border-left:4px solid #6366f1;font-size:11px;color:#3730a3;-webkit-print-color-adjust:exact;print-color-adjust:exact}
</style></head><body><div class="page">
<table class="hdr"><tr>
<td style="width:50%;vertical-align:middle">${logoHtml}</td>
<td style="width:50%;text-align:right;vertical-align:middle"><span style="color:#fff;font-size:32px;font-weight:900;letter-spacing:3px">FACTURE</span></td>
</tr></table>
<table class="meta"><tr>
<td>N° ${invoice.invoiceNumber}</td>
<td style="text-align:right">Date : ${dateCreated} &nbsp;|&nbsp; Échéance : ${dateDue}</td>
</tr></table>
<div class="content"><div class="accent-wrap">
<table class="parties"><tr>
<td style="width:50%;vertical-align:top;padding-right:16px">
<div class="plabel">Émetteur</div>
${issuerLines.map((l, i) => `<div class="${i === 0 ? 'pname' : 'pline'}">${l}</div>`).join('')}
</td>
<td style="width:50%;vertical-align:top;padding-left:16px">
<div class="plabel">Destinataire</div>
${recipientLines.map((l, i) => `<div class="${i === 0 ? 'pname' : 'pline'}">${l}</div>`).join('')}
</td>
</tr></table>
<table class="lines"><thead><tr>
<th style="width:45%">Description</th>
<th style="text-align:center;width:20%">Prix unit.</th>
<th style="text-align:center;width:15%">Qté</th>
<th style="text-align:right;width:20%">Total</th>
</tr></thead><tbody>${linesHtml}</tbody></table>
<table style="width:100%;border-collapse:collapse;margin-bottom:0"><tr>
<td style="width:55%;vertical-align:top;padding-right:20px;font-size:12px;color:#64748b">
<strong style="color:#4f46e5;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Règlement</strong>
<div style="margin-top:6px;font-weight:700;color:#1e293b">Par virement bancaire</div>
<div style="margin-top:10px;font-size:10px;color:#94a3b8;line-height:1.5">En cas de retard de paiement, une indemnité de 10% par jour de retard sera exigible.</div>
</td>
<td style="width:45%;vertical-align:top">
<table class="totals"><tbody>
<tr><td class="lbl">Total HT</td><td class="val">${fmt(ht)}</td></tr>
<tr><td class="lbl">TVA (${rate}%)</td><td class="val">${fmt(tva)}</td></tr>
${discountRowHtml}
</tbody></table>
<table class="ttc-band"><tr>
<td style="font-weight:700;font-size:14px">Total TTC</td>
<td style="text-align:right;font-weight:800;font-size:16px;white-space:nowrap">${fmt(ttc)}</td>
</tr></table>
</td></tr></table>
${invoice.notes ? `<div class="notes"><strong>Note :</strong> ${invoice.notes}</div>` : ''}
</div></div>
</div></body></html>`;
    }

    // ── Élégante ──────────────────────────────────────────────────────────────
    if (templateId === 'elegante') {
      const logoBlockHtml = logoImgTag
        ? `<div style="text-align:center;padding-top:12px;margin-bottom:4px">${logoImgTag}</div>`
        : '';
      const discountRowHtml = hasDiscount
        ? `<tr><td style="padding:4px 16px 4px 0;text-align:right;color:#a0856d;font-size:12px">Remise${invoice.discountType === 'percentage' ? ` (${invoice.discountValue}%)` : ''}</td><td style="padding:4px 0;text-align:right;font-weight:600;font-size:12px;white-space:nowrap;color:#1c1008">- ${fmt(Number(invoice.discountAmount))}</td></tr>`
        : '';
      const linesHtml = (invoice.lines as any[])
        .map(
          (l) =>
            `<tr><td>${l.description}</td><td style="text-align:center">${fmt(Number(l.unitPrice))}</td><td style="text-align:center">${Number(l.quantity)}</td><td style="text-align:right;font-weight:700">${fmt(Number(l.quantity) * Number(l.unitPrice))}</td></tr>`
        )
        .join('');
      return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box}
body{font-family:Georgia,'Times New Roman',serif;color:#1c1008;margin:0;padding:0;font-size:12px;line-height:1.6;background:#fdf8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:0 auto;background:#fdf8f0;width:100%}
.gold-bar{height:3px;background:#c9a96e;width:100%;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.inner{padding:32px 40px 40px 40px;width:100%}
.title-block{text-align:center;margin-bottom:6px}
.title-block h1{font-family:Georgia,serif;font-size:28px;font-weight:700;letter-spacing:6px;color:#1c1008;margin:0;padding:20px 0 8px 0}
.gold-line{width:120px;height:1px;background:#c9a96e;margin:0 auto 28px auto;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.parties-table{width:100%;border-collapse:collapse;margin-bottom:32px;font-size:12px}
.plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#c9a96e;margin-bottom:6px}
.pname{font-weight:700;font-size:13px;margin-bottom:2px}
.pline{color:#6b5a3e;font-size:11px;margin-bottom:1px}
.gold-sep{height:1px;background:#c9a96e;margin-bottom:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.lines{width:100%;border-collapse:collapse}
table.lines thead tr{background:#f5ede0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.lines thead th{padding:10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#c9a96e;text-align:left;border-bottom:1px solid #c9a96e}
table.lines thead th:last-child{text-align:right}
table.lines tbody td{padding:12px 10px;font-size:12px;border-bottom:1px solid #e8dcc8}
table.lines tbody td:last-child{text-align:right;font-weight:700}
.gold-sep2{height:1px;background:#c9a96e;margin:0 0 16px 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.totals{width:100%;border-collapse:collapse}
table.totals td{padding:4px 0;font-size:12px;vertical-align:middle}
table.totals td.lbl{text-align:right;padding-right:16px;color:#a0856d;white-space:nowrap}
table.totals td.val{text-align:right;font-weight:600;color:#1c1008;white-space:nowrap}
table.ttc-band{width:100%;border-collapse:collapse;background:#c9a96e;margin-top:12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.ttc-band td{padding:10px 16px;color:#fff}
</style></head><body><div class="page">
<div class="gold-bar"></div>
<div class="inner">
${logoBlockHtml}
<div class="title-block"><h1>FACTURE</h1></div>
<div class="gold-line"></div>
<table class="parties-table"><tr>
<td style="width:34%;vertical-align:top;padding-right:12px">
<div class="plabel">Émetteur</div>
${issuerLines.map((l, i) => `<div class="${i === 0 ? 'pname' : 'pline'}">${l}</div>`).join('')}
</td>
<td style="width:34%;vertical-align:top;padding-right:12px">
<div class="plabel">Destinataire</div>
${recipientLines.map((l, i) => `<div class="${i === 0 ? 'pname' : 'pline'}">${l}</div>`).join('')}
</td>
<td style="width:32%;vertical-align:top;text-align:right">
<div class="plabel">Référence</div>
<div style="font-weight:700;font-size:14px;margin-bottom:2px">N° ${invoice.invoiceNumber}</div>
<div style="font-size:11px;color:#6b5a3e">${dateCreated}</div>
<div style="font-size:11px;color:#6b5a3e">Éch. ${dateDue}</div>
</td>
</tr></table>
<div class="gold-sep"></div>
<table class="lines"><thead><tr>
<th style="width:45%">Description</th>
<th style="text-align:center;width:20%">Prix unit.</th>
<th style="text-align:center;width:15%">Qté</th>
<th style="width:20%">Total</th>
</tr></thead><tbody>${linesHtml}</tbody></table>
<div class="gold-sep2"></div>
<table style="width:100%;border-collapse:collapse"><tr>
<td style="width:55%;vertical-align:top;padding-right:20px;font-size:12px">
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:#c9a96e;margin-bottom:8px">Règlement</div>
<div style="font-weight:700;margin-bottom:4px">Par virement bancaire</div>
<div style="margin-top:10px;font-size:10px;color:#a0856d;font-style:italic;line-height:1.5">En cas de retard de paiement, une indemnité de 10% par jour de retard sera exigible.</div>
</td>
<td style="width:45%;vertical-align:top">
<table class="totals"><tbody>
<tr><td class="lbl">Total HT</td><td class="val">${fmt(ht)}</td></tr>
<tr><td class="lbl">TVA (${rate}%)</td><td class="val">${fmt(tva)}</td></tr>
${discountRowHtml}
</tbody></table>
<table class="ttc-band"><tr>
<td style="font-weight:700;font-size:14px">Total TTC</td>
<td style="text-align:right;font-weight:800;font-size:16px;white-space:nowrap">${fmt(ttc)}</td>
</tr></table>
</td>
</tr></table>
${invoice.notes ? `<div style="margin-top:28px;font-size:11px;color:#6b5a3e;font-style:italic;border-top:1px solid #e8dcc8;padding-top:14px"><strong style="color:#1c1008">Note :</strong> ${invoice.notes}</div>` : ''}
</div></div></body></html>`;
    }

    // ── Compacte ──────────────────────────────────────────────────────────────
    if (templateId === 'compacte') {
      const logoHtml =
        logoImgTag ||
        `<span style="font-size:15px;font-weight:700;color:#e2e8f0">${emetteurName}</span>`;
      const linesHtml = (invoice.lines as any[])
        .map(
          (l, i) =>
            `<tr class="${i % 2 === 0 ? 'odd' : 'even'}"><td>${l.description}</td><td style="text-align:center">${fmt(Number(l.unitPrice))}</td><td style="text-align:center">${Number(l.quantity)}</td><td style="text-align:right;font-weight:600">${fmt(Number(l.quantity) * Number(l.unitPrice))}</td></tr>`
        )
        .join('');
      return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
*{box-sizing:border-box}
body{font-family:Arial,sans-serif;color:#1e293b;margin:0;padding:0;font-size:12px;line-height:1.5;background:#f1f5f9;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.page{max-width:800px;margin:0 auto;background:#f1f5f9;width:100%}
.hdr{background:#1e293b;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.hdr td{padding:16px 40px;vertical-align:middle}
.sub-hdr{background:#0f172a;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.sub-hdr td{padding:7px 40px;font-size:10px;color:#64748b}
.inner{padding:20px 40px 24px 40px;width:100%}
.parties{width:100%;border-collapse:collapse;margin-bottom:16px;font-size:12px}
.plabel{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#64748b;margin-bottom:4px}
.pname{font-weight:700;color:#1e293b;margin-bottom:1px}
.pline{color:#64748b;margin-bottom:1px}
table.lines{width:100%;border-collapse:collapse;font-size:12px}
table.lines thead th{background:#334155;padding:8px 10px;font-size:10px;font-weight:600;text-align:left;color:#e2e8f0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.lines thead th:last-child{text-align:right}
table.lines tbody tr.odd{background:#f8fafc;-webkit-print-color-adjust:exact;print-color-adjust:exact}
table.lines tbody tr.even{background:#fff}
table.lines tbody td{padding:7px 10px;border-bottom:1px solid #e2e8f0}
table.lines tbody td:last-child{text-align:right;font-weight:600}
.total-band{background:#0f766e;width:100%;border-collapse:collapse;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.total-band td{padding:12px 40px;color:#fff;vertical-align:top}
</style></head><body><div class="page">
<table class="hdr"><tr>
<td style="width:50%;vertical-align:middle">${logoHtml}</td>
<td style="width:50%;text-align:right">
<div style="font-size:20px;font-weight:900;color:#e2e8f0;letter-spacing:2px">FACTURE</div>
<div style="font-size:11px;color:#94a3b8;margin-top:2px">N° ${invoice.invoiceNumber}</div>
</td>
</tr></table>
<table class="sub-hdr"><tr>
<td>Date : ${dateCreated}</td>
<td style="text-align:center">Échéance : ${dateDue}</td>
<td style="text-align:right">TVA : ${rate}%</td>
</tr></table>
<div class="inner">
<table class="parties"><tr>
<td style="width:50%;vertical-align:top;padding-right:12px">
<div class="plabel">Émetteur</div>
${issuerLines.map((l, i) => `<div class="${i === 0 ? 'pname' : 'pline'}">${l}</div>`).join('')}
</td>
<td style="width:50%;vertical-align:top;padding-left:12px">
<div class="plabel">Destinataire</div>
${recipientLines.map((l, i) => `<div class="${i === 0 ? 'pname' : 'pline'}">${l}</div>`).join('')}
</td>
</tr></table>
<table class="lines"><thead><tr>
<th style="width:45%">Description</th>
<th style="text-align:center;width:20%">Prix unit.</th>
<th style="text-align:center;width:15%">Qté</th>
<th style="text-align:right;width:20%">Total</th>
</tr></thead><tbody>${linesHtml}</tbody></table>
</div>
<table class="total-band"><tr>
<td style="width:55%">
<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;color:rgba(255,255,255,0.6);margin-bottom:6px">Règlement</div>
<div style="font-weight:700;color:rgba(255,255,255,0.9)">Par virement bancaire</div>
<div style="margin-top:6px;font-size:10px;color:rgba(255,255,255,0.5);line-height:1.5">En cas de retard de paiement, une indemnité de 10% par jour de retard sera exigible.</div>
</td>
<td style="width:45%;text-align:right">
<table style="width:100%;border-collapse:collapse">
<tr><td style="padding:2px 0;text-align:right;padding-right:12px;color:rgba(255,255,255,0.7);font-size:12px">Total HT</td><td style="padding:2px 0;text-align:right;color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap">${fmt(ht)}</td></tr>
<tr><td style="padding:2px 0;text-align:right;padding-right:12px;color:rgba(255,255,255,0.7);font-size:12px">TVA (${rate}%)</td><td style="padding:2px 0;text-align:right;color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap">${fmt(tva)}</td></tr>
${hasDiscount ? `<tr><td style="padding:2px 0;text-align:right;padding-right:12px;color:rgba(255,255,255,0.7);font-size:12px">Remise</td><td style="padding:2px 0;text-align:right;color:rgba(255,255,255,0.9);font-size:12px;white-space:nowrap">- ${fmt(Number(invoice.discountAmount))}</td></tr>` : ''}
<tr style="border-top:1px solid rgba(255,255,255,0.25)">
<td style="padding:8px 12px 0 0;text-align:right;color:#fff;font-size:14px;font-weight:700">Total TTC</td>
<td style="padding:8px 0 0 0;text-align:right;color:#fff;font-size:18px;font-weight:800;white-space:nowrap">${fmt(ttc)}</td>
</tr></table>
</td></tr></table>
${invoice.notes ? `<div style="padding:14px 40px;font-size:10px;color:#475569;border-top:1px solid #cbd5e1;background:#f8fafc"><strong>Note :</strong> ${invoice.notes}</div>` : ''}
</div></body></html>`;
    }

    // ── Classique (default) ───────────────────────────────────────────────────
    const logoHtml =
      logoImgTag ||
      `<div style="font-size:20px;font-weight:700;color:#111827">${emetteurName}</div>`;
    const discountRow = hasDiscount
      ? `<tr><td class="bold" style="padding:6px 0;text-align:right;padding-right:15px;">REMISE${invoice.discountType === 'percentage' ? ` (${invoice.discountValue}%)` : ''} :</td><td style="padding:6px 0;text-align:right;white-space:nowrap;">– ${fmt(Number(invoice.discountAmount))}</td></tr>`
      : '';
    const lineItemsHtml = (invoice.lines as any[])
      .map(
        (line) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:12px 8px;font-size:12px;width:45%;word-wrap:break-word;">${line.description}</td>
        <td style="padding:12px 8px;text-align:center;font-size:12px;width:20%;white-space:nowrap;">${fmt(Number(line.unitPrice))}</td>
        <td style="padding:12px 8px;text-align:center;font-size:12px;width:15%;">${Number(line.quantity)}</td>
        <td style="padding:12px 8px;text-align:right;font-weight:bold;font-size:12px;width:20%;white-space:nowrap;">${fmt(Number(line.lineTotal))}</td>
      </tr>`
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
  body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#111827;margin:0;padding:40px;line-height:1.5;font-size:12px;}
  .bold{font-weight:700;} .heavy{font-weight:800;}
  .page-container{max-width:800px;margin:0 auto;}
</style></head>
<body><div class="page-container">
  <table style="width:100%;margin-bottom:30px;border-collapse:collapse;">
    <tr>
      <td style="width:40%;vertical-align:middle;">${logoHtml}</td>
      <td style="width:60%;text-align:right;vertical-align:middle;">
        <h1 class="heavy" style="font-size:48px;text-transform:uppercase;margin:0;line-height:1;">FACTURE</h1>
      </td>
    </tr>
  </table>
  <table style="width:100%;margin-bottom:20px;font-size:13px;border-collapse:collapse;">
    <tr>
      <td style="width:50%;vertical-align:top;">
        <div><span class="bold">DATE :</span> ${dateCreated}</div>
        <div><span class="bold">ÉCHÉANCE :</span> ${dateDue}</div>
      </td>
      <td style="width:50%;text-align:right;vertical-align:top;">
        <div class="bold" style="font-size:15px;">FACTURE N° : ${invoice.invoiceNumber}</div>
      </td>
    </tr>
  </table>
  <div style="border-top:2px solid #333;margin-bottom:25px;"></div>
  <table style="width:100%;margin-bottom:40px;font-size:12px;border-collapse:collapse;">
    <tr>
      <td style="width:50%;vertical-align:top;padding-right:20px;">
        <div class="bold" style="text-transform:uppercase;margin-bottom:8px;font-size:11px;letter-spacing:0.5px;">ÉMETTEUR :</div>
        ${issuerLines.map((l, i) => `<div ${i === 0 ? 'class="bold" style="font-size:14px;margin-bottom:4px;"' : 'style="margin-bottom:2px;"'}>${l}</div>`).join('')}
      </td>
      <td style="width:50%;vertical-align:top;text-align:right;padding-left:20px;">
        <div class="bold" style="text-transform:uppercase;margin-bottom:8px;font-size:11px;letter-spacing:0.5px;">DESTINATAIRE :</div>
        ${recipientLines.map((l, i) => `<div ${i === 0 ? 'class="bold" style="font-size:14px;margin-bottom:4px;"' : 'style="margin-bottom:2px;"'}>${l}</div>`).join('')}
      </td>
    </tr>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
    <thead><tr style="border-bottom:2px solid #333;">
      <th class="bold" style="text-align:left;padding:10px 8px;font-size:12px;width:45%;">Description</th>
      <th class="bold" style="text-align:center;padding:10px 8px;font-size:12px;width:20%;">Prix Unitaire</th>
      <th class="bold" style="text-align:center;padding:10px 8px;font-size:12px;width:15%;">Quantité</th>
      <th class="bold" style="text-align:right;padding:10px 8px;font-size:12px;width:20%;">Total</th>
    </tr></thead>
    <tbody>${lineItemsHtml}</tbody>
  </table>
  <table style="width:100%;margin-bottom:30px;border-collapse:collapse;">
    <tr>
      <td style="width:55%;vertical-align:top;padding-right:20px;font-size:12px;">
        <div class="bold" style="text-transform:uppercase;margin-bottom:10px;font-size:13px;">RÈGLEMENT :</div>
        <div style="font-size:10px;color:#6b7280;line-height:1.4;margin-top:10px;">
          En cas de retard de paiement, une indemnité de 10% par jour de retard sera exigible.
        </div>
      </td>
      <td style="width:45%;vertical-align:top;text-align:right;padding-left:20px;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr>
            <td class="bold" style="padding:6px 0;text-align:right;padding-right:15px;">TOTAL HT :</td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap;">${fmt(ht)}</td>
          </tr>
          <tr>
            <td class="bold" style="padding:6px 0;text-align:right;padding-right:15px;">TVA (${rate}%) :</td>
            <td style="padding:6px 0;text-align:right;white-space:nowrap;">${fmt(tva)}</td>
          </tr>
          ${discountRow}
          <tr style="border-top:2px solid #333;">
            <td class="bold" style="padding:12px 0 6px 0;text-align:right;padding-right:15px;font-size:15px;">TOTAL TTC :</td>
            <td class="heavy" style="padding:12px 0 6px 0;text-align:right;font-size:17px;white-space:nowrap;">${fmt(ttc)}</td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${invoice.notes ? `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:10px;color:#6b7280;"><strong style="color:#111827;">Note :</strong> ${invoice.notes}</div>` : ''}
</div></body></html>`;
  }

  private async ensureFolderStructure(
    companyId: number,
    ownerId: number,
    createdAt: Date,
    supplier?: { name: string; company: string } | null
  ): Promise<any> {
    // 1. Root "factures" folder
    let root = await this.prisma.document.findFirst({
      where: { companyId, name: 'factures', isFolder: true, parentId: null, status: 'active' },
    });
    if (!root) {
      root = await this.prisma.document.create({
        data: {
          name: 'factures',
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
    }

    // 2. Month folder: YYYY-MM
    const monthStr = createdAt.toISOString().slice(0, 7); // YYYY-MM
    let monthFolder = await this.prisma.document.findFirst({
      where: { companyId, name: monthStr, isFolder: true, parentId: root.id, status: 'active' },
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
          parentId: root.id,
          status: 'active',
        },
      });
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
    }

    return supplierFolder;
  }

  private async buildFolderPath(folderId: number): Promise<string> {
    const parts: string[] = [];
    let currentId: number | null = folderId;
    while (currentId) {
      const folder = await this.prisma.document.findUnique({
        where: { id: currentId },
        select: { name: true, parentId: true },
      });
      if (!folder) break;
      parts.unshift(folder.name);
      currentId = folder.parentId;
    }
    return parts.join('/');
  }
}
