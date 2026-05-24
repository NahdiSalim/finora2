import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  toolsUsed?: string[];
  createdAt?: string;
  // local-only (not from DB)
  timestamp?: number;
  isLoading?: boolean;
}

export interface ChatSession {
  id: number;
  title: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: { role: string; content: string; createdAt: string } | null;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export interface SendMessageRequest {
  message: string;
  sessionId?: number;
}

export interface SendMessageResponse {
  status: string;
  reply: string;
  toolsUsed: string[];
  sessionId: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const chatbotApi = createApi({
  reducerPath: "chatbotApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ChatSessions", "ChatSession"],
  endpoints: (builder) => ({
    sendMessage: builder.mutation<SendMessageResponse, SendMessageRequest>({
      query: (body) => ({
        url: "/chatbot/message",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ChatSessions"],
    }),

    getSessions: builder.query<{ status: string; data: ChatSession[] }, void>({
      query: () => "/chatbot/sessions",
      providesTags: ["ChatSessions"],
    }),

    getSession: builder.query<
      { status: string; data: ChatSessionDetail },
      number
    >({
      query: (id) => `/chatbot/sessions/${id}`,
      providesTags: (_r, _e, id) => [{ type: "ChatSession", id }],
    }),

    renameSession: builder.mutation<
      { status: string; data: { id: number; title: string } },
      { id: number; title: string }
    >({
      query: ({ id, title }) => ({
        url: `/chatbot/sessions/${id}/rename`,
        method: "PATCH",
        body: { title },
      }),
      invalidatesTags: ["ChatSessions"],
    }),

    deleteSession: builder.mutation<{ status: string }, number>({
      query: (id) => ({
        url: `/chatbot/sessions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ChatSessions"],
    }),
  }),
});

export const {
  useSendMessageMutation,
  useGetSessionsQuery,
  useGetSessionQuery,
  useRenameSessionMutation,
  useDeleteSessionMutation,
} = chatbotApi;
