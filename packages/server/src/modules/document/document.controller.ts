import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { DocumentService } from './document.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthRequest } from '../auth/types/user-type';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('documents')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('documents')
@ApiBearerAuth('JWT-auth')
export class DocumentController {
  constructor(private readonly documentService: DocumentService) {}

  @Post('folders')
  @ApiOperation({ summary: 'Create a new folder' })
  async createFolder(@Req() req: AuthRequest, @Body() dto: CreateFolderDto) {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.createFolder(userId, companyId, dto);
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
        parentId: {
          type: 'number',
          nullable: true,
        },
        category: {
          type: 'string',
          nullable: true,
          description: 'Document category (e.g., facture, contrat, rapport)',
        },
      },
    },
  })
  async uploadFile(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('parentId') parentId?: string,
    @Body('category') category?: string
  ) {
    const userId = req.user!.id;
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    if (!file) {
      return {
        status: 'error',
        code: '400',
        message: 'No file provided',
      };
    }

    const parentIdNum = parentId ? parseInt(parentId) : undefined;

    return this.documentService.uploadFile(userId, companyId, file, parentIdNum, category);
  }

  @Get()
  @RequirePermission('VIEW_DOCUMENTS')
  @ApiOperation({ summary: 'Get documents in a folder with pagination and filters' })
  @ApiQuery({ name: 'parentId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Format: YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Format: YYYY-MM-DD' })
  @ApiQuery({
    name: 'status',
    required: false,
    type: String,
    enum: ['active', 'archived', 'deleted'],
  })
  async getDocuments(
    @Req() req: AuthRequest,
    @Query('parentId', new ParseIntPipe({ optional: true })) parentId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.documentService.getDocuments(
      companyId,
      parentId,
      page || 1,
      limit || 20,
      startDateObj,
      endDateObj,
      status || 'active'
    );
  }

  @Get('archived/all')
  @RequirePermission('VIEW_ARCHIVE')
  @ApiOperation({ summary: 'Get archived documents with hierarchical navigation' })
  @ApiQuery({ name: 'parentId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Format: YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Format: YYYY-MM-DD' })
  async getAllArchivedDocuments(
    @Req() req: AuthRequest,
    @Query('parentId', new ParseIntPipe({ optional: true })) parentId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.documentService.getArchivedDocumentsHierarchical(
      companyId,
      parentId,
      page || 1,
      limit || 20,
      startDateObj,
      endDateObj
    );
  }

  @Get(':id')
  @RequirePermission('VIEW_DOCUMENT_DETAIL')
  @ApiOperation({ summary: 'Get document details' })
  async getDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.getDocument(id, companyId);
  }

  @Get(':id/breadcrumb')
  @ApiOperation({ summary: 'Get breadcrumb path for a document' })
  async getBreadcrumb(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.getBreadcrumb(id, companyId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  async downloadFile(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return res.status(400).json({
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      });
    }

    const { stream, filename, mimeType } = await this.documentService.downloadFile(id, companyId);

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    stream.pipe(res);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update document (rename or move)' })
  async updateDocument(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateDocumentDto
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.updateDocument(id, companyId, dto);
  }

  @Delete(':id')
  @RequirePermission('DELETE_DOCUMENT')
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.deleteDocument(id, companyId);
  }

  @Post(':id/archive')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({ summary: 'Archive document or folder (with all children)' })
  async archiveDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.archiveDocument(id, companyId);
  }

  @Post(':id/unarchive')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({ summary: 'Unarchive document or folder (with all children)' })
  async unarchiveDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.unarchiveDocument(id, companyId);
  }
}
