import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateInvoiceDto, DiscountType, InvoiceStatus } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { generateInvoicePdf } from './helpers/invoice-pdf.helper';
import { DocumentService } from '../document/document.service';

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly documentService: DocumentService
  ) {}

  // ─── CREATE ───────────────────────────────────────────────────────────────────

  async create(dto: CreateInvoiceDto, userId: number) {
    // 1. Verify user exists and has a company
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true },
    });

    if (!user) {
      throw new ApiError(MSG.user.not_found, 404, 'USER_NOT_FOUND');
    }

    if (!user.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }

    const companyId = user.companyId;

    // 2. Generate unique invoice number scoped to this company
    const invoiceNumber = await this.generateInvoiceNumber(companyId);

    // 3. Guard: percentage discount cannot exceed 100 %
    if (
      dto.discountType === DiscountType.PERCENTAGE &&
      dto.discountValue != null &&
      dto.discountValue > 100
    ) {
      throw new ApiError(
        'La remise en pourcentage ne peut pas dépasser 100 %',
        400,
        'INVALID_DISCOUNT'
      );
    }

    // 4. Calculate all amounts from lines + VAT + discount
    const amounts = this.calculateAmounts(dto);

    // 5. Create invoice + nested lines in a single transaction
    try {
      const invoice = await this.prisma.invoice.create({
        data: {
          invoiceNumber,
          status: dto.status ?? 'draft',
          dueDate: new Date(dto.dueDate + 'T00:00:00.000Z'),
          vatRate: dto.vatRate,
          discountType: dto.discountType ?? null,
          discountValue: dto.discountValue ?? null,
          subtotal: amounts.subtotal,
          discountAmount: amounts.discountAmount,
          vatAmount: amounts.vatAmount,
          total: amounts.total,
          amountPaid: 0,
          remainingAmount: amounts.total,
          notes: dto.notes ?? null,
          clientName: dto.clientName,
          clientAddress: dto.clientAddress ?? null,
          companyId,
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
        include: {
          lines: { orderBy: { order: 'asc' } },
        },
      });
      return this.serialize(invoice);
    } catch (err: any) {
      if (err?.code === 'P2002') {
        throw new ApiError(
          'Conflit de numéro de facture, veuillez réessayer',
          409,
          'INVOICE_NUMBER_CONFLICT'
        );
      }
      throw err;
    }
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────────────

  async findAll(
    userId: number,
    status?: string,
    search?: string,
    page: number = 1,
    pageSize: number = 10
  ) {
    const companyId = await this.resolveCompanyId(userId);

    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const skip = (page - 1) * safePageSize;

    // Midnight UTC — the boundary used by computeStatus.
    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    /**
     * Status filter — all branches must match the FINAL business status that
     * serialize/computeStatus will return, not just the raw stored column.
     *
     * computeStatus rule: if remainingAmount > 0 AND dueDate < today
     *   → status becomes "overdue" regardless of what is stored.
     *
     * Consequences per tab:
     *   "overdue"    → stored as 'overdue' OR (not terminal + balance > 0 + past due)
     *   "draft,sent" → stored as draft/sent AND NOT effectively overdue
     *                  (must exclude invoices that computeStatus would flip to overdue)
     *   other single → exact stored match (paid, partial, cancelled are terminal /
     *                  never flipped by computeStatus so stored = displayed)
     *   undefined    → all invoices EXCEPT cancelled
     */
    const effectivelyOverdue = {
      status: { notIn: [InvoiceStatus.PAID, InvoiceStatus.CANCELLED] },
      remainingAmount: { gt: 0 },
      dueDate: { lt: todayUtc },
    };

    const statusWhere =
      status === 'overdue'
        ? {
            OR: [{ status: InvoiceStatus.OVERDUE }, effectivelyOverdue],
          }
        : status && status.includes(',')
          ? {
              // Multi-status (brouillon tab: draft + sent).
              // Exclude any invoice that computeStatus would promote to overdue.
              status: { in: status.split(',').map((s) => s.trim()) },
              NOT: effectivelyOverdue,
            }
          : status
            ? { status }
            : { status: { not: InvoiceStatus.CANCELLED } };

    const where = {
      companyId,
      ...statusWhere,
      ...(search
        ? {
            OR: [
              { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
              { notes: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [invoices, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: safePageSize,
        include: {
          lines: { orderBy: { order: 'asc' } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices.map((inv) => this.serialize(inv)),
      total,
      page,
      pageSize: safePageSize,
    };
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────────────

  async findOne(invoiceId: number, userId: number) {
    const companyId = await this.resolveCompanyId(userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    return this.serialize(invoice);
  }

  // ─── GENERATE PDF ─────────────────────────────────────────────────────────────

  async generatePdf(
    invoiceId: number,
    userId: number
  ): Promise<{ buffer: Buffer; invoiceNumber: string }> {
    // 1. Resolve company membership
    const companyId = await this.resolveCompanyId(userId);

    // 2. Fetch invoice + lines + company info in one query
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
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
          },
        },
      },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    // 3. Apply the overdue rule so the PDF reflects the live status
    const remainingAmount = Number(invoice.remainingAmount);
    const status = this.computeStatus(invoice.status, remainingAmount, invoice.dueDate);

    // 4. Build PDF
    const buffer = await generateInvoicePdf({
      invoiceNumber: invoice.invoiceNumber,
      status,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      vatRate: Number(invoice.vatRate),
      discountType: invoice.discountType,
      discountValue: invoice.discountValue != null ? Number(invoice.discountValue) : null,
      subtotal: Number(invoice.subtotal),
      discountAmount: invoice.discountAmount != null ? Number(invoice.discountAmount) : null,
      vatAmount: Number(invoice.vatAmount),
      total: Number(invoice.total),
      amountPaid: Number(invoice.amountPaid),
      remainingAmount,
      notes: invoice.notes,
      clientName: invoice.clientName,
      clientAddress: invoice.clientAddress ?? null,
      lines: invoice.lines.map((l) => ({
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        lineTotal: Number(l.lineTotal),
      })),
      company: invoice.company,
    });

    // 5. Save/update the PDF in the Documents module and link it to this invoice.
    //    - First call: creates a new Document record and writes documentId on the invoice.
    //    - Subsequent calls: overwrites the MinIO object and updates the existing record.
    const doc = await this.documentService.saveInvoicePdfDocument(
      userId,
      companyId,
      invoice.invoiceNumber,
      buffer,
      invoice.documentId ?? null
    );

    if (!invoice.documentId) {
      await this.prisma.invoice.update({
        where: { id: invoiceId },
        data: { documentId: doc.id },
      });
    }

    return { buffer, invoiceNumber: invoice.invoiceNumber };
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  async update(invoiceId: number, dto: UpdateInvoiceDto, userId: number) {
    // 1. Verify company membership
    const companyId = await this.resolveCompanyId(userId);

    // 2. Load invoice scoped to the user's company (lines needed for recalc)
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    // 3. Block edits on terminal statuses
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new ApiError(MSG.invoice.locked(invoice.status), 400, 'INVOICE_LOCKED');
    }

    // Guard: caller may not directly set status to a terminal value
    if (dto.status === InvoiceStatus.PAID || dto.status === InvoiceStatus.CANCELLED) {
      throw new ApiError(MSG.invoice.locked(dto.status), 400, 'INVALID_STATUS_TRANSITION');
    }

    // Guard: percentage discount cannot exceed 100 %
    const discountTypeForCheck = dto.discountType ?? invoice.discountType;
    const discountValueForCheck =
      dto.discountValue ??
      (invoice.discountValue != null ? Number(invoice.discountValue) : undefined);
    if (
      discountTypeForCheck === DiscountType.PERCENTAGE &&
      discountValueForCheck != null &&
      discountValueForCheck > 100
    ) {
      throw new ApiError(
        'La remise en pourcentage ne peut pas dépasser 100 %',
        400,
        'INVALID_DISCOUNT'
      );
    }

    // 4. Resolve effective values for recalculation
    //    For each field: use the incoming value if provided, otherwise fall back
    //    to what is already stored on the invoice.
    const effectiveVatRate = dto.vatRate ?? this.round(Number(invoice.vatRate));
    const effectiveDiscountType = (dto.discountType ?? invoice.discountType ?? undefined) as
      | DiscountType
      | undefined;
    const effectiveDiscountValue =
      dto.discountValue !== undefined
        ? dto.discountValue
        : invoice.discountValue != null
          ? this.round(Number(invoice.discountValue))
          : undefined;

    // Lines for recalculation: new array from DTO or existing lines from DB
    const effectiveLines = dto.lines
      ? dto.lines.map((l) => ({ quantity: l.quantity, unitPrice: l.unitPrice }))
      : invoice.lines.map((l) => ({
          quantity: Number(l.quantity),
          unitPrice: Number(l.unitPrice),
        }));

    // 5. Recalculate all monetary amounts — never trust frontend totals
    const amounts = this.recalculate(
      effectiveLines,
      effectiveVatRate,
      effectiveDiscountType,
      effectiveDiscountValue
    );

    // 6. Compute remainingAmount and derive the live status after recalculation
    const newRemaining = this.round(Math.max(0, amounts.total - Number(invoice.amountPaid)));
    const effectiveDueDate = dto.dueDate
      ? new Date(`${dto.dueDate}T00:00:00.000Z`)
      : invoice.dueDate;
    const storedStatus = dto.status ?? invoice.status;
    const liveStatus = this.computeStatus(storedStatus, newRemaining, effectiveDueDate);

    // 7. Persist in a single transaction for atomicity
    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete existing lines first if a replacement set was supplied
      if (dto.lines) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId } });
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          // Scalar fields — only written when the caller explicitly provided them
          ...(dto.dueDate !== undefined && { dueDate: new Date(`${dto.dueDate}T00:00:00.000Z`) }),
          ...(dto.vatRate !== undefined && { vatRate: dto.vatRate }),
          ...(dto.discountType !== undefined && { discountType: dto.discountType }),
          ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
          ...(dto.clientName !== undefined && { clientName: dto.clientName }),
          ...(dto.clientAddress !== undefined && { clientAddress: dto.clientAddress }),

          // Always persist the computed live status (covers overdue transitions)
          status: liveStatus,

          // Recalculated totals — always overwritten
          subtotal: amounts.subtotal,
          discountAmount: amounts.discountAmount,
          vatAmount: amounts.vatAmount,
          total: amounts.total,
          remainingAmount: newRemaining,

          // Replace lines when a new set was supplied (deleteMany ran above)
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
    });

    return this.serialize(updated);
  }

  // ─── CANCEL ───────────────────────────────────────────────────────────────────

  async cancel(invoiceId: number, userId: number) {
    const companyId = await this.resolveCompanyId(userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      select: { id: true, status: true },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new ApiError(MSG.invoice.already_cancelled, 400, 'INVOICE_ALREADY_CANCELLED');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new ApiError(MSG.invoice.cannot_cancel(invoice.status), 400, 'INVOICE_CANNOT_CANCEL');
    }

    const updated = await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.CANCELLED },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    return this.serialize(updated);
  }

  // ─── ADD PAYMENT ──────────────────────────────────────────────────────────────

  async addPayment(invoiceId: number, dto: CreatePaymentDto, userId: number) {
    const companyId = await this.resolveCompanyId(userId);

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId },
      include: { lines: { orderBy: { order: 'asc' } }, payments: true },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new ApiError(MSG.invoice.payment_on_cancelled, 400, 'INVOICE_CANCELLED');
    }

    // Guard: reject overpayment
    const currentRemaining = this.round(Number(invoice.remainingAmount));
    if (dto.amount > currentRemaining) {
      throw new ApiError(MSG.invoice.payment_exceeds_remaining, 400, 'PAYMENT_EXCEEDS_REMAINING');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Create the payment record
      await tx.invoicePayment.create({
        data: {
          invoiceId,
          amount: dto.amount,
          paymentDate: new Date(`${dto.paymentDate}T00:00:00.000Z`),
          method: dto.method,
          note: dto.note ?? null,
        },
      });

      // 2. Sum ALL payments for this invoice (including the one just created)
      const aggregate = await tx.invoicePayment.aggregate({
        where: { invoiceId },
        _sum: { amount: true },
      });

      const amountPaid = this.round(Number(aggregate._sum.amount ?? 0));
      const total = this.round(Number(invoice.total));

      // In-transaction overpayment guard — catches races missed by the pre-check
      if (amountPaid > total) {
        throw new ApiError(MSG.invoice.payment_exceeds_remaining, 400, 'PAYMENT_EXCEEDS_REMAINING');
      }
      const remainingAmount = this.round(Math.max(0, total - amountPaid));

      // 3. Derive new status — also applies the overdue rule so the DB stays correct.
      let status: string;
      if (amountPaid >= total) {
        // Fully paid — terminal, nothing else to check.
        status = InvoiceStatus.PAID;
      } else if (amountPaid > 0) {
        // Partial payment: the invoice is either "partial" or "overdue" depending
        // on whether the due date has already passed.
        status = this.computeStatus(InvoiceStatus.PARTIAL, remainingAmount, invoice.dueDate);
      } else {
        // No payment at all (edge case — keep existing status but re-check overdue).
        status = this.computeStatus(invoice.status, remainingAmount, invoice.dueDate);
      }

      // 4. Update invoice totals + status
      return tx.invoice.update({
        where: { id: invoiceId },
        data: { amountPaid, remainingAmount, status },
        include: {
          lines: { orderBy: { order: 'asc' } },
          payments: { orderBy: { paymentDate: 'asc' } },
        },
      });
    });

    return this.serializeWithPayments(updated);
  }

  // ─── PRIVATE HELPERS ──────────────────────────────────────────────────────────

  /**
   * Converts all Prisma Decimal fields on the invoice and its lines to plain
   * JavaScript numbers so the JSON response is human-readable.
   * Prisma Decimal objects expose `.toNumber()` — no external import needed.
   */
  private serialize(invoice: any) {
    const { lines, ...rest } = invoice;

    // Coerce Decimal fields to plain numbers first so computeStatus receives a number.
    const remainingAmount = Number(rest.remainingAmount);

    // Always derive the live status — overrides whatever is stored in the DB
    // for invoices whose due date has passed while a balance remains.
    const status = this.computeStatus(rest.status, remainingAmount, new Date(rest.dueDate));

    return {
      ...rest,
      status,
      vatRate: Number(rest.vatRate),
      discountValue: rest.discountValue != null ? Number(rest.discountValue) : null,
      subtotal: Number(rest.subtotal),
      discountAmount: rest.discountAmount != null ? Number(rest.discountAmount) : null,
      vatAmount: Number(rest.vatAmount),
      total: Number(rest.total),
      amountPaid: Number(rest.amountPaid),
      remainingAmount,
      lines: lines.map((line: any) => ({
        ...line,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
      })),
    };
  }

  private serializeWithPayments(invoice: any) {
    const { payments, ...rest } = invoice;
    return {
      ...this.serialize(rest),
      payments: (payments ?? []).map((p: any) => ({
        ...p,
        amount: Number(p.amount),
      })),
    };
  }

  /**
   * Generates the next invoice number for a given company.
   * Format: FAC-{YYYY}-{NNN} — e.g. FAC-2026-001
   * Numbering resets per year, scoped per company.
   */
  private async generateInvoiceNumber(companyId: number): Promise<string> {
    const year = new Date().getFullYear();
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
   * Calculates all monetary amounts from the DTO.
   * All intermediate values are rounded to 2 decimal places.
   *
   * Formula:
   *   subtotal      = sum of (quantity * unitPrice) per line
   *   discountAmount = subtotal * (value/100)  if percentage
   *                  | value                   if fixed
   *   vatBase       = subtotal - discountAmount
   *   vatAmount     = vatBase * (vatRate / 100)
   *   total         = vatBase + vatAmount
   */
  private calculateAmounts(dto: CreateInvoiceDto): {
    subtotal: number;
    discountAmount: number;
    vatAmount: number;
    total: number;
  } {
    const subtotal = this.round(
      dto.lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0)
    );

    let discountAmount = 0;
    if (dto.discountType && dto.discountValue != null && dto.discountValue > 0) {
      if (dto.discountType === DiscountType.PERCENTAGE) {
        discountAmount = this.round(subtotal * (dto.discountValue / 100));
      } else {
        // FIXED — cap at subtotal so total never goes negative
        discountAmount = this.round(Math.min(dto.discountValue, subtotal));
      }
    }

    const vatBase = this.round(subtotal - discountAmount);
    const vatAmount = this.round(vatBase * (dto.vatRate / 100));
    const total = this.round(vatBase + vatAmount);

    return { subtotal, discountAmount, vatAmount, total };
  }

  /** Rounds a number to 2 decimal places (monetary precision). */
  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }

  /**
   * Resolves the companyId for the given user.
   * Throws 400 USER_NO_COMPANY if the user doesn't exist or has no company.
   */
  private async resolveCompanyId(userId: number): Promise<number> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });
    if (!user?.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }
    return user.companyId;
  }

  /**
   * Returns the effective invoice status, applying the overdue rule.
   *
   * Rules (in order):
   *   1. paid | cancelled → terminal, never change.
   *   2. remainingAmount > 0 AND dueDate is strictly before today → overdue.
   *   3. Otherwise → return the stored status unchanged.
   *
   * "Today" is midnight UTC so an invoice due today is NOT yet overdue;
   * it becomes overdue starting tomorrow.
   */
  private computeStatus(stored: string, remainingAmount: number, dueDate: Date): string {
    if (stored === InvoiceStatus.PAID || stored === InvoiceStatus.CANCELLED) {
      return stored;
    }

    const todayUtc = new Date();
    todayUtc.setUTCHours(0, 0, 0, 0);

    if (remainingAmount > 0 && dueDate < todayUtc) {
      return InvoiceStatus.OVERDUE;
    }

    return stored;
  }

  /**
   * Recalculates all monetary amounts from raw line data.
   * Used by `update` where we don't have a full CreateInvoiceDto.
   */
  private recalculate(
    lines: { quantity: number; unitPrice: number }[],
    vatRate: number,
    discountType?: DiscountType,
    discountValue?: number
  ): { subtotal: number; discountAmount: number; vatAmount: number; total: number } {
    const subtotal = this.round(lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0));

    let discountAmount = 0;
    if (discountType && discountValue != null && discountValue > 0) {
      if (discountType === DiscountType.PERCENTAGE) {
        discountAmount = this.round(subtotal * (discountValue / 100));
      } else {
        discountAmount = this.round(Math.min(discountValue, subtotal));
      }
    }

    const vatBase = this.round(subtotal - discountAmount);
    const vatAmount = this.round(vatBase * (vatRate / 100));
    const total = this.round(vatBase + vatAmount);

    return { subtotal, discountAmount, vatAmount, total };
  }
}
