import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class PostService {
  constructor(
    private prisma: PrismaService,
    private minioService: MinioService
  ) {}

  /**
   * Create a new post
   */
  async createPost(dto: CreatePostDto, authorId: number, images?: Express.Multer.File[]) {
    const user = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { companyId: true, role: { select: { code: true } } },
    });

    if (!user) {
      throw new Error('Utilisateur non trouvé');
    }

    // Upload images to MinIO
    let imageUrls: string[] = [];
    if (images && images.length > 0 && user.companyId) {
      const uploadPromises = images.map((file) =>
        this.minioService.uploadFile(user.companyId!, 'posts', file)
      );
      imageUrls = await Promise.all(uploadPromises);
    }

    // Transform tags if it's a string (from form-data)
    let tagsArray: string[] = [];
    if (dto.tags) {
      if (typeof dto.tags === 'string') {
        tagsArray = dto.tags.split(',').map((tag) => tag.trim());
      } else {
        tagsArray = dto.tags;
      }
    }

    const post = await this.prisma.post.create({
      data: {
        authorId,
        companyId: user.companyId,
        title: dto.title,
        content: dto.content,
        images: imageUrls,
        tags: tagsArray,
        visibility: dto.visibility || 'public',
        status: 'published',
        publishedAt: new Date(),
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
      },
    });

    return post;
  }

  /**
   * Get all posts (public feed)
   */
  async getPosts(filters?: {
    authorId?: number;
    companyId?: number;
    tags?: string[];
    visibility?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'published',
    };

    if (filters?.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters?.companyId) {
      where.companyId = filters.companyId;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    if (filters?.visibility) {
      where.visibility = filters.visibility;
    } else {
      where.visibility = 'public'; // Par défaut, seulement les posts publics
    }

    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              photo: true,
            },
          },
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
            },
          },
        },
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.post.count({ where }),
    ]);

    return {
      data: posts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single post by ID
   */
  async getPostById(postId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                photo: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!post) {
      throw new Error('Post non trouvé');
    }

    // Increment views count
    await this.prisma.post.update({
      where: { id: postId },
      data: { viewsCount: { increment: 1 } },
    });

    return post;
  }

  /**
   * Update a post
   */
  async updatePost(
    postId: number,
    authorId: number,
    dto: UpdatePostDto,
    images?: Express.Multer.File[]
  ) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.authorId !== authorId) {
      throw new Error('Post non trouvé ou non autorisé');
    }

    let imageUrls = post.images;
    if (images && images.length > 0) {
      const user = await this.prisma.user.findUnique({
        where: { id: authorId },
        select: { companyId: true },
      });

      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }

      if (user.companyId) {
        const uploadPromises = images.map((file) =>
          this.minioService.uploadFile(user.companyId!, 'posts', file)
        );
        const newImages = await Promise.all(uploadPromises);
        imageUrls = [...imageUrls, ...newImages];
      }
    }

    // Transform tags if it's a string (from form-data)
    const updateData: any = { ...dto, images: imageUrls };
    if (dto.tags) {
      if (typeof dto.tags === 'string') {
        updateData.tags = dto.tags.split(',').map((tag) => tag.trim());
      } else {
        updateData.tags = dto.tags;
      }
    }

    return this.prisma.post.update({
      where: { id: postId },
      data: updateData,
    });
  }

  /**
   * Delete a post
   */
  async deletePost(postId: number, authorId: number) {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post || post.authorId !== authorId) {
      throw new Error('Post non trouvé ou non autorisé');
    }

    await this.prisma.post.delete({
      where: { id: postId },
    });

    return { success: true, message: 'Post supprimé' };
  }

  /**
   * Like/Unlike a post
   */
  async toggleLike(postId: number, userId: number) {
    const existingLike = await this.prisma.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      // Unlike
      await this.prisma.postLike.delete({
        where: { id: existingLike.id },
      });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      // Like
      await this.prisma.postLike.create({
        data: { postId, userId },
      });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  /**
   * Add a comment to a post
   */
  async addComment(postId: number, authorId: number, dto: CreateCommentDto) {
    const comment = await this.prisma.postComment.create({
      data: {
        postId,
        authorId,
        content: dto.content,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            photo: true,
          },
        },
      },
    });

    // Increment comments count
    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: number, authorId: number) {
    const comment = await this.prisma.postComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.authorId !== authorId) {
      throw new Error('Commentaire non trouvé ou non autorisé');
    }

    await this.prisma.postComment.delete({
      where: { id: commentId },
    });

    // Decrement comments count
    await this.prisma.post.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    });

    return { success: true, message: 'Commentaire supprimé' };
  }
}
