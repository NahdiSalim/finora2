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
  type GetRoomsParams,
} from "src/lib/services/chatApi";
import type {
  Conversation,
  ConversationCategory,
  Message,
} from "../data/types";

function mapRoomToConversation(
  room: ChatRoom,
  currentUserId: number,
): Conversation {
  const profiles = room.participantProfiles ?? [];
  const other =
    profiles.find((p) => Number(p.id) !== currentUserId) ?? profiles[0] ?? null;

  // Normalise role code to one of our two ConversationCategory values.
  // CLIENT → "client"; anything in the collaborator/accountant family → "collaborateur"
  const otherRoleCode = (other?.role?.code ?? "").toLowerCase();
  const category: ConversationCategory =
    otherRoleCode === "client" || otherRoleCode.startsWith("client_")
      ? "client"
      : "collaborateur";

  let name: string;
  let role: string;
  let avatar: string;

  if (other) {
    const fullName =
      [other.firstName, other.lastName].filter(Boolean).join(" ") ||
      other.username ||
      other.email;
    name = fullName;
    // For clients, show company name instead of role
    if (category === "client") {
      role = other.company?.name ?? other.role?.nameFr ?? "";
    } else {
      role = other.role?.nameFr ?? "";
    }
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
    if (lm.type === "file" || lm.type === "image") {
      const fileName = lm.content?.split("/").pop() || "fichier";
      body = `📎 ${fileName}`;
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
    unreadCount: room.unreadCount ?? 0,
    phone: "",
    category,
  };
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  accounting: "Comptabilité",
  tax: "Fiscalité",
  consultation: "Consultation",
  document: "Document",
  other: "Autre",
};

const REQUEST_STATUS_LABELS: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  resolved: "Terminé",
  rejected: "Rejeté",
  cancelled: "Annulé",
};

const REQUEST_URGENCY_LABELS: Record<string, string> = {
  low: "Low",
  normal: "Normal",
  high: "High",
  urgent: "Urgent !",
};

export function mapApiMessageToMessage(
  msg: ChatMessage,
  currentUserId: number,
): Message {
  const date = new Date(msg.createdAt).toISOString().split("T")[0];
  const time = new Date(msg.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  const isMine = msg.senderId === currentUserId;

  if (msg.request) {
    return {
      id: msg.id,
      type: "request" as const,
      text: msg.content,
      html: msg.content,
      mine: isMine,
      time,
      date,
      request: {
        id: msg.request.id,
        title: msg.request.subject,
        subtitle: REQUEST_TYPE_LABELS[msg.request.type] || msg.request.type,
        status: REQUEST_STATUS_LABELS[msg.request.status] || msg.request.status,
        urgency:
          REQUEST_URGENCY_LABELS[msg.request.urgency] || msg.request.urgency,
      },
    };
  }

  if (msg.task) {
    return {
      id: msg.id,
      type: "task" as const,
      text: msg.content,
      html: msg.content,
      mine: isMine,
      time,
      date,
      task: {
        id: msg.task.id,
        title: msg.task.title,
        status: msg.task.status,
        priority: msg.task.priority,
      },
    };
  }

  if (msg.appointment) {
    return {
      id: msg.id,
      type: "appointment" as const,
      text: msg.content,
      html: msg.content,
      mine: isMine,
      time,
      date,
      appointment: {
        id: msg.appointment.id,
        title: msg.appointment.title,
        startTime: msg.appointment.startTime,
        endTime: msg.appointment.endTime,
        status: msg.appointment.status,
        type: msg.appointment.type,
      },
    };
  }

  if (msg.type === "file" || msg.type === "image") {
    // content = user's message text or file name
    // fileUrl = presigned URL from backend for the actual file
    const url = msg.fileUrl || "";
    const objectName = msg.content || "";
    const fileName = objectName.split("/").pop() || objectName || "Fichier";
    // Derive category: trust server type hint ("image") first, then filename extension
    const lower = fileName.toLowerCase();
    const fileCategory =
      msg.type === "image" || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lower)
        ? "image"
        : lower.endsWith(".pdf")
          ? "pdf"
          : /\.docx?$/.test(lower)
            ? "doc"
            : /\.(xlsx?|csv)$/.test(lower)
              ? "xls"
              : "file";
    return {
      id: msg.id,
      type: "file" as const,
      text: msg.content,
      html: msg.content,
      mine: isMine,
      time,
      date,
      file: { name: fileName, size: "", type: fileCategory, url },
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

export function useConversations(params?: GetRoomsParams) {
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const uid = currentUserId ? Number(currentUserId) : 0;

  // getUserRooms returns GetRoomsResponse: { data: ChatRoom[], total, page, pageSize, totalPages }
  const {
    data: roomsResponse,
    isLoading,
    error,
  } = useGetUserRoomsQuery(params, {
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

export function useRoomMessages(roomId: number, page: number, limit: number) {
  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);
  const uid = currentUserId ? Number(currentUserId) : 0;

  const { data, isLoading, error } = useGetRoomMessagesQuery(
    { roomId, page, limit },
    {
      skip: !roomId,
      refetchOnMountOrArgChange: true,
      // No polling — real-time updates handled by WebSocket
    },
  );

  const messages = useMemo(
    () => (data?.messages ?? []).map((msg) => mapApiMessageToMessage(msg, uid)),
    [data, uid],
  );

  return {
    messages,
    isLoading,
    error,
    totalMessages: data?.total ?? 0,
    totalPages: data?.totalPages ?? 1,
  };
}

export { useSendMessageMutation, useMarkAsReadMutation };
