import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import { invoicesApi } from "./invoicesApi";

export interface CompanyData {
  id: number;
  name: string;
  legalName?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  legalForm?: string | null;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  country?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  description?: string | null;
  logoUrl?: string | null;
  invoiceTemplate?: string | null;
}

interface GetCompanyResponse {
  success: boolean;
  data: CompanyData;
}

interface UpdateCompanyResponse {
  success: boolean;
  message: string;
  data: CompanyData & { logoUrl?: string | null };
}

export const companyApi = createApi({
  reducerPath: "companyApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Company"],
  endpoints: (builder) => ({
    getCompany: builder.query<GetCompanyResponse, void>({
      query: () => ({ url: "/users/company", method: "GET" }),
      providesTags: ["Company"],
    }),

    updateCompany: builder.mutation<UpdateCompanyResponse, FormData>({
      query: (formData) => ({
        url: "/users/company",
        method: "PATCH",
        body: formData,
      }),
      invalidatesTags: ["Company"],
      // After a successful save, explicitly invalidate the invoicesApi cache.
      // invalidatesTags only works within the same slice — cross-slice invalidation
      // requires dispatching the other slice's util action directly.
      async onQueryStarted(_arg, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(
            invoicesApi.util.invalidateTags([{ type: "Invoices", id: "LIST" }]),
          );
        } catch {
          // save failed — nothing to invalidate
        }
      },
    }),
  }),
});

export const { useGetCompanyQuery, useUpdateCompanyMutation } = companyApi;
