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
  /** Presigned photo URL (returned by list endpoint) */
  photoUrl?: string | null;
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
    rating?: number;
    numberOfReviews?: number;
  };
};

/** Détail profil public (GET /public/accountants/:id) - même forme que getAccountantProfile */
export type PublicAccountantProfile = {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  photoUrl: string | null;
  coverPhotoUrl: string | null;
  specialty: string | null;
  department: string | null;
  diploma: string | null;
  company: {
    id: number;
    name: string;
    description?: string | null;
    experience?: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    siret: string | null;
    vatNumber: string | null;
    legalForm: string | null;
    logoUrl: string | null;
    specialties: string[];
    rating?: number;
    numberOfReviews?: number;
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

    getPublicAccountantById: builder.query<PublicAccountantProfile, number>({
      query: (id) => ({
        url: `/public/accountants/${id}`,
        method: "GET",
      }),
    }),
  }),
});

export const { useGetPublicAccountantsQuery, useGetPublicAccountantByIdQuery } =
  publicAccountantsApi;
