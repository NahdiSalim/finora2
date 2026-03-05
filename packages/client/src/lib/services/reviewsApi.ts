import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export type ReviewClient = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  photo: string | null;
};

export type ReviewItem = {
  id: number;
  accountantId: number;
  clientId: number;
  companyId: number | null;
  rating: number;
  comment: string | null;
  response: string | null;
  respondedAt: string | null;
  createdAt: string;
  client: ReviewClient;
};

export type AccountantReviewsResponse = {
  data: ReviewItem[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  averageRating: number;
};

export const reviewsApi = createApi({
  reducerPath: "reviewsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["AccountantReviews"],
  endpoints: (builder) => ({
    getAccountantReviews: builder.query<
      AccountantReviewsResponse,
      { accountantId: number; page?: number; limit?: number }
    >({
      query: ({ accountantId, page = 1, limit = 10 }) => ({
        url: `/reviews/accountant/${accountantId}`,
        params: { page, limit },
      }),
      providesTags: (_result, _err, { accountantId }) => [
        { type: "AccountantReviews", id: accountantId },
      ],
    }),

    respondToReview: builder.mutation<
      ReviewItem,
      { reviewId: number; response: string }
    >({
      query: ({ reviewId, response }) => ({
        url: `/reviews/${reviewId}/respond`,
        method: "POST",
        body: { response },
      }),
      invalidatesTags: ["AccountantReviews"],
    }),
  }),
});

export const { useGetAccountantReviewsQuery, useRespondToReviewMutation } =
  reviewsApi;
