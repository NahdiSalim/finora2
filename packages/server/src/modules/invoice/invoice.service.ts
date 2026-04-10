import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateInvoiceDto, DiscountType, InvoiceStatus } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

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

    // 3. Calculate all amounts from lines + VAT + discount
    const amounts = this.calculateAmounts(dto);

    // 4. Create invoice + nested lines in a single transaction
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
        lines: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.serialize(invoice);
  }

  // ─── FIND ALL ─────────────────────────────────────────────────────────────────

  async findAll(
    userId: number,
    status?: string,
    search?: string,
    page: number = 1,
    pageSize: number = 10
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }

    const skip = (page - 1) * pageSize;

    const where = {
      companyId: user.companyId,
      ...(status ? { status } : {}),
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
        take: pageSize,
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
      pageSize,
    };
  }

  // ─── FIND ONE ─────────────────────────────────────────────────────────────────

  async findOne(invoiceId: number, userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: user.companyId },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    return this.serialize(invoice);
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  async update(invoiceId: number, dto: UpdateInvoiceDto, userId: number) {
    // 1. Verify company membership
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }

    // 2. Load invoice scoped to the user's company (lines needed for recalc)
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: user.companyId },
      include: { lines: { orderBy: { order: 'asc' } } },
    });

    if (!invoice) {
      throw new ApiError(MSG.invoice.not_found, 404, 'INVOICE_NOT_FOUND');
    }

    // 3. Block edits on terminal statuses
    if (invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.CANCELLED) {
      throw new ApiError(MSG.invoice.locked(invoice.status), 400, 'INVOICE_LOCKED');
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

    // 6. Persist in a single transaction for atomicity
    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete existing lines first if a replacement set was supplied
      if (dto.lines) {
        await tx.invoiceLine.deleteMany({ where: { invoiceId } });
      }

      return tx.invoice.update({
        where: { id: invoiceId },
        data: {
          // Scalar fields — only written when the caller explicitly provided them
          ...(dto.status !== undefined && { status: dto.status }),
          ...(dto.dueDate !== undefined && { dueDate: new Date(`${dto.dueDate}T00:00:00.000Z`) }),
          ...(dto.vatRate !== undefined && { vatRate: dto.vatRate }),
          ...(dto.discountType !== undefined && { discountType: dto.discountType }),
          ...(dto.discountValue !== undefined && { discountValue: dto.discountValue }),
          ...(dto.notes !== undefined && { notes: dto.notes }),

          // Recalculated totals — always overwritten
          subtotal: amounts.subtotal,
          discountAmount: amounts.discountAmount,
          vatAmount: amounts.vatAmount,
          total: amounts.total,
          remainingAmount: this.round(amounts.total - Number(invoice.amountPaid)),

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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: user.companyId },
      include: { lines: { orderBy: { order: 'asc' } } },
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
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { companyId: true },
    });

    if (!user?.companyId) {
      throw new ApiError(MSG.invoice.no_company, 400, 'USER_NO_COMPANY');
    }

    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, companyId: user.companyId },
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
      const remainingAmount = this.round(Math.max(0, total - amountPaid));

      // 3. Derive new status
      let status = invoice.status;
      if (amountPaid <= 0) {
        // no change — keep existing status
      } else if (amountPaid >= total) {
        status = InvoiceStatus.PAID;
      } else {
        status = InvoiceStatus.PARTIAL;
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
    return {
      ...rest,
      vatRate: Number(rest.vatRate),
      discountValue: rest.discountValue != null ? Number(rest.discountValue) : null,
      subtotal: Number(rest.subtotal),
      discountAmount: rest.discountAmount != null ? Number(rest.discountAmount) : null,
      vatAmount: Number(rest.vatAmount),
      total: Number(rest.total),
      amountPaid: Number(rest.amountPaid),
      remainingAmount: Number(rest.remainingAmount),
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
