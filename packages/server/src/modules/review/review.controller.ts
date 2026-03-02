import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators';
import { ReviewService } from './review.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { RespondReviewDto } from './dto/respond-review.dto';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Post('accountant/:accountantId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Laisser un avis sur un comptable (client uniquement)' })
  async createReview(
    @Request() req,
    @Param('accountantId', ParseIntPipe) accountantId: number,
    @Body() dto: CreateReviewDto
  ) {
    return this.reviewService.createReview(accountantId, req.user.id, dto);
  }

  @Get('accountant/:accountantId')
  @Public()
  @ApiOperation({ summary: "Obtenir les avis d'un comptable" })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getAccountantReviews(
    @Param('accountantId', ParseIntPipe) accountantId: number,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reviewService.getAccountantReviews(
      accountantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 10
    );
  }

  @Post(':reviewId/respond')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Répondre à un avis (comptable uniquement)' })
  async respondToReview(
    @Request() req,
    @Param('reviewId', ParseIntPipe) reviewId: number,
    @Body() dto: RespondReviewDto
  ) {
    return this.reviewService.respondToReview(reviewId, req.user.id, dto);
  }

  @Delete(':reviewId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer un avis (client uniquement)' })
  async deleteReview(@Request() req, @Param('reviewId', ParseIntPipe) reviewId: number) {
    return this.reviewService.deleteReview(reviewId, req.user.id);
  }
}
