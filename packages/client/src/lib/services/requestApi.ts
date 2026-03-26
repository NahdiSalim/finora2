import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";
import type {
  Request,
  GetRequestsParams,
  GetRequestsResponse,
  CreateRequestResponse,
  ConvertToTaskDto,
} from "src/types/request";
import type { GetUsersByRoleResponse } from "src/types/user";

export const requestApi = createApi({
  reducerPath: "requestApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Request", "Requests"],
  endpoints: (builder) => ({
    // Get requests assigned to me (Accountant only)
    getMyAssignedRequests: builder.query<
      GetRequestsResponse,
      GetRequestsParams
    >({
      query: (params) => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.status) searchParams.append("status", params.status);
        if (params.urgency) searchParams.append("urgency", params.urgency);
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder)
          searchParams.append("sortOrder", params.sortOrder);
        if (params.search) searchParams.append("search", params.search);

        return {
          url: `/requests/assigned-to-me?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Request" as const,
                id,
              })),
              { type: "Requests" as const, id: "ASSIGNED" },
            ]
          : [{ type: "Requests" as const, id: "ASSIGNED" }],
    }),

    // Get all unassigned requests (Accountant only) - Client requests waiting for assignment
    getAllRequests: builder.query<GetRequestsResponse, GetRequestsParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.status) searchParams.append("status", params.status);
        if (params.urgency) searchParams.append("urgency", params.urgency);
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder)
          searchParams.append("sortOrder", params.sortOrder);
        if (params.search) searchParams.append("search", params.search);

        return {
          url: `/requests/all?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Request" as const,
                id,
              })),
              { type: "Requests" as const, id: "LIST" },
            ]
          : [{ type: "Requests" as const, id: "LIST" }],
    }),

    // Get my requests (Client only)
    getMyRequests: builder.query<GetRequestsResponse, GetRequestsParams>({
      query: (params) => {
        const searchParams = new URLSearchParams();

        if (params.page) searchParams.append("page", params.page.toString());
        if (params.limit) searchParams.append("limit", params.limit.toString());
        if (params.status) searchParams.append("status", params.status);
        if (params.sortBy) searchParams.append("sortBy", params.sortBy);
        if (params.sortOrder)
          searchParams.append("sortOrder", params.sortOrder);
        if (params.search) searchParams.append("search", params.search);

        return {
          url: `/requests/my-requests?${searchParams.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Request" as const,
                id,
              })),
              { type: "Requests" as const, id: "MY_LIST" },
            ]
          : [{ type: "Requests" as const, id: "MY_LIST" }],
    }),

    // Get request by ID
    getRequestById: builder.query<{ success: boolean; data: Request }, number>({
      query: (id) => ({
        url: `/requests/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Request", id }],
    }),

    // Create request (with file uploads)
    createRequest: builder.mutation<CreateRequestResponse, FormData>({
      query: (formData) => ({
        url: "/requests",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: [
        { type: "Requests", id: "LIST" },
        { type: "Requests", id: "MY_LIST" },
      ],
    }),

    // Update request (with file uploads)
    updateRequest: builder.mutation<
      { success: boolean; message: string; data: Request },
      { id: number; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/requests/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Request", id },
        { type: "Requests", id: "LIST" },
        { type: "Requests", id: "MY_LIST" },
        { type: "Requests", id: "ASSIGNED" },
      ],
    }),

    // Respond to request (Accountant only)
    respondToRequest: builder.mutation<
      { success: boolean; message: string; data: Request },
      { id: number; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `/requests/${id}/respond`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Request", id },
        { type: "Requests", id: "LIST" },
        { type: "Requests", id: "ASSIGNED" },
        { type: "Requests", id: "MY_LIST" },
      ],
    }),

    // Convert request to task (Accountant only)
    convertToTask: builder.mutation<
      {
        success: boolean;
        message: string;
        data: { request: Request; task: any };
      },
      { id: number; data: ConvertToTaskDto }
    >({
      query: ({ id, data }) => ({
        url: `/requests/${id}/convert-to-task`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Request", id },
        { type: "Requests", id: "LIST" },
      ],
    }),

    // Delete request (Client only)
    deleteRequest: builder.mutation<
      { success: boolean; message: string },
      number
    >({
      query: (id) => ({
        url: `/requests/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Request", id },
        { type: "Requests", id: "LIST" },
        { type: "Requests", id: "MY_LIST" },
      ],
    }),

    // Get users by role (for assignment dropdowns)
    getUsersByRole: builder.query<GetUsersByRoleResponse, string[]>({
      query: (roleCodes) => ({
        url: `/users/by-role?roles=${roleCodes.join(",")}`,
        method: "GET",
      }),
    }),
  }),
});

export const {
  useGetMyAssignedRequestsQuery,
  useGetAllRequestsQuery,
  useGetMyRequestsQuery,
  useGetRequestByIdQuery,
  useCreateRequestMutation,
  useUpdateRequestMutation,
  useRespondToRequestMutation,
  useConvertToTaskMutation,
  useDeleteRequestMutation,
  useGetUsersByRoleQuery,
} = requestApi;
