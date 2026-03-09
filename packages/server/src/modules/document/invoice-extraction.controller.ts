import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  UseGuards,
  Req,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { InvoiceExtractionService } from './invoice-extraction.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import type { AuthRequest } from '../auth/types/user-type';

@ApiTags('invoice-extraction')
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('invoices')
@ApiBearerAuth('JWT-auth')
export class InvoiceExtractionController {
  constructor(private readonly invoiceExtractionService: InvoiceExtractionService) {}

  @Post('extract/:documentId')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({ summary: 'Extract metadata from an invoice document' })
  @ApiParam({ name: 'documentId', type: Number, description: 'Document ID to extract' })
  async extractInvoice(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.invoiceExtractionService.extractInvoiceMetadata(documentId, companyId);
  }

  @Get('metadata/:documentId')
  @RequirePermission('VIEW_DOCUMENT_DETAIL')
  @ApiOperation({ summary: 'Get extracted metadata for a document' })
  @ApiParam({ name: 'documentId', type: Number, description: 'Document ID' })
  async getMetadata(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.invoiceExtractionService.getInvoiceMetadata(documentId, companyId);
  }

  @Get('status')
  @RequirePermission('VIEW_DOCUMENTS')
  @ApiOperation({ summary: 'Get documents with their processing status' })
  @ApiQuery({
    name: 'processingStatus',
    required: false,
    enum: ['pending', 'traite', 'enregistre', 'synchronise'],
    description: 'Filter by processing status',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getDocumentsWithStatus(
    @Req() req: AuthRequest,
    @Query('processingStatus') processingStatus?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.invoiceExtractionService.getDocumentsWithStatus(
      companyId,
      processingStatus,
      page || 1,
      limit || 20
    );
  }

  @Post('synchronize/:documentId')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({
    summary: 'Synchronize a document (change status from enregistre to synchronise)',
  })
  @ApiParam({ name: 'documentId', type: Number, description: 'Document ID to synchronize' })
  async synchronizeDocument(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.invoiceExtractionService.synchronizeDocument(documentId, companyId);
  }

  @Post('save/:documentId')
  @RequirePermission('UPDATE_DOCUMENT')
  @ApiOperation({
    summary: 'Save invoice metadata after verification (change status from traite to enregistre)',
    description:
      'After extraction, verify the data and call this endpoint to save metadata to database',
  })
  @ApiParam({ name: 'documentId', type: Number, description: 'Document ID' })
  async saveInvoiceMetadata(
    @Req() req: AuthRequest,
    @Param('documentId', ParseIntPipe) documentId: number,
    @Body() body: { extractedData: any }
  ) {
    const companyId = req.user!.companyId;

    if (!companyId) {
      return {
        status: 'error',
        code: '400',
        message: 'User must belong to a company',
      };
    }

    return this.invoiceExtractionService.saveInvoiceMetadata(
      documentId,
      companyId,
      body.extractedData
    );
  }
}
