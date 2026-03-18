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
  data: InvoiceMetadataDto;
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

export const invoicesApi = createApi({
  reducerPath: "invoicesApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["InvoiceMetadata", "InvoiceStatus", "Documents"],
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
  }),
});

export const {
  useExtractInvoiceMutation,
  useGetInvoiceMetadataQuery,
  useLazyGetInvoiceMetadataQuery,
  useGetDocumentsStatusQuery,
  useSaveInvoiceMetadataMutation,
  useSynchronizeDocumentMutation,
} = invoicesApi;
