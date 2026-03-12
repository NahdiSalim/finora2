import { createApi } from "@reduxjs/toolkit/query/react";

import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ----------------------------------------------------------------------

export type PostAuthor = {
  id: number;
  firstName: string | null;
  lastName: string | null;
  photo?: string | null;
  photoUrl?: string | null;
};

export type PostCompany = {
  id: number;
  name: string;
  logo?: string | null;
  logoUrl?: string | null;
};

export type Post = {
  id: number;
  authorId: number;
  companyId: number | null;
  title: string;
  content: string;
  /** @deprecated préférer imageUrls / attachments */
  images?: string[];
  imageUrls?: string[];
  /** URLs présignées des images (retour update/create) */
  attachments?: string[];
  tags: string[];
  visibility: string;
  status: string;
  publishedAt: string;
  viewsCount?: number;
  author?: PostAuthor;
  company?: PostCompany;
};

export type GetPostsParams = {
  authorId?: number;
  companyId?: number;
  tags?: string;
  page?: number;
  limit?: number;
};

export type GetPostsResponse = {
  data: Post[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

export type CreatePostPayload = {
  title: string;
  content: string;
  tags?: string[];
  visibility?: string;
  images?: File[];
};

export type UpdatePostPayload = {
  id: number;
  title?: string;
  content?: string;
  tags?: string[];
  visibility?: string;
  images?: File[];
  /** URLs des images à conserver (celles qui restent après suppression dans le formulaire) */
  keepImageUrls?: string[];
};

// ----------------------------------------------------------------------

function buildPostFormData(payload: {
  title: string;
  content: string;
  tags?: string[];
  visibility?: string;
  images?: File[];
  keepImageUrls?: string[];
}): FormData {
  const form = new FormData();
  form.append("title", payload.title);
  form.append("content", payload.content);
  if (payload.tags?.length) {
    form.append("tags", payload.tags.join(","));
  }
  if (payload.visibility) {
    form.append("visibility", payload.visibility);
  }
  if (payload.images?.length) {
    payload.images.forEach((file) => form.append("images", file));
  }
  if (payload.keepImageUrls !== undefined) {
    form.append("keepImages", JSON.stringify(payload.keepImageUrls ?? []));
  }
  return form;
}

export const postsApi = createApi({
  reducerPath: "postsApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Posts"],
  endpoints: (builder) => ({
    getPosts: builder.query<GetPostsResponse, GetPostsParams | void>({
      query: (params = {}) => {
        const search = new URLSearchParams();
        if (params?.authorId != null)
          search.set("authorId", String(params.authorId));
        if (params?.companyId != null)
          search.set("companyId", String(params.companyId));
        if (params?.tags) search.set("tags", params.tags);
        if (params?.page != null) search.set("page", String(params.page));
        if (params?.limit != null) search.set("limit", String(params.limit));
        const q = search.toString();
        return { url: `/posts${q ? `?${q}` : ""}`, method: "GET" };
      },
      providesTags: (result) =>
        result
          ? [
              ...result.data.map((p) => ({ type: "Posts" as const, id: p.id })),
              { type: "Posts", id: "LIST" },
            ]
          : [{ type: "Posts", id: "LIST" }],
    }),

    getPostById: builder.query<Post, number>({
      query: (id) => ({ url: `/posts/${id}`, method: "GET" }),
      providesTags: (_result, _err, id) => [{ type: "Posts", id }],
    }),

    createPost: builder.mutation<Post, CreatePostPayload>({
      query: (payload) => ({
        url: "/posts",
        method: "POST",
        body: buildPostFormData(payload),
      }),
      invalidatesTags: [{ type: "Posts", id: "LIST" }],
    }),

    updatePost: builder.mutation<Post, UpdatePostPayload>({
      query: ({ id, ...payload }) => {
        const title = payload.title ?? "";
        const content = payload.content ?? "";
        return {
          url: `/posts/${id}`,
          method: "PUT",
          body: buildPostFormData({
            title,
            content,
            tags: payload.tags,
            visibility: payload.visibility,
            images: payload.images,
            keepImageUrls: payload.keepImageUrls,
          }),
        };
      },
      invalidatesTags: (_result, _err, { id }) => [
        { type: "Posts", id },
        { type: "Posts", id: "LIST" },
      ],
    }),

    deletePost: builder.mutation<void, number>({
      query: (id) => ({ url: `/posts/${id}`, method: "DELETE" }),
      invalidatesTags: (_result, _err, id) => [
        { type: "Posts", id },
        { type: "Posts", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetPostsQuery,
  useGetPostByIdQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} = postsApi;
