import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type { ClientFormData } from "src/validations/client/client-validation";

export interface Client {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  company?: string;
  siret?: string;
  vatNumber?: string;
  legalForm?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientsResponse {
  data: Client[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const clientsApi = createApi({
  reducerPath: "clientsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Clients"],
  endpoints: (builder) => ({
    // 🔹 GET Clients
    getClients: builder.query<
      ClientsResponse,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 10 } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        return {
          url: `/accountant/clients?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Clients" as const,
                id,
              })),
              { type: "Clients", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Clients", id: "PARTIAL-LIST" }],
    }),

    // 🔹 CREATE Client
    createClient: builder.mutation<Client, ClientFormData>({
      query: (body) => ({
        url: "/accountant/clients",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Clients", id: "PARTIAL-LIST" }],
    }),
  }),
});

export const { useGetClientsQuery, useCreateClientMutation } = clientsApi;
