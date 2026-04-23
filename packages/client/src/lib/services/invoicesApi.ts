import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export type ProcessingStatus =
  | "pending"
  | "traite"
  | "enregistre"
  | "synchronise";

export interface DocumentWithStatus {
  id: number;
  name: string;
  processingStatus: ProcessingStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GetDocumentsStatusResponse {
  status: string;
  code: string;
  data: DocumentWithStatus[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
}

export interface InvoiceMetadataDto {
  id?: number;
  documentId?: number;
  msgSenderId?: string | null;
  msgReceiverId?: string | null;
  invoiceType?: string | null;
  invoiceNumber?: string | null;
  invoiceDate?: string | null;
  partners?: unknown;
  paymentTerms?: unknown;
  totalInWords?: string | null;
  lineItems?: unknown;
  amounts?: unknown;
  taxes?: unknown;
  rawData?: unknown;
  extractionStatus?: string;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface GetInvoiceMetadataResponse {
  status: string;
  code: string;
  data:
    | InvoiceMetadataDto
    | {
        documentId: number;
        extractionStatus: string;
        metadata: InvoiceMetadataDto;
      };
}

export interface ExtractInvoiceResponse {
  status: string;
  code: string;
  message?: string;
  data?: {
    documentId: number;
    extractedData?: unknown;
    metadata?: InvoiceMetadataDto;
  };
}

export interface SaveInvoiceResponse {
  status: string;
  code: string;
  message?: string;
  data?: { documentId: number; metadata: InvoiceMetadataDto };
}

export interface SynchronizeDocumentResponse {
  status: string;
  code: string;
  message?: string;
  data?: { documentId: number; processingStatus: ProcessingStatus };
}

// ─── Invoice list types (matches POST /api/invoices + GET /api/invoices) ────────

export interface InvoiceLine {
  id: number;
  invoiceId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  order: number;
}

export interface InvoiceCompany {
  name: string;
  legalName: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  invoiceTemplate?: string | null;
}

export interface InvoiceSupplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  /** Backend values: "draft" | "paid" | "partial" | "overdue" */
  status: string;
  dueDate: string;
  vatRate: number;
  discountType: string | null;
  discountValue: number | null;
  subtotal: number;
  discountAmount: number | null;
  vatAmount: number;
  total: number;
  amountPaid: number;
  remainingAmount: number;
  notes: string | null;
  supplierId: number;
  companyId: number;
  createdById: number;
  createdAt: string;
  updatedAt: string;
  lines: InvoiceLine[];
  company: InvoiceCompany | null;
  supplier?: InvoiceSupplier | null;
}

export interface GetInvoicesResponse {
  data: Invoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface InvoiceAnalytics {
  totalInvoices: number;
  totalRevenue: number;
  totalPaid: number;
  totalRemaining: number;
  counts: {
    draft: number;
    paid: number;
    partial: number;
    overdue: number;
    cancelled: number;
  };
}

export interface GetInvoicesListResponse {
  status: string;
  code: string;
  data: Invoice[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
  counts: {
    draft: number;
    sent: number;
    paid: number;
    partial: number;
    overdue: number;
    cancelled: number;
  };
  analytics: InvoiceAnalytics;
}

export interface CreateInvoiceLineRequest {
  description: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateInvoiceRequest {
  invoiceNumber: string;
  /** Backend values: "draft" | "sent" | "paid" | "partial" | "overdue" | "cancelled" */
  status?: string;
  /** YYYY-MM-DD */
  dueDate: string;
  vatRate: number;
  discountType?: string;
  discountValue?: number;
  notes?: string;
  supplierId: number;
  amountPaid?: number;
  lines: CreateInvoiceLineRequest[];
}

export const invoicesApi = createApi({
  reducerPath: "invoicesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["InvoiceMetadata", "InvoiceStatus", "Documents", "Invoices"],
  endpoints: (builder) => ({
    extractInvoice: builder.mutation<ExtractInvoiceResponse, number>({
      query: (documentId) => ({
        url: `/invoices/extract/${documentId}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _err, documentId) => [
        { type: "InvoiceMetadata", id: documentId },
        { type: "InvoiceStatus" },
        { type: "Documents" },
      ],
    }),

    getInvoiceMetadata: builder.query<GetInvoiceMetadataResponse, number>({
      query: (documentId) => ({
        url: `/invoices/metadata/${documentId}`,
        method: "GET",
      }),
      providesTags: (_result, _err, documentId) => [
        { type: "InvoiceMetadata", id: documentId },
      ],
    }),

    getDocumentsStatus: builder.query<
      GetDocumentsStatusResponse,
      {
        processingStatus?: ProcessingStatus;
        page?: number;
        limit?: number;
      } | void
    >({
      query: (params = {}) => {
        const searchParams = new URLSearchParams();
        if (params?.processingStatus)
          searchParams.set("processingStatus", params.processingStatus);
        if (params?.page != null) searchParams.set("page", String(params.page));
        if (params?.limit != null)
          searchParams.set("limit", String(params.limit));
        const qs = searchParams.toString();
        return {
          url: `/invoices/status${qs ? `?${qs}` : ""}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((d) => ({
                type: "InvoiceStatus" as const,
                id: d.id,
              })),
              { type: "InvoiceStatus", id: "LIST" },
            ]
          : [{ type: "InvoiceStatus", id: "LIST" }],
    }),

    saveInvoiceMetadata: builder.mutation<
      SaveInvoiceResponse,
      { documentId: number; extractedData: unknown }
    >({
      query: ({ documentId, extractedData }) => ({
        url: `/invoices/save/${documentId}`,
        method: "POST",
        body: { extractedData },
      }),
      invalidatesTags: (_result, _err, { documentId }) => [
        { type: "InvoiceMetadata", id: documentId },
        { type: "InvoiceStatus" },
        { type: "Documents" },
      ],
    }),

    synchronizeDocument: builder.mutation<SynchronizeDocumentResponse, number>({
      query: (documentId) => ({
        url: `/invoices/synchronize/${documentId}`,
        method: "POST",
      }),
      invalidatesTags: (_result, _err, documentId) => [
        { type: "InvoiceMetadata", id: documentId },
        { type: "InvoiceStatus" },
        { type: "Documents" },
      ],
    }),

    createInvoice: builder.mutation<Invoice, CreateInvoiceRequest>({
      query: (body) => ({
        url: "/invoices",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Invoices", id: "LIST" }],
    }),

    publishInvoice: builder.mutation<
      { status: string; code: string; data: Invoice; message: string },
      { id: number; status: string }
    >({
      query: ({ id, status }) => ({
        url: `/invoices/${id}/publish`,
        method: "POST",
        body: { status },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Invoices", id },
        { type: "Invoices", id: "LIST" },
      ],
    }),

    getInvoices: builder.query<
      GetInvoicesListResponse,
      {
        page?: number;
        limit?: number;
        status?: string;
        search?: string;
      } | void
    >({
      query: (params = {}) => {
        const sp = new URLSearchParams();
        if (params?.page != null) sp.set("page", String(params.page));
        if (params?.limit != null) sp.set("limit", String(params.limit));
        if (params?.status) sp.set("status", params.status);
        if (params?.search) sp.set("search", params.search);
        const qs = sp.toString();
        return { url: `/invoices${qs ? `?${qs}` : ""}`, method: "GET" };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((inv) => ({
                type: "Invoices" as const,
                id: inv.id,
              })),
              { type: "Invoices", id: "LIST" },
            ]
          : [{ type: "Invoices", id: "LIST" }],
    }),
  }),
});

export const {
  useExtractInvoiceMutation,
  useGetInvoiceMetadataQuery,
  useLazyGetInvoiceMetadataQuery,
  useGetDocumentsStatusQuery,
  useSaveInvoiceMetadataMutation,
  useSynchronizeDocumentMutation,
  useCreateInvoiceMutation,
  usePublishInvoiceMutation,
  useGetInvoicesQuery,
} = invoicesApi;
