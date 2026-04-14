import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type { Facture, FactureFormValues } from "src/types/facture";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface GetFactureListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface GetFactureListResponse {
  status: string;
  code: string;
  data: Facture[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
}

interface CreateFactureResponse {
  status: string;
  code: string;
  data: Facture;
  message?: string;
}

interface UpdateFactureResponse {
  status: string;
  code: string;
  data: Facture;
  message?: string;
}

interface DeleteFactureResponse {
  status: string;
  code: string;
  message: string;
}

interface GetFactureResponse {
  status: string;
  code: string;
  data: Facture;
}

export const factureApi = createApi({
  reducerPath: "factureApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Facture", "FactureList"],
  endpoints: (builder) => ({
    // Get all factures with filters
    getFactureList: builder.query<GetFactureListResponse, GetFactureListParams>(
      {
        query: (params) => {
          const searchParams = new URLSearchParams();

          if (params.page) searchParams.append("page", params.page.toString());
          if (params.limit)
            searchParams.append("limit", params.limit.toString());
          if (params.status) searchParams.append("status", params.status);
          if (params.search) searchParams.append("search", params.search);
          if (params.startDate)
            searchParams.append("startDate", params.startDate);
          if (params.endDate) searchParams.append("endDate", params.endDate);

          return {
            url: `/invoices?${searchParams.toString()}`,
            method: "GET",
          };
        },
        providesTags: (result) =>
          result
            ? [
                ...result.data.map(({ id }) => ({
                  type: "Facture" as const,
                  id,
                })),
                { type: "FactureList" as const, id: "LIST" },
              ]
            : [{ type: "FactureList" as const, id: "LIST" }],
      },
    ),

    // Get facture by ID
    getFactureById: builder.query<GetFactureResponse, number>({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Facture", id }],
    }),

    // Create facture
    createFacture: builder.mutation<CreateFactureResponse, FactureFormValues>({
      query: (data) => ({
        url: "/invoices",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "FactureList", id: "LIST" }],
    }),

    // Update facture
    updateFacture: builder.mutation<
      UpdateFactureResponse,
      { id: number; data: Partial<FactureFormValues> }
    >({
      query: ({ id, data }) => ({
        url: `/invoices/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Facture", id },
        { type: "FactureList", id: "LIST" },
      ],
    }),

    // Delete facture
    deleteFacture: builder.mutation<DeleteFactureResponse, number>({
      query: (id) => ({
        url: `/invoices/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Facture", id },
        { type: "FactureList", id: "LIST" },
      ],
    }),

    // Download facture PDF
    downloadFacture: builder.mutation<{ blob: Blob; filename: string }, number>(
      {
        queryFn: async (id) => {
          const token = localStorage.getItem("token");
          const res = await fetch(`${API_BASE}/invoices/${id}/download`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!res.ok) {
            try {
              const err = await res.json().catch(() => ({}));
              return { error: { status: res.status, data: err } as any };
            } catch {
              return {
                error: { status: res.status, data: "Download failed" } as any,
              };
            }
          }
          const disposition = res.headers.get("Content-Disposition");
          const filename =
            disposition?.match(/filename="?([^";]+)"?/)?.[1]?.trim() ??
            `facture-${id}.pdf`;
          const blob = await res.blob();
          return { data: { blob, filename } };
        },
      },
    ),
  }),
});

export const {
  useGetFactureListQuery,
  useGetFactureByIdQuery,
  useCreateFactureMutation,
  useUpdateFactureMutation,
  useDeleteFactureMutation,
  useDownloadFactureMutation,
} = factureApi;
