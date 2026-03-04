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

    // Generate presigned URLs for all posts
    const postsWithUrls = await Promise.all(
      posts.map(async (post) => {
        // Generate presigned URLs for post images
        const imageUrls = await Promise.all(
          post.images.map(async (imagePath) => {
            try {
              return await this.minioService.getPresignedUrl(imagePath, 7 * 24 * 60 * 60);
            } catch (error) {
              console.error('Error generating presigned URL for post image:', error);
              return imagePath;
            }
          })
        );

        // Generate presigned URL for author photo
        let authorPhotoUrl: string | null = null;
        if (post.author.photo) {
          try {
            authorPhotoUrl = await this.minioService.getPresignedUrl(
              post.author.photo,
              7 * 24 * 60 * 60
            );
          } catch (error) {
            console.error('Error generating presigned URL for author photo:', error);
            authorPhotoUrl = post.author.photo;
          }
        }

        // Generate presigned URL for company logo
        let companyLogoUrl: string | null = null;
        if (post.company?.logo) {
          try {
            companyLogoUrl = await this.minioService.getPresignedUrl(
              post.company.logo,
              7 * 24 * 60 * 60
            );
          } catch (error) {
            console.error('Error generating presigned URL for company logo:', error);
            companyLogoUrl = post.company.logo;
          }
        }

        return {
          id: post.id,
          authorId: post.authorId,
          companyId: post.companyId,
          title: post.title,
          content: post.content,
          imageUrls, // URLs présignées MinIO
          tags: post.tags,
          visibility: post.visibility,
          status: post.status,
          viewsCount: post.viewsCount,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          publishedAt: post.publishedAt,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: {
            id: post.author.id,
            firstName: post.author.firstName,
            lastName: post.author.lastName,
            photoUrl: authorPhotoUrl,
          },
          company: post.company
            ? {
                id: post.company.id,
                name: post.company.name,
                logoUrl: companyLogoUrl,
              }
            : null,
        };
      })
    );

    return {
      data: postsWithUrls,
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

    // Generate presigned URLs for post images
    const imageUrls = await Promise.all(
      post.images.map(async (imagePath) => {
        try {
          return await this.minioService.getPresignedUrl(imagePath, 7 * 24 * 60 * 60);
        } catch (error) {
          console.error('Error generating presigned URL for post image:', error);
          return imagePath;
        }
      })
    );

    // Generate presigned URL for author photo
    let authorPhotoUrl: string | null = null;
    if (post.author.photo) {
      try {
        authorPhotoUrl = await this.minioService.getPresignedUrl(
          post.author.photo,
          7 * 24 * 60 * 60
        );
      } catch (error) {
        console.error('Error generating presigned URL for author photo:', error);
        authorPhotoUrl = post.author.photo;
      }
    }

    // Generate presigned URL for company logo
    let companyLogoUrl: string | null = null;
    if (post.company?.logo) {
      try {
        companyLogoUrl = await this.minioService.getPresignedUrl(
          post.company.logo,
          7 * 24 * 60 * 60
        );
      } catch (error) {
        console.error('Error generating presigned URL for company logo:', error);
        companyLogoUrl = post.company.logo;
      }
    }

    // Generate presigned URLs for comment authors' photos
    const commentsWithUrls = await Promise.all(
      post.comments.map(async (comment) => {
        let commentAuthorPhotoUrl: string | null = null;
        if (comment.author.photo) {
          try {
            commentAuthorPhotoUrl = await this.minioService.getPresignedUrl(
              comment.author.photo,
              7 * 24 * 60 * 60
            );
          } catch (error) {
            console.error('Error generating presigned URL for comment author photo:', error);
            commentAuthorPhotoUrl = comment.author.photo;
          }
        }

        return {
          ...comment,
          author: {
            ...comment.author,
            photoUrl: commentAuthorPhotoUrl,
          },
        };
      })
    );

    return {
      id: post.id,
      authorId: post.authorId,
      companyId: post.companyId,
      title: post.title,
      content: post.content,
      imageUrls, // URLs présignées MinIO
      tags: post.tags,
      visibility: post.visibility,
      status: post.status,
      viewsCount: post.viewsCount,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      publishedAt: post.publishedAt,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        id: post.author.id,
        firstName: post.author.firstName,
        lastName: post.author.lastName,
        photoUrl: authorPhotoUrl,
      },
      company: post.company
        ? {
            id: post.company.id,
            name: post.company.name,
            logoUrl: companyLogoUrl,
          }
        : null,
      comments: commentsWithUrls.map((comment) => ({
        id: comment.id,
        postId: comment.postId,
        authorId: comment.authorId,
        content: comment.content,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.author.id,
          firstName: comment.author.firstName,
          lastName: comment.author.lastName,
          photoUrl: comment.author.photoUrl,
        },
      })),
    };
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
