import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type { Devis, DevisFormValues } from "src/types/devis";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

interface GetDevisListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

interface GetDevisListResponse {
  status: string;
  code: string;
  data: Devis[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
  counts: {
    en_attente: number;
    accepte: number;
    refuse: number;
  };
}

interface CreateDevisResponse {
  status: string;
  code: string;
  data: Devis;
  message?: string;
}

interface UpdateDevisResponse {
  status: string;
  code: string;
  data: Devis;
  message?: string;
}

interface DeleteDevisResponse {
  status: string;
  code: string;
  message: string;
}

interface GetDevisResponse {
  status: string;
  code: string;
  data: Devis;
}

export const devisApi = createApi({
  reducerPath: "devisApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Devis", "DevisList"],
  endpoints: (builder) => ({
    // Get all devis with filters
    getDevisList: builder.query<GetDevisListResponse, GetDevisListParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.status) searchParams.append("status", params.status);
        if (params.search) searchParams.append("search", params.search);
        if (params.startDate)
          searchParams.append("startDate", params.startDate);
        if (params.endDate) searchParams.append("endDate", params.endDate);

        return {
          url: `/devis?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Devis" as const,
                id,
              })),
              { type: "DevisList" as const, id: "LIST" },
            ]
          : [{ type: "DevisList" as const, id: "LIST" }],
    }),

    // Get devis by ID
    getDevisById: builder.query<GetDevisResponse, number>({
      query: (id) => ({
        url: `/devis/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Devis", id }],
    }),

    // Create devis
    createDevis: builder.mutation<CreateDevisResponse, DevisFormValues>({
      query: (data) => ({
        url: "/devis",
        method: "POST",
        body: data,
      }),
      invalidatesTags: [{ type: "DevisList", id: "LIST" }],
    }),

    // Update devis
    updateDevis: builder.mutation<
      UpdateDevisResponse,
      { id: number; data: Partial<DevisFormValues> }
    >({
      query: ({ id, data }) => ({
        url: `/devis/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Devis", id },
        { type: "DevisList", id: "LIST" },
      ],
    }),

    // Delete devis
    deleteDevis: builder.mutation<DeleteDevisResponse, number>({
      query: (id) => ({
        url: `/devis/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Devis", id },
        { type: "DevisList", id: "LIST" },
      ],
    }),

    // Download devis PDF — uses plain fetch so the Blob never enters Redux state
    downloadDevis: builder.mutation<{ filename: string }, number>({
      queryFn: async (id) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/devis/${id}/download`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { error: { status: res.status, data: err } as any };
        }
        const disposition = res.headers.get("Content-Disposition");
        const filename =
          disposition?.match(/filename="?([^";]+)"?/)?.[1]?.trim() ??
          `devis-${id}.pdf`;

        // Trigger browser download directly — never put Blob in Redux
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { data: { filename } };
      },
    }),
  }),
});

export const {
  useGetDevisListQuery,
  useGetDevisByIdQuery,
  useCreateDevisMutation,
  useUpdateDevisMutation,
  useDeleteDevisMutation,
  useDownloadDevisMutation,
} = devisApi;
