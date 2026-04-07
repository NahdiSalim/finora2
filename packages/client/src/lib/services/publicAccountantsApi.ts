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
    description?: string | null;
    experience?: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    specialties?: string[];
    rating?: number;
    numberOfReviews?: number;
  };
  relationship?: {
    relationshipId: number;
    status: string;
    relationshipStart: string | null;
  } | null;
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
    numWhatsapp?: string | null;
    website?: string | null;
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
  tagTypes: ["PublicAccountants"],
  endpoints: (builder) => ({
    getPublicAccountants: builder.query<
      PublicAccountantsResponse,
      {
        page?: number;
        limit?: number;
        search?: string;
        specialty?: string;
        location?: string;
        reviewMin?: number;
        reviewMax?: number;
        withRelationships?: boolean;
      }
    >({
      query: ({
        page = 1,
        limit = 20,
        search,
        specialty,
        location,
        reviewMin,
        reviewMax,
        withRelationships = false,
      } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());
        if (search) params.append("search", search);
        if (specialty) params.append("specialty", specialty);
        if (location) params.append("location", location);
        if (reviewMin != null) params.append("reviewMin", reviewMin.toString());
        if (reviewMax != null) params.append("reviewMax", reviewMax.toString());

        const basePath = withRelationships
          ? "/public/accountants/with-relationships"
          : "/public/accountants";

        return {
          url: `${basePath}?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (_result, _error, arg) => [
        {
          type: "PublicAccountants",
          id: arg?.withRelationships ? "LIST_WITH_RELATIONSHIPS" : "LIST",
        },
      ],
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
