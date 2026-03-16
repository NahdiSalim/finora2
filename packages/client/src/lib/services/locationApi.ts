import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface LocationCountry {
  isoCode: string;
  name: string;
}

export interface LocationCity {
  name: string;
  governorate: string;
  governorateCode: string;
  countryCode: string;
}

export interface LocationCountriesResponse {
  status: string;
  code: string;
  data: LocationCountry[];
}

export interface LocationCitiesResponse {
  status: string;
  code: string;
  data: LocationCity[];
}

export const locationApi = createApi({
  reducerPath: "locationApi",
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    getCountries: builder.query<LocationCountry[], string | undefined>({
      query: (search) => {
        const params = new URLSearchParams();
        if (search?.trim()) params.append("search", search.trim());
        return {
          url: `/location/countries?${params.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: LocationCountriesResponse) =>
        response?.data ?? [],
    }),
    getCities: builder.query<
      LocationCity[],
      { countryCode: string; search?: string }
    >({
      query: ({ countryCode, search }) => {
        const params = new URLSearchParams();
        params.append("countryCode", countryCode);
        if (search?.trim()) params.append("search", search.trim());
        return {
          url: `/location/cities?${params.toString()}`,
          method: "GET",
        };
      },
      transformResponse: (response: LocationCitiesResponse) =>
        response?.data ?? [],
    }),
  }),
});

export const {
  useGetCountriesQuery,
  useGetCitiesQuery,
  useLazyGetCitiesQuery,
} = locationApi;
