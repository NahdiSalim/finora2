import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export interface DocumentItem {
  id: number;
  name: string;
  type?: string;
  mimeType?: string | null;
  size?: number | null;
  isFolder: boolean;
  status: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: number; username?: string; email?: string };
}

export interface GetDocumentsResponse {
  status: string;
  code: string;
  data: DocumentItem[];
  pagination: {
    currentPage: number;
    totalPages: number;
    limitPerPage: number;
    totalCount: number;
  };
}

export interface CreateFolderInput {
  name: string;
  parentId?: number | null;
}

export interface CreateFolderResponse {
  status: string;
  code: string;
  data: DocumentItem;
  message: string;
}

export interface UpdateDocumentInput {
  name?: string;
  parentId?: number | null;
}

export const documentsApi = createApi({
  reducerPath: "documentsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Documents"],
  endpoints: (builder) => ({
    getDocuments: builder.query<
      GetDocumentsResponse,
      {
        parentId?: number | null;
        page?: number;
        limit?: number;
        status?: string;
      }
    >({
      query: ({ parentId, page = 1, limit = 50, status = "active" } = {}) => {
        const params = new URLSearchParams();
        if (parentId != null) params.append("parentId", String(parentId));
        params.append("page", String(page));
        params.append("limit", String(limit));
        if (status) params.append("status", status);
        return {
          url: `/documents?${params.toString()}`,
          method: "GET",
        };
      },
      providesTags: (result, _err, arg) =>
        result
          ? [
              ...result.data.map((d) => ({
                type: "Documents" as const,
                id: d.id,
              })),
              { type: "Documents", id: `list-${arg.parentId ?? "root"}` },
            ]
          : [{ type: "Documents", id: `list-${arg.parentId ?? "root"}` }],
    }),

    createFolder: builder.mutation<CreateFolderResponse, CreateFolderInput>({
      query: (body) => ({
        url: "/documents/folders",
        method: "POST",
        body: {
          name: body.name,
          ...(body.parentId != null && { parentId: body.parentId }),
        },
      }),
      invalidatesTags: (_result, _err, arg) => [
        { type: "Documents", id: `list-${arg.parentId ?? "root"}` },
      ],
    }),

    updateDocument: builder.mutation<
      { status: string; data: DocumentItem },
      { id: number; dto: UpdateDocumentInput }
    >({
      query: ({ id, dto }) => ({
        url: `/documents/${id}`,
        method: "PUT",
        body: dto,
      }),
      invalidatesTags: () => [{ type: "Documents" }],
    }),

    deleteDocument: builder.mutation<
      { status: string; message?: string },
      number
    >({
      query: (id) => ({
        url: `/documents/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: () => [{ type: "Documents" }],
    }),

    uploadDocument: builder.mutation<
      { status: string; data?: DocumentItem; message?: string },
      { file: File; parentId?: number | null; category?: string }
    >({
      query: ({ file, parentId, category }) => {
        const formData = new FormData();
        formData.append("file", file);
        if (parentId != null) formData.append("parentId", String(parentId));
        if (category) formData.append("category", category);
        return {
          url: "/documents/upload",
          method: "POST",
          body: formData,
        };
      },
      invalidatesTags: () => [{ type: "Documents" }],
    }),

    downloadDocument: builder.mutation<
      { blob: Blob; filename: string },
      number
    >({
      queryFn: async (id) => {
        const token = localStorage.getItem("token");
        const res = await fetch(`${API_BASE}/documents/${id}/download`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) {
          try {
            const err = await res.json().catch(() => ({}));
            return { error: { status: res.status, data: err } as any };
          } catch {
            return {
              error: { status: res.status, data: "Download failed" } as any,
            };
          }
        }
        const disposition = res.headers.get("Content-Disposition");
        const filename =
          disposition?.match(/filename="?([^";]+)"?/)?.[1]?.trim() ??
          `document-${id}`;
        const blob = await res.blob();
        return { data: { blob, filename } };
      },
    }),
  }),
});

export const {
  useGetDocumentsQuery,
  useCreateFolderMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useUploadDocumentMutation,
  useDownloadDocumentMutation,
} = documentsApi;
