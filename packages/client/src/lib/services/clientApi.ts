import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type { ClientFormData } from "src/validations/client/client-validation";

export interface Client {
  id: string;
  companyId?: string;
  fullName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  email?: string;
  phone?: string;
  company?:
    | string
    | {
        name: string;
        siret?: string;
        vatNumber?: string;
        legalForm?: string;
        address?: string;
        city?: string;
        postalCode?: string;
      };
  siret?: string;
  vatNumber?: string;
  legalForm?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  status?: string;
  relationshipStatus?: string;
  relationshipStart?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface ClientsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ClientsResponse {
  data: Client[];
  pagination: ClientsPagination;
}

export interface MyAccountantItem {
  id: number | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  photo?: string | null;
  phone?: string | null;
  company?: {
    id: number;
    name: string;
  };
  relationshipStatus?: string;
  relationshipStart?: string | null;
}

export interface MyAccountantsResponse {
  success: boolean;
  data: MyAccountantItem[];
}

export const clientsApi = createApi({
  reducerPath: "clientsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Clients"],
  endpoints: (builder) => ({
    getMyAccountants: builder.query<MyAccountantsResponse, void>({
      query: () => ({
        url: "/accountant/my-accountants",
        method: "GET",
      }),
    }),

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

    // 🔹 CREATE Client — API: multipart/form-data with field "patentFile", body fields sans countryCode
    createClient: builder.mutation<
      Client,
      ClientFormData & { patente?: File; country?: string }
    >({
      query: (arg) => {
        const hasFile = arg.patente instanceof File;
        const bodyKeys: (keyof ClientFormData)[] = [
          "firstName",
          "lastName",
          "email",
          "phone",
          "companyName",
          "password",
          "siret",
          "vatNumber",
          "legalForm",
          "address",
          "city",
          "postalCode",
        ];
        if (hasFile) {
          const formData = new FormData();
          bodyKeys.forEach((key) => {
            const v = arg[key];
            if (v != null && v !== "") formData.append(key, String(v));
          });
          if (arg.country != null && arg.country !== "")
            formData.append("country", arg.country);
          formData.append("patentFile", arg.patente!);
          return {
            url: "/accountant/clients",
            method: "POST",
            body: formData,
          };
        }
        const { patente, country, countryCode, ...rest } = arg;
        return {
          url: "/accountant/clients",
          method: "POST",
          body: { ...rest, ...(country ? { country } : {}) },
        };
      },
      invalidatesTags: [{ type: "Clients" }],
    }),
  }),
});

export const {
  useGetMyAccountantsQuery,
  useGetClientsQuery,
  useCreateClientMutation,
} = clientsApi;
