import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
@Injectable()
export class FeatureService {
  constructor(private prisma: PrismaService) {}

  async findAll(page: number, limit: number) {
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      this.prisma.feature.findMany({
        skip,
        take: limit,
        include: {
          pages: {
            include: {
              tasks: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.feature.count(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      status: 'success',
      code: '200',
      data,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }
}
