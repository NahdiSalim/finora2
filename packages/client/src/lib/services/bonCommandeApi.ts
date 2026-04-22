import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type {
  BonCommande,
  BonCommandeFormValues,
} from "src/types/bon-commande";

interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

interface ListResponse {
  status: string;
  code: string;
  data: BonCommande[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
  counts: { brouillon: number; confirme: number; annule: number };
}

interface SingleResponse {
  status: string;
  code: string;
  data: BonCommande;
  message?: string;
}

interface DeleteResponse {
  status: string;
  code: string;
  message: string;
}

export const bonCommandeApi = createApi({
  reducerPath: "bonCommandeApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["BonCommande", "BonCommandeList"],
  endpoints: (builder) => ({
    getBonCommandeList: builder.query<ListResponse, ListParams>({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params.page) sp.append("page", String(params.page));
        if (params.limit) sp.append("limit", String(params.limit));
        if (params.status) sp.append("status", params.status);
        if (params.search) sp.append("search", params.search);
        return { url: `/bons-commande?${sp}`, method: "GET" };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "BonCommande" as const,
                id,
              })),
              { type: "BonCommandeList", id: "LIST" },
            ]
          : [{ type: "BonCommandeList", id: "LIST" }],
    }),

    createBonCommande: builder.mutation<SingleResponse, BonCommandeFormValues>({
      query: (data) => ({ url: "/bons-commande", method: "POST", body: data }),
      invalidatesTags: [{ type: "BonCommandeList", id: "LIST" }],
    }),

    updateBonCommande: builder.mutation<
      SingleResponse,
      { id: number; data: Partial<BonCommandeFormValues> }
    >({
      query: ({ id, data }) => ({
        url: `/bons-commande/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "BonCommande", id },
        { type: "BonCommandeList", id: "LIST" },
      ],
    }),

    deleteBonCommande: builder.mutation<DeleteResponse, number>({
      query: (id) => ({ url: `/bons-commande/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "BonCommande", id },
        { type: "BonCommandeList", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetBonCommandeListQuery,
  useCreateBonCommandeMutation,
  useUpdateBonCommandeMutation,
  useDeleteBonCommandeMutation,
} = bonCommandeApi;
