import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithReauth } from "./baseQueryWithReauth";

// ==================== TYPES ====================

export interface ChatParticipant {
    id: number;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
}

export interface ChatRoom {
    id: number;
    name?: string;
    type: "direct" | "group" | "request" | "ticket" | "meeting" | "company";
    description?: string;
    participants: string[];
    admins: string[];
    status: string;
    lastActivity?: string;
    lastMessageId?: number;
    createdAt: string;
    updatedAt: string;
    createdBy?: ChatParticipant;
}

export interface ChatMessage {
    id: number;
    roomId: number;
    threadId?: number;
    senderId: number;
    content: string;
    type: "text" | "file" | "image" | "system";
    mentions: string[];
    documentId?: number;
    readBy: string[];
    deleted: boolean;
    edited: boolean;
    createdAt: string;
    updatedAt: string;
    sender?: ChatParticipant;
    attachments?: string[];
}

export interface GetRoomMessagesResponse {
    messages: ChatMessage[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface CreateRoomInput {
    name?: string;
    type: "direct" | "group" | "request" | "ticket" | "meeting" | "company";
    description?: string;
    participants: number[];
    contextId?: number;
    contextType?: "request" | "ticket" | "meeting" | "company";
}

export interface SendMessageInput {
    roomId: number;
    content: string;
    type?: "text" | "file" | "image" | "system";
    threadId?: number;
    mentions?: number[];
    documentId?: number;
    attachments?: File[];
}

// ==================== API ====================

export const chatApi = createApi({
    reducerPath: "chatApi",
    baseQuery: baseQueryWithReauth,
    tagTypes: ["ChatRooms", "ChatMessages"],
    endpoints: (builder) => ({
        getUserRooms: builder.query<ChatRoom[], void>({
            query: () => ({ url: "/chat/rooms", method: "GET" }),
            providesTags: [{ type: "ChatRooms", id: "LIST" }],
        }),

        getRoomById: builder.query<ChatRoom, number>({
            query: (id) => ({ url: `/chat/rooms/${id}`, method: "GET" }),
            providesTags: (_result, _err, id) => [{ type: "ChatRooms", id }],
        }),

        createRoom: builder.mutation<ChatRoom, CreateRoomInput>({
            query: (body) => ({ url: "/chat/rooms", method: "POST", body }),
            invalidatesTags: [{ type: "ChatRooms", id: "LIST" }],
        }),

        getRoomMessages: builder.query<
            GetRoomMessagesResponse,
            { roomId: number; page?: number; limit?: number }
        >({
            query: ({ roomId, page = 1, limit = 50 }) => ({
                url: `/chat/rooms/${roomId}/messages?page=${page}&limit=${limit}`,
                method: "GET",
            }),
            providesTags: (_result, _err, { roomId }) => [
                { type: "ChatMessages", id: `room-${roomId}` },
            ],
        }),

        sendMessage: builder.mutation<ChatMessage, SendMessageInput>({
            query: ({ attachments, ...rest }) => {
                if (attachments && attachments.length > 0) {
                    const formData = new FormData();
                    formData.append("roomId", String(rest.roomId));
                    formData.append("content", rest.content);
                    formData.append("type", rest.type ?? "text");
                    if (rest.threadId) formData.append("threadId", String(rest.threadId));
                    if (rest.mentions?.length)
                        formData.append("mentions", rest.mentions.join(","));
                    if (rest.documentId)
                        formData.append("documentId", String(rest.documentId));
                    attachments.forEach((file) => formData.append("attachments", file));
                    return { url: "/chat/messages", method: "POST", body: formData };
                }
                return { url: "/chat/messages", method: "POST", body: rest };
            },
            invalidatesTags: (_result, _err, { roomId }) => [
                { type: "ChatMessages", id: `room-${roomId}` },
                { type: "ChatRooms", id: "LIST" },
            ],
        }),

        markAsRead: builder.mutation<void, number>({
            query: (messageId) => ({
                url: `/chat/messages/${messageId}/read`,
                method: "POST",
            }),
        }),

        editMessage: builder.mutation<
            ChatMessage,
            { messageId: number; content: string; roomId: number }
        >({
            query: ({ messageId, content }) => ({
                url: `/chat/messages/${messageId}`,
                method: "PUT",
                body: { content },
            }),
            invalidatesTags: (_result, _err, { roomId }) => [
                { type: "ChatMessages", id: `room-${roomId}` },
            ],
        }),

        deleteMessage: builder.mutation<
            void,
            { messageId: number; roomId: number }
        >({
            query: ({ messageId }) => ({
                url: `/chat/messages/${messageId}`,
                method: "DELETE",
            }),
            invalidatesTags: (_result, _err, { roomId }) => [
                { type: "ChatMessages", id: `room-${roomId}` },
            ],
        }),
    }),
});

export const {
    useGetUserRoomsQuery,
    useGetRoomByIdQuery,
    useCreateRoomMutation,
    useGetRoomMessagesQuery,
    useSendMessageMutation,
    useMarkAsReadMutation,
    useEditMessageMutation,
    useDeleteMessageMutation,
} = chatApi;
