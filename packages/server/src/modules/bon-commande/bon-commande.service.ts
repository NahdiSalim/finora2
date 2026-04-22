import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateBonCommandeDto } from './dto/create-bon-commande.dto';
import { UpdateBonCommandeDto } from './dto/update-bon-commande.dto';

@Injectable()
export class BonCommandeService {
  private readonly logger = new Logger(BonCommandeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ==================== CRUD ====================

  async create(userId: number, companyId: number, dto: CreateBonCommandeDto) {
    if (dto.supplierId) {
      const supplier = await this.prisma.supplier.findUnique({ where: { id: dto.supplierId } });
      if (!supplier) throw new ApiError('Fournisseur introuvable', 404, 'SUPPLIER_NOT_FOUND');
      if (supplier.companyId !== companyId)
        throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    const amounts = this.calculateAmounts(dto.lines, dto.tvaRate);

    const bc = await this.prisma.bonCommande.create({
      data: {
        number: dto.number,
        status: dto.status,
        tvaRate: dto.tvaRate,
        validUntil: new Date(dto.validUntil),
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
      data: bc,
      message: 'Bon de commande créé avec succès',
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

    const [totalCount, list, countBrouillon, countConfirme, countAnnule] = await Promise.all([
      this.prisma.bonCommande.count({ where }),
      this.prisma.bonCommande.findMany({
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
      this.prisma.bonCommande.count({ where: { companyId, status: 'brouillon' } }),
      this.prisma.bonCommande.count({ where: { companyId, status: 'confirme' } }),
      this.prisma.bonCommande.count({ where: { companyId, status: 'annule' } }),
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
      counts: { brouillon: countBrouillon, confirme: countConfirme, annule: countAnnule },
    };
  }

  async findOne(id: number, companyId: number) {
    const bc = await this.prisma.bonCommande.findUnique({
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
    if (!bc) throw new ApiError('Bon de commande introuvable', 404, 'NOT_FOUND');
    if (bc.companyId !== companyId) throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    return { status: 'success', code: '200', data: bc };
  }

  async update(id: number, companyId: number, dto: UpdateBonCommandeDto) {
    const bc = await this.prisma.bonCommande.findUnique({ where: { id } });
    if (!bc) throw new ApiError('Bon de commande introuvable', 404, 'NOT_FOUND');
    if (bc.companyId !== companyId) throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');

    let amounts: any = {};
    if (dto.lines || dto.tvaRate !== undefined) {
      const lines = dto.lines ?? (bc.lines as any[]);
      const tvaRate = dto.tvaRate ?? bc.tvaRate;
      amounts = this.calculateAmounts(lines, tvaRate);
    }

    const updated = await this.prisma.bonCommande.update({
      where: { id },
      data: {
        ...(dto.status && { status: dto.status }),
        ...(dto.tvaRate !== undefined && { tvaRate: dto.tvaRate }),
        ...(dto.validUntil && { validUntil: new Date(dto.validUntil) }),
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

    return { status: 'success', code: '200', data: updated, message: 'Bon de commande mis à jour' };
  }

  async remove(id: number, companyId: number) {
    const bc = await this.prisma.bonCommande.findUnique({ where: { id } });
    if (!bc) throw new ApiError('Bon de commande introuvable', 404, 'NOT_FOUND');
    if (bc.companyId !== companyId) throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    await this.prisma.bonCommande.delete({ where: { id } });
    return { status: 'success', code: '200', message: 'Bon de commande supprimé' };
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
