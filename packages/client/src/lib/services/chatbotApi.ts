import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ─── Attachment ───────────────────────────────────────────────────────────────

/** Metadata returned by POST /chatbot/upload and carried in subsequent messages. */
export interface ChatAttachment {
  url: string; // presigned MinIO URL — refreshed by getSession on history load
  name: string; // original filename
  mimeType: string; // MIME type
  size: number; // bytes
  objectPath: string; // MinIO object key — persisted in DB
}

// ─── Chat types ───────────────────────────────────────────────────────────────

export interface ChatMessage {
  id?: number;
  role: "user" | "assistant";
  content: string;
  transcription?: string | null; // spoken text from Whisper; null for non-audio messages
  toolsUsed?: string[];
  createdAt?: string;
  // local-only (not from DB)
  timestamp?: number;
  isLoading?: boolean;
  localId?: string;
  // attachment — present on user messages that had a file/audio upload
  attachment?: ChatAttachment;
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
  confirmId?: string;
  attachment?: ChatAttachment;
}

export interface SendMessageResponse {
  status: string;
  reply: string;
  toolsUsed: string[];
  sessionId: number;
}

// ─── AI Insights types ────────────────────────────────────────────────────────

export type InsightSeverity = "info" | "warning" | "critical";
export type InsightType =
  | "INVOICES_DUE_SOON"
  | "RECURRING_LATE_SUPPLIER"
  | "TVA_SPIKE"
  | "HIGH_UNPAID"
  | "LOW_ACTIVITY";

export interface AiInsight {
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  actionable: boolean;
  metadata: Record<string, unknown>;
  generatedAt: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const chatbotApi = createApi({
  reducerPath: "chatbotApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["ChatSessions", "ChatSession", "ChatInsights"],
  endpoints: (builder) => ({
    /** Upload a file or audio blob — must be called before sendMessage when attachment present */
    uploadAttachment: builder.mutation<
      { status: string; data: ChatAttachment },
      FormData
    >({
      query: (formData) => ({
        url: "/chatbot/upload",
        method: "POST",
        body: formData,
        // Do NOT set Content-Type — browser sets it with correct multipart boundary
      }),
    }),

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

    getInsights: builder.query<{ status: string; data: AiInsight[] }, void>({
      query: () => "/chatbot/insights",
      providesTags: ["ChatInsights"],
    }),
  }),
});

export const {
  useUploadAttachmentMutation,
  useSendMessageMutation,
  useGetSessionsQuery,
  useGetSessionQuery,
  useRenameSessionMutation,
  useDeleteSessionMutation,
  useGetInsightsQuery,
} = chatbotApi;
