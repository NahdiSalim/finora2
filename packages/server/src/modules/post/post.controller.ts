import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  ParseIntPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators';
import { PostService } from './post.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Créer un nouveau post (comptable uniquement)' })
  async createPost(
    @Request() req,
    @Body() dto: CreatePostDto,
    @UploadedFiles() images?: Express.Multer.File[]
  ) {
    return this.postService.createPost(dto, req.user.id, images);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtenir tous les posts publics' })
  @ApiQuery({ name: 'authorId', required: false, type: Number })
  @ApiQuery({ name: 'companyId', required: false, type: Number })
  @ApiQuery({ name: 'tags', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getPosts(
    @Query('authorId') authorId?: string,
    @Query('companyId') companyId?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const filters: any = {};

    if (authorId) filters.authorId = parseInt(authorId);
    if (companyId) filters.companyId = parseInt(companyId);
    if (tags) filters.tags = tags.split(',');
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    return this.postService.getPosts(filters);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Obtenir un post par ID' })
  async getPostById(@Param('id', ParseIntPipe) id: number) {
    return this.postService.getPostById(id);
  }

  @Put(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Mettre à jour un post' })
  async updatePost(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePostDto,
    @UploadedFiles() images?: Express.Multer.File[]
  ) {
    return this.postService.updatePost(id, req.user.id, dto, images);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer un post' })
  async deletePost(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.postService.deletePost(id, req.user.id);
  }

  @Post(':id/like')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Liker/Unliker un post' })
  async toggleLike(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.postService.toggleLike(id, req.user.id);
  }

  @Post(':id/comments')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Ajouter un commentaire' })
  async addComment(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateCommentDto
  ) {
    return this.postService.addComment(id, req.user.id, dto);
  }

  @Delete('comments/:commentId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Supprimer un commentaire' })
  async deleteComment(@Request() req, @Param('commentId', ParseIntPipe) commentId: number) {
    return this.postService.deleteComment(commentId, req.user.id);
  }
}
