import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "src/lib/store";
import {
    useGetUserRoomsQuery,
    useGetRoomMessagesQuery,
    useSendMessageMutation,
    useMarkAsReadMutation,
    type ChatRoom,
    type ChatMessage,
} from "src/lib/services/chatApi";
import type { Conversation, Message } from "../data/types";

// Map a ChatRoom to the frontend Conversation type
function mapRoomToConversation(
    room: ChatRoom,
    currentUserId: number,
): Conversation {
    // For direct rooms, the "other" participant is the one that's not the current user
    const otherParticipantId = room.participants.find(
        (p) => p !== String(currentUserId),
    );

    const name = room.name ?? `Conversation ${room.id}`;
    const initial = name.charAt(0).toUpperCase();

    return {
        id: room.id,
        name,
        role: room.type === "direct" ? "Direct" : room.type,
        preview: "",
        fullDate: room.lastActivity ?? room.updatedAt,
        time: new Date(room.lastActivity ?? room.updatedAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        avatar: initial,
        avatarColor: "#D9D9D9",
        avatarTextColor: "#666666",
        online: false,
        unreadCount: 0,
        phone: "",
        category: "client",
    };
}

// Map a ChatMessage to the frontend Message type
function mapApiMessageToMessage(
    msg: ChatMessage,
    currentUserId: number,
): Message {
    const date = new Date(msg.createdAt).toISOString().split("T")[0];
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    const isMine = msg.senderId === currentUserId;

    if (msg.type === "file" || msg.type === "image") {
        const url = msg.attachments?.[0] ?? "";
        const fileName = url.split("/").pop() ?? "Fichier";
        return {
            id: msg.id,
            type: "file",
            mine: isMine,
            time,
            date,
            file: {
                name: fileName,
                size: "",
                type: msg.type === "image" ? "image/jpeg" : "application/octet-stream",
                url,
            },
        };
    }

    return {
        id: msg.id,
        type: "text",
        text: msg.content,
        mine: isMine,
        time,
        date,
    };
}

// Hook to get all rooms as conversations
export function useConversations() {
    const currentUserId = useSelector(
        (state: RootState) => state.auth.user?.id,
    );

    const { data: rooms = [], isLoading, error } = useGetUserRoomsQuery();

    const conversations = useMemo(
        () =>
            rooms.map((room) =>
                mapRoomToConversation(room, currentUserId ? Number(currentUserId) : 0),
            ),
        [rooms, currentUserId],
    );

    return { conversations, isLoading, error };
}

// Hook to get messages for a specific room
export function useRoomMessages(roomId: number) {
    const currentUserId = useSelector(
        (state: RootState) => state.auth.user?.id,
    );

    const {
        data,
        isLoading,
        error,
    } = useGetRoomMessagesQuery({ roomId }, { skip: !roomId });

    const messages = useMemo(
        () =>
            (data?.messages ?? []).map((msg) =>
                mapApiMessageToMessage(msg, currentUserId ? Number(currentUserId) : 0),
            ),
        [data, currentUserId],
    );

    return { messages, isLoading, error };
}

export { useSendMessageMutation, useMarkAsReadMutation };
