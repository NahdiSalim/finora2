import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { MSG } from '../../common/messages';
import { CreateInvoiceDto, DiscountType } from './dto/create-invoice.dto';

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
    pageSize: number = 10,
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
              { notes:         { contains: search, mode: 'insensitive' as const } },
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
      vatRate:        Number(rest.vatRate),
      discountValue:  rest.discountValue  != null ? Number(rest.discountValue)  : null,
      subtotal:       Number(rest.subtotal),
      discountAmount: rest.discountAmount != null ? Number(rest.discountAmount) : null,
      vatAmount:      Number(rest.vatAmount),
      total:          Number(rest.total),
      amountPaid:     Number(rest.amountPaid),
      remainingAmount: Number(rest.remainingAmount),
      lines: lines.map((line: any) => ({
        ...line,
        quantity:  Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        lineTotal: Number(line.lineTotal),
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
}
