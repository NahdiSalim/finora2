import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface Supplier {
  id: number;
  name: string;
  company: string;
  email: string;
  phone: string;
  address?: string;
  taxId?: string;
  logoUrl?: string;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

// Backend response shape (matches devis/invoice convention)
export interface SuppliersListResponse {
  status: string;
  code: string;
  data: Supplier[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
}

export interface SupplierResponse {
  status: string;
  code: string;
  data: Supplier;
  message?: string;
}

export const suppliersApi = createApi({
  reducerPath: "suppliersApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Suppliers"],
  endpoints: (builder) => ({
    // GET suppliers list
    getSuppliers: builder.query<
      SuppliersListResponse,
      { page?: number; limit?: number; search?: string }
    >({
      query: ({ page = 1, limit = 10, search } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (search) params.append("search", search);

        return {
          url: `/suppliers?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Suppliers" as const,
                id,
              })),
              { type: "Suppliers", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Suppliers", id: "PARTIAL-LIST" }],
    }),

    // CREATE supplier (multipart/form-data for logo)
    createSupplier: builder.mutation<SupplierResponse, FormData>({
      query: (body) => ({
        url: "/suppliers",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Suppliers", id: "PARTIAL-LIST" }],
    }),

    // UPDATE supplier
    updateSupplier: builder.mutation<
      SupplierResponse,
      { id: number; body: FormData }
    >({
      query: ({ id, body }) => ({
        url: `/suppliers/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: "Suppliers", id },
        { type: "Suppliers", id: "PARTIAL-LIST" },
      ],
    }),

    // DELETE supplier
    deleteSupplier: builder.mutation<
      { status: string; code: string; message: string },
      number
    >({
      query: (id) => ({
        url: `/suppliers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Suppliers", id: "PARTIAL-LIST" }],
    }),
  }),
});

export const {
  useGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
} = suppliersApi;
