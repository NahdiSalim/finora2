import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface ClientInvoiceStats {
  clientId: number;
  clientName: string;
  clientLogo: string | null;
  clientEmail: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
  invoiceStats: {
    traite: number;
    pending: number;
    total: number;
  };
  relationshipId: number;
  relationshipStart: string;
}

export interface ClientsInvoiceStatsResponse {
  success: boolean;
  data: ClientInvoiceStats[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const relationshipsApi = createApi({
  reducerPath: "relationshipsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ClientsInvoiceStats"],
  endpoints: (builder) => ({
    getClientsInvoiceStats: builder.query<
      ClientsInvoiceStatsResponse,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 8 } = {}) => {
        const params = new URLSearchParams();
        params.append("page", String(page));
        params.append("limit", String(limit));
        return {
          url: `/relationships/clients/invoice-stats?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ clientId }) => ({
                type: "ClientsInvoiceStats" as const,
                id: clientId,
              })),
              { type: "ClientsInvoiceStats", id: "LIST" },
            ]
          : [{ type: "ClientsInvoiceStats", id: "LIST" }],
    }),
  }),
});

export const { useGetClientsInvoiceStatsQuery } = relationshipsApi;
