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

  /**
   * Extract invoice metadata from a document
   */
  async extractInvoiceMetadata(documentId: number, companyId: number) {
    // 1. Get document from database
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        companyId,
        isFolder: false,
        status: 'active',
      },
    });

    if (!document) {
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

        throw new ApiError(
          `Extraction API error: ${errorDetails}`,
          error.response?.status || 500,
          'EXTRACTION_API_ERROR'
        );
      }

      throw new ApiError('Failed to extract invoice metadata', 500, 'EXTRACTION_FAILED');
    }
  }

  /**
   * Get invoice metadata for a document
   */
  async getInvoiceMetadata(documentId: number, companyId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        companyId,
      },
      include: {
        invoiceMetadata: true,
      },
    });

    if (!document) {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    if (!document.invoiceMetadata) {
      throw new ApiError('No metadata found for this document', 404, 'METADATA_NOT_FOUND');
    }

    return {
      status: 'success',
      code: '200',
      data: document.invoiceMetadata,
    };
  }

  /**
   * Get all documents with their processing status
   */
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

    const [total, documents] = await Promise.all([
      this.prisma.document.count({ where }),
      this.prisma.document.findMany({
        where,
        skip,
        take: limit,
        include: {
          invoiceMetadata: {
            select: {
              id: true,
              invoiceNumber: true,
              invoiceDate: true,
              extractionStatus: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
    ]);

    return {
      status: 'success',
      code: '200',
      data: documents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Synchronize a document (change status from traite to synchronise)
   */
  async synchronizeDocument(documentId: number, companyId: number) {
    // 1. Get document from database
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        companyId,
        isFolder: false,
        status: 'active',
      },
    });

    if (!document) {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // 2. Check if document is in "traite" status
    if (document.processingStatus !== 'traite') {
      throw new ApiError(
        `Document must be in "traite" status to synchronize. Current status: ${document.processingStatus}`,
        400,
        'INVALID_STATUS'
      );
    }

    // 3. Update document status to "synchronise"
    const updatedDocument = await this.prisma.document.update({
      where: { id: documentId },
      data: { processingStatus: 'synchronise' },
      include: {
        invoiceMetadata: true,
      },
    });

    return {
      status: 'success',
      code: '200',
      message: 'Document synchronized successfully',
      data: updatedDocument,
    };
  }

  /**
   * Save invoice metadata after verification (change status from traite to enregistre)
   */
  async saveInvoiceMetadata(documentId: number, companyId: number, extractedData: any) {
    // 1. Get document from database
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        companyId,
        isFolder: false,
        status: 'active',
      },
    });

    if (!document) {
      throw new ApiError('Document not found', 404, 'DOCUMENT_NOT_FOUND');
    }

    // 2. Check if document is in "traite" status
    if (document.processingStatus !== 'traite') {
      throw new ApiError(
        `Document must be in "traite" status to save metadata. Current status: ${document.processingStatus}`,
        400,
        'INVALID_STATUS'
      );
    }

    try {
      // 3. Save or update metadata in database
      const metadataData = {
        msgSenderId: extractedData.invoice_header?.msg_sender_id || null,
        msgReceiverId: extractedData.invoice_header?.msg_receiver_id || null,
        invoiceType: extractedData.bgm?.type || null,
        invoiceNumber: extractedData.bgm?.numero || null,
        invoiceDate: extractedData.dtm?.[0]?.date_periode
          ? new Date(extractedData.dtm[0].date_periode)
          : null,
        partners: extractedData.partner_section || null,
        paymentTerms: extractedData.pyt_section || null,
        totalInWords: extractedData.texte || null,
        lineItems: extractedData.lin_section || null,
        amounts: extractedData.invoice_moa || null,
        taxes: extractedData.invoice_tax || null,
        rawData: extractedData,
        extractionStatus: 'success',
        errorMessage: null,
      };

      // Check if metadata already exists
      const existingMetadata = await this.prisma.invoiceMetadata.findUnique({
        where: { documentId: document.id },
      });

      const metadata = existingMetadata
        ? await this.prisma.invoiceMetadata.update({
            where: { documentId: document.id },
            data: metadataData,
          })
        : await this.prisma.invoiceMetadata.create({
            data: {
              documentId: document.id,
              ...metadataData,
            },
          });

      // 4. Update document status to "enregistre"
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
      throw new ApiError('Failed to save invoice metadata', 500, 'SAVE_FAILED');
    }
  }
}
