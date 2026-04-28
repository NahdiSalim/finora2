import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiError } from '../../common/errors/api-error';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * List products for a company (paginated + optional search)
   */
  async getProducts(companyId: number, page = 1, limit = 10, search?: string) {
    const skip = (page - 1) * limit;

    const where: any = { companyId };

    if (search?.trim()) {
      where.name = { contains: search.trim(), mode: 'insensitive' };
    }

    const [totalCount, products] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      status: 'success',
      code: '200',
      data: products,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  /**
   * Create a new product
   */
  async createProduct(companyId: number, dto: CreateProductDto) {
    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        unitPrice: dto.unitPrice,
        companyId,
      },
    });

    return {
      status: 'success',
      code: '201',
      data: product,
      message: 'Produit créé avec succès',
    };
  }

  /**
   * Update an existing product
   */
  async updateProduct(id: number, companyId: number, dto: UpdateProductDto) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new ApiError('Produit non trouvé', 404, 'NOT_FOUND');
    }

    if (product.companyId !== companyId) {
      throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.unitPrice !== undefined && { unitPrice: dto.unitPrice }),
      },
    });

    return {
      status: 'success',
      code: '200',
      data: updated,
      message: 'Produit mis à jour avec succès',
    };
  }

  /**
   * Delete a product
   */
  async deleteProduct(id: number, companyId: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });

    if (!product) {
      throw new ApiError('Produit non trouvé', 404, 'NOT_FOUND');
    }

    if (product.companyId !== companyId) {
      throw new ApiError('Accès refusé', 403, 'ACCESS_DENIED');
    }

    await this.prisma.product.delete({ where: { id } });

    return {
      status: 'success',
      code: '200',
      message: 'Produit supprimé avec succès',
    };
  }
}
