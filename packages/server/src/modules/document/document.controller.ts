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
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.createFolder(userId, userCompanyId, dto);
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
        clientCompanyId: {
          type: 'number',
          nullable: true,
          description: 'Client company ID (required for accountants, ignored for clients)',
        },
      },
    },
  })
  async uploadFile(
    @Req() req: AuthRequest,
    @UploadedFile() file: Express.Multer.File,
    @Body('parentId') parentId?: string,
    @Body('category') category?: string,
    @Body('clientCompanyId') clientCompanyId?: string
  ) {
    const userId = req.user!.id;
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
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
    const clientCompanyIdNum = clientCompanyId ? parseInt(clientCompanyId) : undefined;

    return this.documentService.uploadFile(
      userId,
      userCompanyId,
      file,
      parentIdNum,
      category,
      clientCompanyIdNum
    );
  }

  @Get('client')
  @RequirePermission('VIEW_DOCUMENTS')
  @ApiOperation({ summary: 'Get all documents for a client (accountant view)' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by folder or file name',
  })
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
    @Query('clientId', new ParseIntPipe({ optional: true })) clientId?: number,
    @Query('search') search?: string,
    @Query('parentId', new ParseIntPipe({ optional: true })) parentId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string
  ) {
    const userId = req.user!.id;
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    // If clientId provided, accountant is viewing client's documents
    const targetCompanyId = clientId || userCompanyId;

    // If clientId is different from user's company, validate relationship
    if (clientId && clientId !== userCompanyId) {
      const relationship = await this.documentService.validateAccountantClientRelationship(
        userCompanyId,
        clientId
      );
      if (!relationship) {
        return {
          status: 'error',
          code: '403',
          message: 'No active relationship with this client',
        };
      }
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.documentService.getDocuments(
      targetCompanyId,
      userId,
      parentId,
      page || 1,
      limit || 20,
      startDateObj,
      endDateObj,
      status || 'active',
      search
    );
  }

  @Get('archived/all')
  @RequirePermission('VIEW_ARCHIVE')
  @ApiOperation({ summary: 'Get archived documents with hierarchical navigation' })
  @ApiQuery({
    name: 'clientId',
    required: false,
    type: Number,
    description: 'Client company ID (for accountants to view client archived documents)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Search by folder or file name',
  })
  @ApiQuery({ name: 'parentId', required: false, type: Number })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Format: YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Format: YYYY-MM-DD' })
  async getAllArchivedDocuments(
    @Req() req: AuthRequest,
    @Query('clientId', new ParseIntPipe({ optional: true })) clientId?: number,
    @Query('search') search?: string,
    @Query('parentId', new ParseIntPipe({ optional: true })) parentId?: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    // If clientId provided, accountant is viewing client's archived documents
    const targetCompanyId = clientId || userCompanyId;

    // If clientId is different from user's company, validate relationship
    if (clientId && clientId !== userCompanyId) {
      const relationship = await this.documentService.validateAccountantClientRelationship(
        userCompanyId,
        clientId
      );
      if (!relationship) {
        return {
          status: 'error',
          code: '403',
          message: 'No active relationship with this client',
        };
      }
    }

    const startDateObj = startDate ? new Date(startDate) : undefined;
    const endDateObj = endDate ? new Date(endDate) : undefined;

    return this.documentService.getArchivedDocumentsHierarchical(
      targetCompanyId,
      parentId,
      page || 1,
      limit || 20,
      startDateObj,
      endDateObj,
      search
    );
  }

  @Get(':id')
  @RequirePermission('VIEW_DOCUMENT_DETAIL')
  @ApiOperation({ summary: 'Get document details' })
  async getDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.getDocument(id, userCompanyId);
  }

  @Get(':id/breadcrumb')
  @ApiOperation({ summary: 'Get breadcrumb path for a document' })
  async getBreadcrumb(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.getBreadcrumb(id, userCompanyId);
  }

  @Get(':id/download')
  @ApiOperation({ summary: 'Download a file' })
  async downloadFile(
    @Req() req: AuthRequest,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return res.status(400).json({
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      });
    }

    const { stream, filename, mimeType } = await this.documentService.downloadFile(
      id,
      userCompanyId
    );

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
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.updateDocument(id, userCompanyId, dto);
  }

  @Delete(':id')
  @RequirePermission('DELETE_DOCUMENT')
  @ApiOperation({ summary: 'Delete document' })
  async deleteDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.deleteDocument(id, userCompanyId);
  }

  @Post(':id/archive')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({ summary: 'Archive document or folder (with all children)' })
  async archiveDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.archiveDocument(id, userCompanyId);
  }

  @Post(':id/unarchive')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({ summary: 'Unarchive document or folder (with all children)' })
  async unarchiveDocument(@Req() req: AuthRequest, @Param('id', ParseIntPipe) id: number) {
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.documentService.unarchiveDocument(id, userCompanyId);
  }
}
