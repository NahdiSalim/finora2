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
    city: string | null;
    address: string | null;
    postalCode: string | null;
    phone: string | null;
    email: string | null;
    siret: string | null;
    vatNumber: string | null;
    legalForm: string | null;
    logoUrl?: string | null;
    specialties?: string[];
    rating?: number;
    numberOfReviews?: number;
  };
};

export const accountantProfileApi = createApi({
  reducerPath: "accountantProfileApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getMyAccountantProfile: builder.query<AccountantProfile, void>({
      query: () => ({
        url: "/accountant/profile/me",
        method: "GET",
      }),
    }),
  }),
});

export const { useGetMyAccountantProfileQuery } = accountantProfileApi;
