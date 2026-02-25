import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

export interface Collaborator {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position?: string;
  department?: string;
  created_at: string;
  updated_at: string;
}

export interface CollaboratorsResponse {
  data: Collaborator[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateCollaboratorDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  position?: string;
  department?: string;
  password: string;
}

export const collaboratorsApi = createApi({
  reducerPath: "collaboratorsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Collaborators"],
  endpoints: (builder) => ({
    // 🔹 GET collaborators
    getCollaborators: builder.query<
      CollaboratorsResponse,
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 10 } = {}) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("limit", limit.toString());

        return {
          url: `/accountant/collaborators?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({
                type: "Collaborators" as const,
                id,
              })),
              { type: "Collaborators", id: "PARTIAL-LIST" },
            ]
          : [{ type: "Collaborators", id: "PARTIAL-LIST" }],
    }),

    // 🔹 CREATE collaborator
    createCollaborator: builder.mutation<Collaborator, CreateCollaboratorDto>({
      query: (body) => ({
        url: "/accountant/collaborators",
        method: "POST",
        body,
      }),
      invalidatesTags: [{ type: "Collaborators", id: "PARTIAL-LIST" }],
    }),
  }),
});

export const { useGetCollaboratorsQuery, useCreateCollaboratorMutation } =
  collaboratorsApi;
