import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateBonLivraisonDto } from './dto/create-bon-livraison.dto';
import { UpdateBonLivraisonDto } from './dto/update-bon-livraison.dto';
import { ConvertBonLivraisonToInvoiceDto } from './dto/convert-bon-livraison-to-invoice.dto';

@Injectable()
export class BonLivraisonService {
  private readonly logger = new Logger(BonLivraisonService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD ====================

  async create(userId: number, companyId: number, dto: CreateBonLivraisonDto) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw new ApiError('Fournisseur introuvable', 404, 'SUPPLIER_NOT_FOUND');
      if (supplier.companyId !== companyId)
        throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    const amounts = this.calculateAmounts(dto.lines, dto.tvaRate);

    const bl = await this.prisma.bonLivraison.create({
      data: {
        number: dto.number,
        status: dto.status,
        tvaRate: dto.tvaRate,
        deliveryDate: new Date(dto.deliveryDate),
        lines: dto.lines as any,
        notes: dto.notes ?? null,
        amountHT: amounts.amountHT,
        amountTVA: amounts.amountTVA,
        amountTTC: amounts.amountTTC,
        ownerId: userId,
        companyId,
        createdBy: userId,
        createdByCompanyId: companyId,
        ...(dto.supplierId && { supplierId: dto.supplierId }),
      },
      include: {
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

    return {
      status: 'success',
      code: '201',
      data: bl,
      message: 'Bon de livraison créé avec succès',
    };
  }

  async findAll(
    companyId: number,
    page = 1,
    limit = 10,
    status?: string,
    search?: string,
    startDate?: Date,
    endDate?: Date
  ) {
    const skip = (page - 1) * limit;
    const where: any = { companyId };

    if (status) where.status = status;

    if (search?.trim()) {
      where.OR = [
        {
          supplier: {
            OR: [
              { name: { contains: search.trim(), mode: 'insensitive' } },
              { company: { contains: search.trim(), mode: 'insensitive' } },
            ],
          },
        },
        { notes: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totalCount, list, countEnAttente, countLivre, countAnnule] = await Promise.all([
      this.prisma.bonLivraison.count({ where }),
      this.prisma.bonLivraison.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
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
      this.prisma.bonLivraison.count({ where: { companyId, status: 'en_attente' } }),
      this.prisma.bonLivraison.count({ where: { companyId, status: 'livre' } }),
      this.prisma.bonLivraison.count({ where: { companyId, status: 'annule' } }),
    ]);

    return {
      status: 'success',
      code: '200',
      data: list,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limitPerPage: limit,
        totalCount,
      },
      counts: { en_attente: countEnAttente, livre: countLivre, annule: countAnnule },
    };
  }

  async findOne(id: number, companyId: number) {
    const bl = await this.prisma.bonLivraison.findUnique({
      where: { id },
      include: {
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
    if (!bl) throw new ApiError('Bon de livraison introuvable', 404, 'NOT_FOUND');
    if (bl.companyId !== companyId) throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    return { status: 'success', code: '200', data: bl };
  }

  async update(id: number, companyId: number, dto: UpdateBonLivraisonDto) {
    const bl = await this.prisma.bonLivraison.findUnique({ where: { id } });
    if (!bl) throw new ApiError('Bon de livraison introuvable', 404, 'NOT_FOUND');
    if (bl.companyId !== companyId) throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');

    let amounts: any = {};
    if (dto.lines || dto.tvaRate !== undefined) {
      const lines = dto.lines ?? (bl.lines as any[]);
      const tvaRate = dto.tvaRate ?? bl.tvaRate;
      amounts = this.calculateAmounts(lines, tvaRate);
    }

    const updated = await this.prisma.bonLivraison.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.tvaRate !== undefined && { tvaRate: dto.tvaRate }),
        ...(dto.deliveryDate && { deliveryDate: new Date(dto.deliveryDate) }),
        ...(dto.lines && { lines: dto.lines as any }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.supplierId !== undefined && { supplierId: dto.supplierId }),
        ...(amounts.amountHT !== undefined && {
          amountHT: amounts.amountHT,
          amountTVA: amounts.amountTVA,
          amountTTC: amounts.amountTTC,
        }),
      },
      include: {
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

    return {
      status: 'success',
      code: '200',
      data: updated,
      message: 'Bon de livraison mis à jour',
    };
  }

  async remove(id: number, companyId: number) {
    const bl = await this.prisma.bonLivraison.findUnique({ where: { id } });
    if (!bl) throw new ApiError('Bon de livraison introuvable', 404, 'NOT_FOUND');
    if (bl.companyId !== companyId) throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    await this.prisma.bonLivraison.delete({ where: { id } });
    return { status: 'success', code: '200', message: 'Bon de livraison supprimé' };
  }

  /**
   * Convert a bon de livraison into a draft invoice.
   * Lines, TVA rate, notes and supplier are inherited from the BL.
   * Due date is automatically set to 30 days from today.
   */
  async convertBonLivraisonToInvoice(
    id: number,
    userId: number,
    companyId: number,
    dto: ConvertBonLivraisonToInvoiceDto
  ) {
    const bl = await this.prisma.bonLivraison.findUnique({
      where: { id },
      include: { supplier: true },
    });

    if (!bl) {
      throw new ApiError('Bon de livraison introuvable', 404, 'NOT_FOUND');
    }

    if (bl.companyId !== companyId) {
      throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    if (bl.status === 'annule') {
      throw new ApiError(
        'Un bon de livraison annulé ne peut pas être converti en facture',
        400,
        'BL_CANCELLED'
      );
    }

    if (!bl.supplierId) {
      throw new ApiError(
        'Le bon de livraison doit être associé à un fournisseur',
        400,
        'BL_SUPPLIER_REQUIRED'
      );
    }

    const lines = (bl.lines as any[]) ?? [];
    const amounts = this.calculateAmounts(lines, bl.tvaRate);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber: dto.invoiceNumber,
        status: 'draft',
        dueDate,
        vatRate: bl.tvaRate,
        subtotal: amounts.amountHT,
        discountAmount: 0,
        vatAmount: amounts.amountTVA,
        total: amounts.amountTTC,
        amountPaid: 0,
        remainingAmount: amounts.amountTTC,
        notes: bl.notes,
        supplierId: bl.supplierId,
        companyId: bl.companyId,
        createdById: userId,
        lines: {
          create: lines.map((line, index) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            lineTotal: Math.round(line.quantity * line.unitPrice * 100) / 100,
            order: index,
          })),
        },
      },
      include: {
        lines: { orderBy: { order: 'asc' } },
        supplier: true,
      },
    });

    return {
      status: 'success',
      code: '201',
      data: {
        invoice,
        bonLivraison: bl,
      },
      message: 'Bon de livraison converti en facture avec succès',
    };
  }

  // ==================== HELPERS ====================

  private calculateAmounts(lines: any[], tvaRate: number) {
    const amountHT = lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
    const amountTVA = (amountHT * tvaRate) / 100;
    const amountTTC = amountHT + amountTVA;
    return {
      amountHT: Math.round(amountHT * 100) / 100,
      amountTVA: Math.round(amountTVA * 100) / 100,
      amountTTC: Math.round(amountTTC * 100) / 100,
    };
  }
}
