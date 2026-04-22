import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type {
  BonLivraison,
  BonLivraisonFormValues,
} from "src/types/bon-livraison";

interface ListParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

interface ListResponse {
  status: string;
  code: string;
  data: BonLivraison[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
  counts: { en_attente: number; livre: number; annule: number };
}

interface SingleResponse {
  status: string;
  code: string;
  data: BonLivraison;
  message?: string;
}

interface DeleteResponse {
  status: string;
  code: string;
  message: string;
}

export const bonLivraisonApi = createApi({
  reducerPath: "bonLivraisonApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["BonLivraison", "BonLivraisonList"],
  endpoints: (builder) => ({
    getBonLivraisonList: builder.query<ListResponse, ListParams>({
      query: (params) => {
        const sp = new URLSearchParams();
        if (params.page) sp.append("page", String(params.page));
        if (params.limit) sp.append("limit", String(params.limit));
        if (params.status) sp.append("status", params.status);
        if (params.search) sp.append("search", params.search);
        return { url: `/bons-livraison?${sp}`, method: "GET" };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "BonLivraison" as const,
                id,
              })),
              { type: "BonLivraisonList", id: "LIST" },
            ]
          : [{ type: "BonLivraisonList", id: "LIST" }],
    }),

    createBonLivraison: builder.mutation<
      SingleResponse,
      BonLivraisonFormValues
    >({
      query: (data) => ({ url: "/bons-livraison", method: "POST", body: data }),
      invalidatesTags: [{ type: "BonLivraisonList", id: "LIST" }],
    }),

    updateBonLivraison: builder.mutation<
      SingleResponse,
      { id: number; data: Partial<BonLivraisonFormValues> }
    >({
      query: ({ id, data }) => ({
        url: `/bons-livraison/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "BonLivraison", id },
        { type: "BonLivraisonList", id: "LIST" },
      ],
    }),

    deleteBonLivraison: builder.mutation<DeleteResponse, number>({
      query: (id) => ({ url: `/bons-livraison/${id}`, method: "DELETE" }),
      invalidatesTags: (result, error, id) => [
        { type: "BonLivraison", id },
        { type: "BonLivraisonList", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetBonLivraisonListQuery,
  useCreateBonLivraisonMutation,
  useUpdateBonLivraisonMutation,
  useDeleteBonLivraisonMutation,
} = bonLivraisonApi;
