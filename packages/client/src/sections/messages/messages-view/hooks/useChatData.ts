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

function mapRoomToConversation(
  room: ChatRoom,
  currentUserId: number,
): Conversation {
  const profiles = room.participantProfiles ?? [];
  const other =
    profiles.find((p) => Number(p.id) !== currentUserId) ?? profiles[0] ?? null;

  const otherRoleCode = (other?.role?.code ?? "").toUpperCase();
  const category =
    otherRoleCode === "CLIENT"
      ? ("client" as const)
      : ("collaborateur" as const);

  let name: string;
  let role: string;
  let avatar: string;

  if (other) {
    const fullName =
      [other.firstName, other.lastName].filter(Boolean).join(" ") ||
      other.username ||
      other.email;
    name = fullName;
    role = other.role?.nameFr ?? "";
    avatar = fullName
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
  } else {
    name = room.name || "Conversation";
    role = room.type;
    avatar = (room.name || "??")
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  let preview = "";
  if (room.lastMessage) {
    const lm = room.lastMessage;
    const isOwn = Number(lm.senderId) === currentUserId;
    let body: string;
    if (lm.type === "file") {
      body = `📎 ${lm.content || "fichier"}`;
    } else {
      body = lm.content || "";
    }
    preview = isOwn ? `Vous : ${body}` : body;
  }

  const lastDate =
    room.lastActivity ?? room.updatedAt ?? new Date().toISOString();

  return {
    id: room.id,
    name,
    role,
    preview,
    fullDate: lastDate,
    time: new Date(lastDate).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    avatar,
    avatarColor: "#D9D9D9",
    avatarTextColor: "#666666",
    online: false,
    unreadCount: 0,
    phone: "",
    category,
  };
}

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
    // content = MinIO objectName, fileUrl = presigned URL from backend
    const url = msg.fileUrl || "";
    // Extract display name from objectName path (last segment after last /)
    const objectName = msg.content || "";
    const fileName = objectName.split("/").pop() || objectName || "Fichier";
    return {
      id: msg.id,
      type: "file" as const,
      mine: isMine,
      time,
      date,
      file: { name: fileName, size: "", type: "pdf", url },
    };
  }

  return {
    id: msg.id,
    type: "text" as const,
    text: msg.content,
    mine: isMine,
    time,
    date,
  };
}

export function useConversations() {
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const uid = currentUserId ? Number(currentUserId) : 0;

  // getUserRooms returns GetRoomsResponse: { data: ChatRoom[], total, page, pageSize, totalPages }
  const {
    data: roomsResponse,
    isLoading,
    error,
  } = useGetUserRoomsQuery(undefined, {
    refetchOnMountOrArgChange: true,
    // No polling — real-time updates handled by WebSocket
  });

  // Extract the array — roomsResponse is the paginated object, not the array itself
  const rooms: ChatRoom[] = roomsResponse?.data ?? [];

  const conversations = useMemo(
    () => rooms.map((room) => mapRoomToConversation(room, uid)),
    [rooms, uid],
  );

  return { conversations, isLoading, error };
}

export function useRoomMessages(roomId: number) {
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const uid = currentUserId ? Number(currentUserId) : 0;

  const { data, isLoading, error } = useGetRoomMessagesQuery(roomId, {
    skip: !roomId,
    refetchOnMountOrArgChange: true,
    // No polling — real-time updates handled by WebSocket
  });

  const messages = useMemo(
    () => (data?.messages ?? []).map((msg) => mapApiMessageToMessage(msg, uid)),
    [data, uid],
  );

  return { messages, isLoading, error };
}

export { useSendMessageMutation, useMarkAsReadMutation };
