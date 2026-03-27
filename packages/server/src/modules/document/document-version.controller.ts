import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiQuery,
  ApiResponse,
} from '@nestjs/swagger';
import { DocumentVersionService } from './document-version.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('document-versions')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@Controller('documents/:documentId/versions')
export class DocumentVersionController {
  constructor(private readonly versionService: DocumentVersionService) {}

  /**
   * GET /documents/:documentId/versions
   * Historique complet des versions d'un document
   */
  @Get()
  @ApiOperation({ summary: 'Get version history of a document' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, description: 'Version history returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getVersionHistory(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    const userCompanyId = req.user!.companyId;
    if (!userCompanyId) {
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    }
    return this.versionService.getVersionHistory(documentId, userCompanyId, page ?? 1, limit ?? 20);
  }

  /**
   * POST /documents/:documentId/versions
   * Upload une nouvelle version du fichier
   */
  @Post()
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new version of a document' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'New version file' },
        comment: {
          type: 'string',
          nullable: true,
          example: 'Correction des montants TVA',
          description: 'Optional note about this version',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'New version uploaded' })
  async uploadNewVersion(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('comment') comment?: string
  ) {
    const userId = req.user!.id;
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    }
    if (!file) {
      return { status: 'error', code: '400', message: 'No file provided' };
    }

    return this.versionService.uploadNewVersion(documentId, userId, userCompanyId, file, comment);
  }

  /**
   * POST /documents/:documentId/versions/:versionId/restore
   * Restaurer une ancienne version comme version courante
   */
  @Post(':versionId/restore')
  @ApiOperation({ summary: 'Restore a specific version as the current document' })
  @ApiResponse({ status: 200, description: 'Version restored successfully' })
  @ApiResponse({ status: 404, description: 'Document or version not found' })
  async restoreVersion(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Param('versionId', ParseIntPipe) versionId: number
  ) {
    const userId = req.user!.id;
    const userCompanyId = req.user!.companyId;

    if (!userCompanyId) {
      return { status: 'error', code: '400', message: 'User must belong to a company' };
    }

    return this.versionService.restoreVersion(documentId, versionId, userId, userCompanyId);
  }
}
