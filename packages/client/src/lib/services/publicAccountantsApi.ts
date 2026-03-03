import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ----------------------------------------------------------------------

export type PublicAccountant = {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string;
  photo: string | null;
  specialty: string | null;
  department: string | null;
  company: {
    id: number;
    name: string;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
  };
};

export type PublicAccountantsResponse = {
  data: PublicAccountant[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export const publicAccountantsApi = createApi({
  reducerPath: "publicAccountantsApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getPublicAccountants: builder.query<
      PublicAccountantsResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
        specialty?: string;
        location?: string;
      }
    >({
      query: ({ page = 1, limit = 20, search, specialty, location } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (search) params.append("search", search);
        if (specialty) params.append("specialty", specialty);
        if (location) params.append("location", location);

        return {
          url: `/public/accountants?${params.toString()}`,
          method: "GET",
        };
      },
    }),
  }),
});

export const { useGetPublicAccountantsQuery } = publicAccountantsApi;
