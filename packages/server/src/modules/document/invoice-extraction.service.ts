import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';

@Injectable()
export class InvoiceExtractionService {
  private readonly extractionApiUrl =
    process.env.INVOICE_EXTRACTION_API_URL || 'http://192.168.1.185:8000/extract-invoice-aws-v3/';

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService
  ) {}

  async extractInvoiceMetadata(documentId: number, companyId: number) {
    // 1. Get document directly by ID (only accountants can extract)
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.isFolder || document.status !== 'active') {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // 2. Check if document is already processed
    if (document.processingStatus === 'traite') {
      // Check if metadata exists and return it
      const existingMetadata = await this.prisma.invoiceMetadata.findUnique({
        where: { documentId: document.id },
      });

      if (existingMetadata) {
        return {
          status: 'success',
          code: '200',
          message: 'Invoice already extracted',
          data: {
            documentId: document.id,
            metadata: existingMetadata,
          },
        };
      }
    }

    try {
      // 3. Download file from MinIO
      const fileStream = await this.minioService.getFileStream(document.url);

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) {
        chunks.push(chunk);
      }
      const fileBuffer = Buffer.concat(chunks);

      // 4. Call external extraction API with proper Node.js FormData
      const formData = new FormData();
      formData.append('files', fileBuffer, {
        filename: document.name,
        contentType: document.mimeType || 'application/pdf',
      });

      console.log(`Calling extraction API: ${this.extractionApiUrl}`);
      console.log(
        `File: ${document.name}, Size: ${fileBuffer.length} bytes, MimeType: ${document.mimeType}`
      );

      const response = await axios.post(this.extractionApiUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: 60000, // 60 seconds timeout
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      console.log('Extraction API response status:', response.status);
      console.log('Extraction API response data:', JSON.stringify(response.data, null, 2));
      const extractedData = response.data;

      // Check if extraction was successful
      if (!extractedData || typeof extractedData !== 'object') {
        throw new Error('API returned empty or invalid response');
      }

      // 5. Update document status to "traite" (extracted but not saved yet)
      await this.prisma.document.update({
        where: { id: document.id },
        data: { processingStatus: 'traite' },
      });

      return {
        status: 'success',
        code: '200',
        message: 'Invoice extracted successfully. Please verify and save the data.',
        data: {
          documentId: document.id,
          extractedData: extractedData,
        },
      };
    } catch (error) {
      console.error('Invoice extraction error:', error);

      // Log more details for axios errors
      if (axios.isAxiosError(error)) {
        console.error('Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message,
        });
      }

      // Save error to database
      try {
        // Check if metadata already exists
        const existingMetadata = await this.prisma.invoiceMetadata.findUnique({
          where: { documentId: document.id },
        });

        if (existingMetadata) {
          // Update existing metadata
          await this.prisma.invoiceMetadata.update({
            where: { documentId: document.id },
            data: {
              extractionStatus: 'failed',
              errorMessage: error.message || 'Unknown error',
            },
          });
        } else {
          // Create new metadata
          await this.prisma.invoiceMetadata.create({
            data: {
              documentId: document.id,
              extractionStatus: 'failed',
              errorMessage: error.message || 'Unknown error',
              rawData: Prisma.JsonNull,
            },
          });
        }
      } catch (dbError) {
        console.error('Failed to save error to database:', dbError);
      }

      if (axios.isAxiosError(error)) {
        const errorDetails = error.response?.data
          ? JSON.stringify(error.response.data)
          : error.message;

        // Check if it's an AWS credentials error
        if (
          errorDetails.includes('UnrecognizedClientException') ||
          errorDetails.includes('security token') ||
          errorDetails.includes('invalid')
        ) {
          throw new ApiError(
            'Extraction API AWS credentials error. Please check the API configuration.',
            503,
            'EXTRACTION_API_UNAVAILABLE'
          );
        }

        throw new ApiError(
          `Extraction API error: ${errorDetails}`,
          error.response?.status || 500,
          'EXTRACTION_API_ERROR'
        );
      }

      throw new ApiError('Failed to extract invoice metadata', 500, 'EXTRACTION_FAILED');
    }
  }

  async getInvoiceMetadata(documentId: number, companyId: number) {
    const metadata = await this.prisma.invoiceMetadata.findUnique({
      where: { documentId },
    });

    if (!metadata) {
      throw new ApiError('Invoice metadata not found', 404, 'METADATA_NOT_FOUND');
    }

    return {
      status: 'success',
      code: '200',
      data: metadata,
    };
  }

  async getDocumentsWithStatus(
    companyId: number,
    processingStatus?: string,
    page: number = 1,
    limit: number = 20
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      isFolder: false,
      status: 'active',
    };

    if (processingStatus) {
      where.processingStatus = processingStatus;
    }

    const totalCount = await this.prisma.document.count({ where });
    const totalPages = Math.ceil(totalCount / limit);

    const documents = await this.prisma.document.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        processingStatus: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      status: 'success',
      code: '200',
      data: documents,
      pagination: {
        currentPage: page,
        totalPages,
        limitPerPage: limit,
        totalCount,
      },
    };
  }

  async synchronizeDocument(documentId: number, companyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    if (document.processingStatus !== 'enregistre') {
      throw new ApiError(
        `Document must be in "enregistre" status to synchronize. Current status: ${document.processingStatus}`,
        400,
        'INVALID_STATUS'
      );
    }

    try {
      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'synchronise' },
      });

      return {
        status: 'success',
        code: '200',
        message: 'Document synchronized successfully',
        data: {
          documentId,
          processingStatus: 'synchronise',
        },
      };
    } catch (error) {
      console.error('Failed to synchronize document:', error);
      throw new ApiError('Failed to synchronize document', 500, 'SYNC_FAILED');
    }
  }

  /**
   * Recalculate invoice totals from line items and update the JSON in place.
   * Keeps the same JSON structure, only updates computed values.
   */
  private recalculateInvoice(data: any): any {
    const result = { ...data };

    const lines: any[] = Array.isArray(result.lin_section) ? result.lin_section : [];

    if (lines.length === 0) return result;

    // Recalculate each line: line_total = qty * unit_price * (1 - discount/100)
    let subtotalHT = 0;
    result.lin_section = lines.map((line: any) => {
      const qty = parseFloat(line.lin_qty) || 0;
      const unitPrice = parseFloat(line.lin_moa?.rff) || 0;
      const discountPct = parseFloat(line.lin_alc?.pcd) || 0;

      const lineTotal = parseFloat((qty * unitPrice * (1 - discountPct / 100)).toFixed(3));
      subtotalHT += lineTotal;

      return {
        ...line,
        lin_qty: qty.toString(),
        lin_moa: {
          ...line.lin_moa,
          rff: unitPrice.toFixed(3), // prix unitaire brut (inchangé)
          lin_total: lineTotal.toFixed(3), // total ligne calculé = qty × prix × (1 - remise%)
        },
      };
    });

    subtotalHT = parseFloat(subtotalHT.toFixed(3));

    // Extract TVA rate from label e.g. "TVA 19%" → 0.19
    let tvaRate = 0;
    const taxEntry = Array.isArray(result.invoice_tax) ? result.invoice_tax[0] : null;
    if (taxEntry?.tax) {
      const match = taxEntry.tax.match(/(\d+(?:\.\d+)?)\s*%/);
      if (match) tvaRate = parseFloat(match[1]) / 100;
    }

    const tvaAmount = parseFloat((subtotalHT * tvaRate).toFixed(3));
    const totalTTC = parseFloat((subtotalHT + tvaAmount).toFixed(3));

    // Update invoice_moa: [0]=HT, [1]=TVA, [2]=TTC
    if (Array.isArray(result.invoice_moa)) {
      const moa = [...result.invoice_moa];
      if (moa[0]) moa[0] = { ...moa[0], moa: subtotalHT.toFixed(3) };
      if (moa[1]) moa[1] = { ...moa[1], moa: tvaAmount.toFixed(3) };
      if (moa[2]) moa[2] = { ...moa[2], moa: totalTTC.toFixed(3) };
      result.invoice_moa = moa;
    }

    // Update invoice_tax amount
    if (Array.isArray(result.invoice_tax) && result.invoice_tax[0]) {
      result.invoice_tax = [
        { ...result.invoice_tax[0], moa: tvaAmount.toFixed(3) },
        ...result.invoice_tax.slice(1),
      ];
    }

    return result;
  }

  /**
   * Parse structured fields from the raw extracted JSON
   * Maps API response fields to InvoiceMetadata columns
   */
  private parseExtractedData(extractedData: any) {
    const data = Array.isArray(extractedData) ? extractedData[0] : extractedData;
    if (!data || typeof data !== 'object') return {};

    const header = data.invoice_header || {};
    const bgm = data.bgm || {};
    const dtm = Array.isArray(data.dtm) ? data.dtm : [];

    const invoiceDateEntry = dtm[0];
    let invoiceDate: Date | null = null;
    if (invoiceDateEntry?.date_periode) {
      const parsed = new Date(invoiceDateEntry.date_periode);
      if (!isNaN(parsed.getTime())) invoiceDate = parsed;
    }

    return {
      msgSenderId: header.msg_sender_id?.toString() || null,
      msgReceiverId: header.msg_receiver_id?.toString() || null,
      invoiceType: bgm.type || null,
      invoiceNumber: bgm.numero || null,
      invoiceDate,
      partners: data.partner_section || null,
      paymentTerms: data.pyt_section || null,
      totalInWords: data.texte || null,
      lineItems: data.lin_section || null,
      amounts: data.invoice_moa || null,
      taxes: data.invoice_tax || null,
    };
  }

  async saveInvoiceMetadata(documentId: number, companyId: number, extractedData: any) {
    // 1. Get document directly by ID (only accountants can save)
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.isFolder || document.status !== 'active') {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // 2. Check if document is in "traite" or "enregistre" status (allow re-save)
    if (!['traite', 'enregistre'].includes(document.processingStatus)) {
      throw new ApiError(
        `Document must be in "traite" or "enregistre" status to save metadata. Current status: ${document.processingStatus}`,
        400,
        'INVALID_STATUS'
      );
    }

    try {
      if (!extractedData || typeof extractedData !== 'object') {
        throw new ApiError('extractedData must be a valid JSON object', 400, 'INVALID_DATA');
      }

      // 3. Recalculate totals from line items (in case user modified lines/prices)
      const recalculated = this.recalculateInvoice(extractedData);

      // 4. Parse structured fields from recalculated data
      const parsedFields = this.parseExtractedData(recalculated);

      const metadataData = {
        rawData: recalculated, // save recalculated JSON
        extractionStatus: 'success',
        errorMessage: null,
        ...parsedFields,
      };

      // 4. Upsert metadata (create or update if already exists)
      const existingMetadata = await this.prisma.invoiceMetadata.findUnique({
        where: { documentId: document.id },
      });

      const metadata = existingMetadata
        ? await this.prisma.invoiceMetadata.update({
            where: { documentId: document.id },
            data: metadataData,
          })
        : await this.prisma.invoiceMetadata.create({
            data: { documentId: document.id, ...metadataData },
          });

      // 5. Update document status to "enregistre"
      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'enregistre' },
      });

      return {
        status: 'success',
        code: '200',
        message: 'Invoice metadata saved successfully',
        data: {
          documentId: document.id,
          metadata,
        },
      };
    } catch (error) {
      console.error('Failed to save invoice metadata:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError('Failed to save invoice metadata', 500, 'SAVE_FAILED');
    }
  }
}
