import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';

@Injectable()
export class ReviewService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a review for an accountant
   */
  async createReview(accountantId: number, clientId: number, dto: CreateReviewDto) {
    // Check if client already reviewed this accountant
    const existingReview = await this.prisma.review.findUnique({
      where: {
        accountantId_clientId: {
          accountantId,
          clientId,
        },
      },
    });

    if (existingReview) {
      throw new Error('Vous avez déjà laissé un avis pour ce comptable');
    }

    // Get accountant's company
    const accountant = await this.prisma.user.findUnique({
      where: { id: accountantId },
      select: { companyId: true },
    });

    if (!accountant) {
      throw new Error('Comptable non trouvé');
    }

    const review = await this.prisma.review.create({
      data: {
        accountantId,
        clientId,
        companyId: accountant.companyId,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        client: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });

    // Update accountant's company rating
    if (accountant.companyId) {
      await this.updateCompanyRating(accountant.companyId);
    }

    return review;
  }

  /**
   * Get reviews for an accountant
   */
  async getAccountantReviews(accountantId: number, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: {
          accountantId,
          isPublic: true,
        },
        include: {
          client: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.review.count({
        where: { accountantId, isPublic: true },
      }),
    ]);

    // Calculate average rating
    const avgRating = await this.prisma.review.aggregate({
      where: { accountantId, isPublic: true },
      _avg: { rating: true },
    });

    return {
      data: reviews,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      averageRating: avgRating._avg.rating || 0,
    };
  }

  /**
   * Respond to a review (accountant only)
   */
  async respondToReview(reviewId: number, accountantId: number, dto: RespondReviewDto) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.accountantId !== accountantId) {
      throw new Error('Avis non trouvé ou non autorisé');
    }

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        response: dto.response,
        respondedAt: new Date(),
      },
    });
  }

  /**
   * Update company rating based on reviews
   */
  private async updateCompanyRating(companyId: number) {
    const stats = await this.prisma.review.aggregate({
      where: { companyId, isPublic: true },
      _avg: { rating: true },
      _count: true,
    });

    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        rating: stats._avg.rating || 0,
        numberOfReviews: stats._count,
      },
    });
  }

  /**
   * Delete a review (client only)
   */
  async deleteReview(reviewId: number, clientId: number) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review || review.clientId !== clientId) {
      throw new Error('Avis non trouvé ou non autorisé');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Update company rating
    if (review.companyId) {
      await this.updateCompanyRating(review.companyId);
    }

    return { success: true, message: 'Avis supprimé' };
  }
}
