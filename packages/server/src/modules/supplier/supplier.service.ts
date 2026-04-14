import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  private readonly logger = new Logger(SupplierService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly minioService: MinioService
  ) {}

  /**
   * List suppliers for a company (paginated + optional search)
   */
  async getSuppliers(companyId: number, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { company: { contains: search.trim(), mode: 'insensitive' } },
        { email: { contains: search.trim(), mode: 'insensitive' } },
        { taxId: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [totalCount, suppliers] = await Promise.all([
      this.prisma.supplier.count({ where }),
      this.prisma.supplier.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    // Resolve presigned logo URLs
    const suppliersWithUrls = await Promise.all(
      suppliers.map(async (s) => {
        if (s.logoUrl) {
          try {
            const logoUrl = await this.minioService.getPresignedUrl(s.logoUrl);
            return { ...s, logoUrl };
          } catch {
            this.logger.warn(`Failed to get presigned URL for supplier ${s.id}`);
          }
        }
        return s;
      })
    );

    return {
      status: 'success',
      code: '200',
      data: suppliersWithUrls,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Create a new supplier
   */
  async createSupplier(companyId: number, dto: CreateSupplierDto, logoFile?: Express.Multer.File) {
    let logoUrl: string | undefined;

    if (logoFile) {
      logoUrl = await this.minioService.uploadFile(companyId, 'suppliers/logos', logoFile);
    }

    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        company: dto.company,
        email: dto.email,
        phone: dto.phone,
        address: dto.address ?? null,
        taxId: dto.taxId ?? null,
        logoUrl: logoUrl ?? null,
        companyId,
      },
    });

    return {
      status: 'success',
      code: '201',
      data: supplier,
      message: 'Fournisseur créé avec succès',
    };
  }

  /**
   * Update an existing supplier
   */
  async updateSupplier(
    id: number,
    companyId: number,
    dto: UpdateSupplierDto,
    logoFile?: Express.Multer.File
  ) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new ApiError('Fournisseur non trouvé', 404, 'NOT_FOUND');
    }

    if (supplier.companyId !== companyId) {
      throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    let logoUrl = supplier.logoUrl;

    if (logoFile) {
      // Remove old logo from storage
      if (supplier.logoUrl) {
        try {
          await this.minioService.deleteFile(supplier.logoUrl);
        } catch {
          this.logger.warn(`Could not delete old logo for supplier ${id}`);
        }
      }
      logoUrl = await this.minioService.uploadFile(companyId, 'suppliers/logos', logoFile);
    }

    const updated = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.company !== undefined && { company: dto.company }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.address !== undefined && { address: dto.address }),
        ...(dto.taxId !== undefined && { taxId: dto.taxId }),
        logoUrl,
      },
    });

    return {
      status: 'success',
      code: '200',
      data: updated,
      message: 'Fournisseur mis à jour avec succès',
    };
  }

  /**
   * Delete a supplier
   */
  async deleteSupplier(id: number, companyId: number) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });

    if (!supplier) {
      throw new ApiError('Fournisseur non trouvé', 404, 'NOT_FOUND');
    }

    if (supplier.companyId !== companyId) {
      throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    if (supplier.logoUrl) {
      try {
        await this.minioService.deleteFile(supplier.logoUrl);
      } catch {
        this.logger.warn(`Could not delete logo for supplier ${id}`);
      }
    }

    await this.prisma.supplier.delete({ where: { id } });

    return {
      status: 'success',
      code: '200',
      message: 'Fournisseur supprimé avec succès',
    };
  }
}
