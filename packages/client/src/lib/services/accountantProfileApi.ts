import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ----------------------------------------------------------------------

export type AccountantProfile = {
  id: number;
  name: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  /** URL présignée de la photo de profil */
  photoUrl?: string | null;
  /** URL présignée de la photo de couverture */
  coverPhotoUrl?: string | null;
  /** @deprecated préférer photoUrl */
  photo?: string | null;
  specialty: string | null;
  department: string | null;
  diploma: string | null;
  company: {
    id: number;
    name: string;
    description?: string | null;
    experience?: string | null;
    employeeCount?: string | null;
    sector?: string | null;
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    numWhatsapp?: string | null;
    email: string | null;
    website?: string | null;
    siret: string | null;
    vatNumber: string | null;
    legalForm: string | null;
    logoUrl?: string | null;
    specialties?: string[];
    rating?: number;
    numberOfReviews?: number;
    patentFileUrl?: string | null;
    rneFileUrl?: string | null;
  };
};

export const accountantProfileApi = createApi({
  reducerPath: "accountantProfileApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["AccountantProfile"],
  endpoints: (builder) => ({
    getMyAccountantProfile: builder.query<AccountantProfile, void>({
      query: () => ({
        url: "/accountant/profile/me",
        method: "GET",
      }),
      providesTags: ["AccountantProfile"],
    }),
  }),
});

export const { useGetMyAccountantProfileQuery } = accountantProfileApi;
