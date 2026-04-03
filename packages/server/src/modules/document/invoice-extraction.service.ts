import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../../common/services/minio.service';
import { ApiError } from '../../common/errors/api-error';
import { Prisma } from '@prisma/client';
import axios from 'axios';
import FormData from 'form-data';
import { NotificationService } from '../notification/notification.service';
import { MSG } from '../../common/messages';

@Injectable()
export class InvoiceExtractionService {
  private readonly extractionApiUrl =
    process.env.INVOICE_EXTRACTION_API_URL || 'http://192.168.1.185:8000/extract-invoice-aws-v3/';

  constructor(
    private prisma: PrismaService,
    private minioService: MinioService,
    private notificationService: NotificationService
  ) {}

  async extractInvoiceMetadata(documentId: number, companyId: number) {
    // 1. Get document directly by ID (only accountants can extract)
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document || document.isFolder || document.status !== 'active') {
      throw new ApiError(MSG.document.not_found, 404, 'DOCUMENT_NOT_FOUND');
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
          message: MSG.invoice.already_extracted,
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
        message: MSG.invoice.extracted,
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

      throw new ApiError(MSG.invoice.extraction_failed, 500, 'EXTRACTION_FAILED');
    }
  }

  /**
   * Empty invoice JSON structure returned when extraction fails
   */
  private emptyInvoiceJson() {
    return {
      invoice_header: { msg_sender_id: null, msg_receiver_id: null },
      bgm: { type: null, numero: null },
      dtm: [],
      partner_section: [],
      loc_section: null,
      pyt_section: [],
      texte: null,
      special_conditions: null,
      lin_section: [],
      invoice_moa: [],
      invoice_tax: [],
      invoice_alc: null,
      additional_documents: null,
      ref_ttn_val: null,
    };
  }

  /**
   * Extract invoice and auto-save to DB (used after upload).
   * - Success → saves real data, processingStatus = 'enregistre'
   * - Failure → saves empty JSON, extractionStatus = 'failed'
   */
  async extractAndSaveInvoice(documentId: number, companyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        isFolder: true,
        status: true,
        url: true,
        name: true,
        mimeType: true,
        createdBy: true,
      },
    });
    if (!document || document.isFolder || document.status !== 'active') return;

    try {
      // Download from MinIO
      const fileStream = await this.minioService.getFileStream(document.url);
      const chunks: Buffer[] = [];
      for await (const chunk of fileStream) chunks.push(chunk);
      const fileBuffer = Buffer.concat(chunks);

      // Call extraction API
      const formData = new FormData();
      formData.append('files', fileBuffer, {
        filename: document.name,
        contentType: document.mimeType || 'application/pdf',
      });

      const response = await axios.post(this.extractionApiUrl, formData, {
        headers: { ...formData.getHeaders() },
        timeout: 120000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      const extractedData = response.data;
      if (!extractedData || typeof extractedData !== 'object') {
        throw new Error('API returned empty or invalid response');
      }

      // Recalculate totals
      const recalculated = this.recalculateInvoice(extractedData);
      const parsedFields = this.parseExtractedData(recalculated);

      // Upsert metadata
      const existing = await this.prisma.invoiceMetadata.findUnique({ where: { documentId } });
      if (existing) {
        await this.prisma.invoiceMetadata.update({
          where: { documentId },
          data: {
            rawData: recalculated,
            extractionStatus: 'success',
            errorMessage: null,
            ...parsedFields,
          },
        });
      } else {
        await this.prisma.invoiceMetadata.create({
          data: {
            documentId,
            rawData: recalculated,
            extractionStatus: 'success',
            errorMessage: null,
            ...parsedFields,
          },
        });
      }

      // Update document status to 'traite' — stays here until user clicks save
      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'traite', extractionStatus: 'done' },
      });

      console.log(` Auto-extraction complete for document ${documentId}`);

      // Notify the user who uploaded the document
      if (document.createdBy) {
        const fileUrl = await this.minioService
          .getPresignedUrl(document.url, 7 * 24 * 60 * 60)
          .catch(() => null);
        this.notificationService
          .notify({
            recipientId: document.createdBy,
            type: 'invoice',
            action: 'extracted',
            data: { fileName: document.name, fileUrl },
          })
          .catch(() => {});
      }
    } catch (error) {
      console.error(`✗ Auto-extraction failed for document ${documentId}:`, error);

      // Save empty JSON so GET returns 'failed' instead of 'pending'
      const emptyJson = this.emptyInvoiceJson();
      const existing = await this.prisma.invoiceMetadata
        .findUnique({ where: { documentId } })
        .catch(() => null);
      if (existing) {
        await this.prisma.invoiceMetadata
          .update({
            where: { documentId },
            data: {
              rawData: emptyJson,
              extractionStatus: 'failed',
              errorMessage: error.message || 'Unknown error',
            },
          })
          .catch(() => {});
      } else {
        await this.prisma.invoiceMetadata
          .create({
            data: {
              documentId,
              rawData: emptyJson,
              extractionStatus: 'failed',
              errorMessage: error.message || 'Unknown error',
            },
          })
          .catch(() => {});
      }

      await this.prisma.document
        .update({
          where: { id: documentId },
          data: { processingStatus: 'traite', extractionStatus: 'failed' },
        })
        .catch(() => {});

      // Notify the user who uploaded the document
      if (document.createdBy) {
        const fileUrl = await this.minioService
          .getPresignedUrl(document.url, 7 * 24 * 60 * 60)
          .catch(() => null);
        this.notificationService
          .notify({
            recipientId: document.createdBy,
            type: 'invoice',
            action: 'extraction_failed',
            data: { documentId, fileName: document.name, fileUrl },
          })
          .catch(() => {});
      }
    }
  }

  /**
   * Get invoice metadata by documentId.
   * Returns extractionStatus: 'done' | 'pending' | 'failed' from Document.extractionStatus
   */
  async getInvoiceMetadata(documentId: number, companyId: number) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, extractionStatus: true },
    });

    if (!document) {
      throw new ApiError(MSG.document.not_found, 404, 'DOCUMENT_NOT_FOUND');
    }

    const extractionStatus = document.extractionStatus || 'pending';

    // If pending, no metadata yet
    if (extractionStatus === 'pending') {
      return {
        status: 'success',
        code: '200',
        data: { documentId, extractionStatus: 'pending', metadata: null },
      };
    }

    // done or failed — return metadata (real or empty JSON)
    const metadata = await this.prisma.invoiceMetadata.findUnique({ where: { documentId } });

    return {
      status: 'success',
      code: '200',
      data: { documentId, extractionStatus, metadata: metadata ?? null },
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
      throw new ApiError(MSG.document.not_found, 404, 'DOCUMENT_NOT_FOUND');
    }

    if (document.processingStatus !== 'enregistre') {
      throw new ApiError(
        MSG.invoice.invalid_sync_status(document.processingStatus),
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
        message: MSG.invoice.synchronized,
        data: {
          documentId,
          processingStatus: 'synchronise',
        },
      };
    } catch (error) {
      console.error('Failed to synchronize document:', error);
      throw new ApiError(MSG.invoice.sync_failed, 500, 'SYNC_FAILED');
    }
  }

  /**
   * Enrich invoice JSON with computed line totals.
   *
   * Structure réelle (confirmée par exemple de facture) :
   *   lin_moa.rff        = prix unitaire HT brut (avant remise)
   *   lin_qty            = quantité
   *   lin_alc.pcd        = remise en % (ex: "10.0")
   *   lin_total (ajouté) = qty × unitPrice × (1 - pcd/100)
   *
   *   invoice_moa[0].moa = Total HT  (déjà calculé par l'API)
   *   invoice_moa[1].moa = Total TVA (déjà calculé par l'API)
   *   invoice_moa[2].moa = Total TTC (déjà calculé par l'API)
   *
   *   invoice_tax[].moa  = montant TVA par taux (déjà calculé par l'API)
   *
   * On ne recalcule PAS les totaux globaux — l'API les fournit déjà correctement.
   * On ajoute seulement lin_total sur chaque ligne pour l'affichage front.
   * Si l'utilisateur modifie des lignes (saveInvoiceMetadata), on recalcule tout.
   */
  private recalculateInvoice(data: any): any {
    const result = { ...data };

    const lines: any[] = Array.isArray(result.lin_section) ? result.lin_section : [];

    result.lin_section = lines.map((line: any) => {
      const qty = parseFloat(line.lin_qty) || 0;
      // Support both new format (lin_unit_price) and old format (lin_moa.rff)
      const unitPrice = parseFloat(line.lin_unit_price ?? line.lin_moa?.rff) || 0;
      const discountPct = parseFloat(line.lin_alc?.pcd) || 0;
      const lineTotal = parseFloat((qty * unitPrice * (1 - discountPct / 100)).toFixed(3));

      return {
        ...line,
        lin_moa: {
          ...line.lin_moa,
          rff: unitPrice.toFixed(3),
          lin_total: lineTotal.toFixed(3),
        },
      };
    });

    return result;
  }

  /**
   * Recalculate ALL totals from scratch (used when user modifies lines in saveInvoiceMetadata).
   * lin_moa.rff = prix unitaire HT brut
   * lin_qty     = quantité
   * lin_alc.pcd = remise %
   * invoice_tax[].tax = "TVA 19%" → taux extrait par regex
   */
  private recalculateInvoiceFromLines(data: any): { result: any; warnings: string[] } {
    const result = { ...data };
    const warnings: string[] = [];

    const lines: any[] = Array.isArray(result.lin_section) ? result.lin_section : [];

    // ── 1. Validate & recalculate each line ──────────────────────────────────
    let totalHT = 0;
    result.lin_section = lines.map((line: any, idx: number) => {
      const label = line.lin_imd || `Ligne ${idx + 1}`;

      const rawQty = line.lin_qty;
      // Support both new format (lin_unit_price) and old format (lin_moa.rff)
      const rawPrice = line.lin_unit_price ?? line.lin_moa?.rff;
      const rawDiscount = line.lin_alc?.pcd;

      const qty = parseFloat(rawQty);
      const unitPrice = parseFloat(rawPrice);
      const discountPct = parseFloat(rawDiscount) || 0;

      // Validate qty
      if (isNaN(qty) || qty < 0) {
        warnings.push(`${label}: quantité invalide ("${rawQty}") — remplacée par 0`);
      }
      // Validate unit price
      if (isNaN(unitPrice) || unitPrice < 0) {
        warnings.push(`${label}: prix unitaire invalide ("${rawPrice}") — remplacé par 0`);
      }
      // Validate discount
      if (discountPct < 0 || discountPct > 100) {
        warnings.push(`${label}: remise invalide (${discountPct}%) — doit être entre 0 et 100`);
      }

      const safeQty = isNaN(qty) || qty < 0 ? 0 : qty;
      const safePrice = isNaN(unitPrice) || unitPrice < 0 ? 0 : unitPrice;
      const safeDiscount = discountPct < 0 || discountPct > 100 ? 0 : discountPct;

      const lineTotal = parseFloat((safeQty * safePrice * (1 - safeDiscount / 100)).toFixed(3));

      // Warn if front sent a wrong lin_total
      const frontLinTotal = parseFloat(line.lin_moa?.lin_total);
      if (!isNaN(frontLinTotal) && Math.abs(frontLinTotal - lineTotal) > 0.01) {
        warnings.push(
          `${label}: total ligne corrigé (envoyé: ${frontLinTotal}, calculé: ${lineTotal})`
        );
      }

      totalHT += lineTotal;

      return {
        ...line,
        lin_qty: safeQty.toString(),
        lin_unit_price: safePrice.toFixed(3),
        lin_moa: {
          ...line.lin_moa,
          rff: safePrice.toFixed(3),
          lin_total: lineTotal.toFixed(3),
        },
        lin_alc: line.lin_alc ? { ...line.lin_alc, pcd: safeDiscount.toFixed(3) } : line.lin_alc,
      };
    });

    totalHT = parseFloat(totalHT.toFixed(3));

    // ── 2. Validate & recalculate each tax entry ─────────────────────────────
    let totalTVA = 0;
    if (Array.isArray(result.invoice_tax)) {
      result.invoice_tax = result.invoice_tax.map((taxEntry: any) => {
        const taxLabel: string = taxEntry?.tax ?? '';
        const pctMatch = taxLabel.match(/(\d+(?:\.\d+)?)\s*%/);

        let tvaAmount: number;
        if (pctMatch) {
          // Percentage-based tax (e.g. "TVA 19%")
          const tvaRate = parseFloat(pctMatch[1]) / 100;
          tvaAmount = parseFloat((totalHT * tvaRate).toFixed(3));

          const frontTva = parseFloat(taxEntry.moa);
          if (!isNaN(frontTva) && Math.abs(frontTva - tvaAmount) > 0.01) {
            warnings.push(
              `TVA (${taxLabel}): montant corrigé (envoyé: ${frontTva}, calculé: ${tvaAmount})`
            );
          }
        } else {
          // Fixed amount tax (e.g. "Droit de Timbre") — keep as-is
          tvaAmount = parseFloat(taxEntry.moa) || 0;
        }

        totalTVA += tvaAmount;
        return { ...taxEntry, moa: tvaAmount.toFixed(3) };
      });
    }

    totalTVA = parseFloat(totalTVA.toFixed(3));
    const totalTTC = parseFloat((totalHT + totalTVA).toFixed(3));

    // ── 3. Validate invoice_moa totals sent by front ─────────────────────────
    const existingMoa = Array.isArray(result.invoice_moa) ? result.invoice_moa : [];

    const frontHT = parseFloat(existingMoa[0]?.moa);
    const frontTVA = parseFloat(existingMoa[1]?.moa);
    const frontTTC = parseFloat(existingMoa[2]?.moa);

    if (!isNaN(frontHT) && Math.abs(frontHT - totalHT) > 0.01) {
      warnings.push(`Total HT corrigé (envoyé: ${frontHT}, calculé: ${totalHT})`);
    }
    if (!isNaN(frontTVA) && Math.abs(frontTVA - totalTVA) > 0.01) {
      warnings.push(`Total TVA corrigé (envoyé: ${frontTVA}, calculé: ${totalTVA})`);
    }
    if (!isNaN(frontTTC) && Math.abs(frontTTC - totalTTC) > 0.01) {
      warnings.push(`Total TTC corrigé (envoyé: ${frontTTC}, calculé: ${totalTTC})`);
    }

    // Always write correct totals
    result.invoice_moa = [
      { ...(existingMoa[0] ?? {}), moa: totalHT.toFixed(3) },
      { ...(existingMoa[1] ?? {}), moa: totalTVA.toFixed(3) },
      { ...(existingMoa[2] ?? {}), moa: totalTTC.toFixed(3) },
    ];

    return { result, warnings };
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
      throw new ApiError(MSG.document.not_found, 404, 'DOCUMENT_NOT_FOUND');
    }

    try {
      if (!extractedData || typeof extractedData !== 'object') {
        throw new ApiError(MSG.invoice.invalid_data, 400, 'INVALID_DATA');
      }

      // 3. Recalculate totals from line items (user may have modified lines/prices/quantities)
      const { result: recalculated, warnings } = this.recalculateInvoiceFromLines(extractedData);

      // 4. Parse structured fields from recalculated data
      const parsedFields = this.parseExtractedData(recalculated);

      const metadataData = {
        rawData: recalculated, // save recalculated JSON
        extractionStatus: 'success',
        errorMessage: null,
        ...parsedFields,
      };

      // 5. Upsert metadata (create or update if already exists)
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

      // 6. Update document status to "enregistre"
      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'enregistre' },
      });

      return {
        status: 'success',
        code: '200',
        message: MSG.invoice.saved,
        data: {
          documentId: document.id,
          metadata,
          ...(warnings.length > 0 && { warnings }),
        },
      };
    } catch (error) {
      console.error('Failed to save invoice metadata:', error);
      if (error instanceof ApiError) throw error;
      throw new ApiError(MSG.invoice.save_failed, 500, 'SAVE_FAILED');
    }
  }
}
