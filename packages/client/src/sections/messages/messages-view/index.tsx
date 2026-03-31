import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { Dayjs } from "dayjs";
import { useSelector } from "react-redux";
import { useAppDispatch } from "src/hooks/use-redux";

import ConversationsList from "./views/ConversationsList";
import ChatWindow from "./views/ChatWindow";
import SharedMediaView from "./views/SharedMediaView";

import { useChatSocket } from "./hooks/useChatSocket";
import type { SocketMessage } from "./hooks/useChatSocket";

import {
  useConversations,
  useRoomMessages,
  mapApiMessageToMessage,
} from "./hooks/useChatData";
import type {
  MessageRequest,
  MessageTask,
  MessageAppointment,
  Conversation,
  ConversationCategory,
  Message,
} from "./data/types";
import {
  useSendMessageMutation,
  useGetUserRoomsQuery,
  useLazyGetRoomMessagesQuery,
  useMarkRoomAsReadMutation,
  useFindOrCreateDirectRoomMutation,
  chatApi,
  type GetRoomsParams,
} from "src/lib/services/chatApi";
import { disconnectSocket, isSocketConnected } from "src/lib/socket";

import type { RootState } from "src/lib/store";
import type { Role } from "src/types/auth";

type MessagesViewProps = {
  onOpenMedia?: () => void;
};

const MOBILE_BOTTOM_NAV_HEIGHT = 72;
const MOBILE_HEADER_HEIGHT = 88;

// ── Role helpers ──────────────────────────────────────────────────────────────
// Normalise whatever shape role arrives in to a lowercase code string.
function getRoleCode(role: Role | string | null | undefined): string {
  if (!role) return "";
  return (typeof role === "string" ? role : (role.code ?? "")).toLowerCase();
}

// True if the role code belongs to the "comptable / accountant" group.
function isComptableRole(code: string): boolean {
  return (
    code === "comptable" ||
    code === "accountant" ||
    code.includes("comptable") ||
    code.includes("accountant")
  );
}

// True if the role code belongs to the "client" group.
function isClientRole(code: string): boolean {
  return code === "client" || code.startsWith("client_");
}

/**
 * Map the selected UI tab + the viewer's role to the actual role-code that
 * the backend should filter participant profiles by.
 *
 * Tab "client"       (only Comptables can see it) → filter by CLIENT participants
 * Tab "collaborateur" + viewer is Comptable        → filter by COLLABORATOR participants
 * Tab "collaborateur" + viewer is Client/Collaborateur → filter by COMPTABLE participants
 */
function resolveApiCategory(
  tab: ConversationCategory,
  myRoleCode: string,
): string {
  if (tab === "client") return "client";
  // "collaborateur" tab
  if (isComptableRole(myRoleCode)) return "collaborateur";
  return "comptable"; // Client/Collaborateur users chat with Comptables
}

export default function MessagesView({ onOpenMedia }: MessagesViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();

  const rawUserId = useSelector((state: RootState) => state.auth.user?.id);
  const currentUid = rawUserId ? Number(rawUserId) : 0;

  const rawUserRole = useSelector((state: RootState) => state.auth.user?.role);
  const myRoleCode = getRoleCode(
    rawUserRole as Role | string | null | undefined,
  );
  const iAmComptable = isComptableRole(myRoleCode);

  // Only Comptables see both tabs; everyone else sees only "Collaborateurs"
  const visibleTabs = useMemo(
    () =>
      iAmComptable
        ? [
            { label: "Clients", value: "client" as const },
            { label: "Collaborateurs", value: "collaborateur" as const },
          ]
        : [{ label: "Collaborateurs", value: "collaborateur" as const }],
    [iAmComptable],
  );

  // ── All local state declared first so roomsParams can reference them ───────
  const [activeTab, setActiveTab] = useState<ConversationCategory>(() => {
    const cat = searchParams.get("category");
    return cat === "client" ? "client" : "collaborateur";
  });
  const [roomsPage] = useState(1);
  const ROOMS_PAGE_SIZE = 50;
  const MESSAGES_PAGE_SIZE = 20;
  const [selectedConversation, setSelectedConversation] = useState<number>(
    () => {
      const rid = Number(searchParams.get("roomId"));
      return Number.isFinite(rid) && rid > 0 ? rid : 0;
    },
  );
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Dayjs | null>(
    null,
  );
  const [desktopView, setDesktopView] = useState<"chat" | "media">("chat");
  const [mobileView, setMobileView] = useState<"list" | "chat" | "media">(
    "list",
  );

  // Ref to always have current selectedConversation in socket callbacks.
  const selectedConversationRef = useRef(selectedConversation);
  selectedConversationRef.current = selectedConversation;

  // Debounce search so the API is only called 300 ms after the user stops typing
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // ── API query params (drives the rooms list query) ─────────────────────────
  const roomsParams = useMemo<GetRoomsParams>(() => {
    const p: GetRoomsParams = {
      // Translate the UI tab + viewer role into the actual participant role code
      // the backend should filter by (see resolveApiCategory above).
      category: resolveApiCategory(activeTab, myRoleCode),
      page: roomsPage,
      pageSize: ROOMS_PAGE_SIZE,
    };
    if (debouncedSearch) p.search = debouncedSearch;
    if (selectedDateFilter) p.date = selectedDateFilter.format("YYYY-MM-DD");
    return p;
  }, [activeTab, myRoleCode, roomsPage, debouncedSearch, selectedDateFilter]);

  // Keep a ref so socket callbacks can always read the current params
  const roomsParamsRef = useRef(roomsParams);
  roomsParamsRef.current = roomsParams;

  // ── API data ──────────────────────────────────────────────────────────────
  const { conversations: apiConversations, isLoading: roomsLoading } =
    useConversations(roomsParams);
  const { data: roomsResponse } = useGetUserRoomsQuery(roomsParams);
  const rawRooms = useMemo(
    () => roomsResponse?.data ?? [],
    [roomsResponse?.data],
  );
  const [triggerSendMessage] = useSendMessageMutation();
  const [triggerGetOlderMessages] = useLazyGetRoomMessagesQuery();
  const [triggerMarkRoomAsRead] = useMarkRoomAsReadMutation();
  const [triggerFindOrCreateDirectRoom] = useFindOrCreateDirectRoomMutation();

  // Older messages accumulation per room (scroll-based infinite loading)
  const [olderMessagesByRoom, setOlderMessagesByRoom] = useState<
    Record<number, Message[]>
  >({});
  const [nextOlderPageByRoom, setNextOlderPageByRoom] = useState<
    Record<number, number>
  >({});
  const [isLoadingOlderByRoom, setIsLoadingOlderByRoom] = useState<
    Record<number, boolean>
  >({});

  // Typing indicator state: set of roomIds where the other user is typing
  const [typingRooms, setTypingRooms] = useState<Set<number>>(new Set());

  // Buffer realtime messages that arrive before the active conversation is ready.
  // This prevents "works for sender, not for recipient until refresh" cases caused by timing.
  const pendingRealtimeByRoomRef = useRef<Map<number, SocketMessage[]>>(
    new Map(),
  );

  // ── Socket ────────────────────────────────────────────────────────────────
  const { joinRoom, leaveRoom, emitTyping } = useChatSocket({
    activeRoomId: selectedConversation,
    onReconnect: () => {
      // After a socket reconnect, messages may have been emitted while the
      // socket was down. Invalidate the current room's cache so RTK Query
      // refetches and the UI is up to date.
      const roomId = selectedConversationRef.current;
      if (roomId) {
        console.log(
          "[MessagesView] socket reconnected, refetching messages for room:",
          roomId,
        );
        dispatch(
          chatApi.util.invalidateTags([{ type: "ChatMessages", id: roomId }]),
        );
      }
    },
    onMessageNew: (msg: SocketMessage) => {
      const isMine = msg.senderId === currentUid;
      const activeRoomId = selectedConversationRef.current;

      console.log("[MessagesView] message:new received:", {
        msgId: msg.id,
        msgRoomId: msg.roomId,
        activeRoomId,
        currentUid,
        socketConnected: isSocketConnected(),
      });

      console.log(
        "[onMessageNew] id:",
        msg.id,
        "| roomId:",
        msg.roomId,
        "| senderId:",
        msg.senderId,
        "| currentUid:",
        currentUid,
        "| isMine:",
        isMine,
      );

      // 1. Inject into getRoomMessages cache for that room
      // Only update messages for the currently visible conversation.
      if (activeRoomId && msg.roomId === activeRoomId) {
        console.log("[MessagesView] updating cache for active conversation:", {
          roomId: msg.roomId,
          msgId: msg.id,
        });
        dispatch(
          chatApi.util.updateQueryData(
            "getRoomMessages",
            { roomId: msg.roomId, page: 1, limit: MESSAGES_PAGE_SIZE },
            (draft) => {
              if (draft.messages.some((m) => m.id === msg.id)) {
                console.log(
                  "[MessagesView] message already in cache; skipping:",
                  {
                    roomId: msg.roomId,
                    msgId: msg.id,
                  },
                );
                return;
              }
              draft.messages.push({
                id: msg.id,
                roomId: msg.roomId,
                senderId: msg.senderId,
                content: msg.content,
                type: msg.type,
                createdAt: msg.createdAt,
                deleted: false,
                edited: false,
                fileUrl: msg.fileUrl ?? null,
                attachments: msg.attachments,
                sender: msg.sender,
                requestId: msg.requestId ?? undefined,
                taskId: msg.taskId ?? undefined,
                appointmentId: msg.appointmentId ?? undefined,
                request: msg.request ?? undefined,
                task: msg.task ?? undefined,
                appointment: msg.appointment ?? undefined,
              });
              draft.total += 1;
              console.log("[MessagesView] cache updated:", {
                roomId: msg.roomId,
                msgId: msg.id,
              });
            },
          ),
        );
      } else {
        // Cache might not exist yet because useRoomMessages is skipped until roomId is non-zero.
        // Buffer it and flush when/if the user opens that room.
        const existing = pendingRealtimeByRoomRef.current.get(msg.roomId) ?? [];
        pendingRealtimeByRoomRef.current.set(msg.roomId, [...existing, msg]);
        console.log(
          "[MessagesView] buffering message:new (room not active yet):",
          {
            msgId: msg.id,
            msgRoomId: msg.roomId,
            activeRoomId,
          },
        );
      }

      // 2. Update rooms list preview + reorder
      dispatch(
        chatApi.util.updateQueryData(
          "getUserRooms",
          roomsParamsRef.current,
          (draft) => {
            const room = draft.data.find((r) => r.id === msg.roomId);
            if (!room) {
              return;
            }

            room.lastMessage = {
              id: msg.id,
              roomId: msg.roomId,
              // Store raw content. The "Vous :" prefix must be derived in
              // mapRoomToConversation() based on (lastMessage.senderId === currentUserId).
              content: msg.content,
              type: msg.type,
              senderId: msg.senderId,
              createdAt: msg.createdAt,
            };
            room.lastActivity = msg.createdAt;

            // Bubble room to top
            const idx = draft.data.findIndex((r) => r.id === msg.roomId);
            if (idx > 0) {
              const [moved] = draft.data.splice(idx, 1);
              draft.data.unshift(moved);
            }
            console.log(
              "[cache getUserRooms] updated preview:",
              room.lastMessage.content,
            );
          },
        ),
      );

      // Prevent stale optimistic preview overrides from overriding the
      // computed preview for the current authenticated user.
      setConversationOverrides((prev) => {
        if (!prev[msg.roomId]) return prev;
        const next = { ...prev };
        delete next[msg.roomId];
        return next;
      });
    },

    onMessageUpdated: (msg: SocketMessage) => {
      const activeRoomId = selectedConversationRef.current;
      console.log("[MessagesView] message:updated received:", {
        msgId: msg.id,
        msgRoomId: msg.roomId,
        activeRoomId,
      });
      if (activeRoomId && msg.roomId === activeRoomId) {
        dispatch(
          chatApi.util.updateQueryData(
            "getRoomMessages",
            { roomId: msg.roomId, page: 1, limit: MESSAGES_PAGE_SIZE },
            (draft) => {
              const existing = draft.messages.find((m) => m.id === msg.id);
              if (existing) {
                existing.content = msg.content;
                existing.edited = true;
                console.log(
                  "[MessagesView] cache updated for message:updated:",
                  {
                    roomId: msg.roomId,
                    msgId: msg.id,
                  },
                );
              }
            },
          ),
        );
      }
    },

    onMessageDeleted: ({ messageId, roomId }) => {
      if (!roomId) return;

      const activeRoomId = selectedConversationRef.current;
      console.log("[MessagesView] message:deleted received:", {
        msgId: messageId,
        msgRoomId: roomId,
        activeRoomId,
      });
      if (!activeRoomId || roomId !== activeRoomId) return;

      dispatch(
        chatApi.util.updateQueryData(
          "getRoomMessages",
          { roomId, page: 1, limit: MESSAGES_PAGE_SIZE },
          (draft) => {
            const idx = draft.messages.findIndex((m) => m.id === messageId);
            if (idx !== -1) draft.messages.splice(idx, 1);
          },
        ),
      );
    },

    onTyping: ({ roomId, userId, typing }) => {
      if (userId === currentUid) return;

      setTypingRooms((prev) => {
        const next = new Set(prev);
        if (typing) next.add(roomId);
        else next.delete(roomId);
        return next;
      });
    },
  });

  // Join/leave room via socket when selected conversation changes
  useEffect(() => {
    if (!selectedConversation) return undefined;

    joinRoom(selectedConversation);
    return () => {
      leaveRoom(selectedConversation);
    };
  }, [selectedConversation, joinRoom, leaveRoom]);

  // Flush any buffered realtime messages when the room becomes active.
  useEffect(() => {
    const roomId = selectedConversation;
    if (!roomId) return;

    const pending = pendingRealtimeByRoomRef.current.get(roomId);
    if (!pending || pending.length === 0) return;

    console.log("[MessagesView] flushing buffered realtime messages:", {
      roomId,
      count: pending.length,
    });

    pendingRealtimeByRoomRef.current.delete(roomId);

    pending.forEach((msg) => {
      dispatch(
        chatApi.util.updateQueryData(
          "getRoomMessages",
          { roomId, page: 1, limit: MESSAGES_PAGE_SIZE },
          (draft) => {
            if (draft.messages.some((m) => m.id === msg.id)) return;
            draft.messages.push({
              id: msg.id,
              roomId: msg.roomId,
              senderId: msg.senderId,
              content: msg.content,
              type: msg.type,
              createdAt: msg.createdAt,
              deleted: false,
              edited: false,
              fileUrl: msg.fileUrl ?? null,
              attachments: msg.attachments,
              sender: msg.sender,
            });
            draft.total += 1;
          },
        ),
      );
    });
  }, [selectedConversation, dispatch]);

  // Disconnect socket when leaving the messages page
  // Use disconnectSocket (not destroySocket) so the singleton survives StrictMode double-mount
  useEffect(
    () => () => {
      disconnectSocket();
    },
    [],
  );

  // Local overrides for optimistic UI (preview text, unread counts)
  const [conversationOverrides, setConversationOverrides] = useState<
    Record<number, Partial<Conversation>>
  >({});

  const allConversations: Conversation[] = useMemo(
    () =>
      apiConversations.map((c) => ({
        ...c,
        ...(conversationOverrides[c.id] ?? {}),
      })),
    [apiConversations, conversationOverrides],
  );

  // Auto-select first conversation when rooms load (only if no room was pre-selected via URL)
  useEffect(() => {
    if (allConversations.length > 0 && selectedConversation === 0) {
      setSelectedConversation(allConversations[0].id);
    }
  }, [allConversations, selectedConversation]);

  // On mobile, navigate straight to chat if a roomId was passed via URL param
  useEffect(() => {
    const rid = Number(searchParams.get("roomId"));
    if (rid > 0 && isMobile) {
      setMobileView("chat");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount

  // Sync room selection whenever URL params change (handles navigation from the
  // messages popover while this page is already mounted — useState initializers
  // only run on first mount so they miss subsequent URL changes).
  useEffect(() => {
    const rid = Number(searchParams.get("roomId"));
    const cat = searchParams.get("category") as ConversationCategory | null;
    if (rid > 0) {
      if (cat === "client" || cat === "collaborateur") {
        setActiveTab(cat);
      }
      setSelectedConversation(rid);
      // Clear the unread badge for this room in the left panel — mirrors what
      // handleSelectConversation does when the user clicks directly in the list.
      setConversationOverrides((prev) => ({
        ...prev,
        [rid]: { ...(prev[rid] ?? {}), unreadCount: 0 },
      }));
      // Persist read state to backend
      triggerMarkRoomAsRead(rid);
      if (isMobile) setMobileView("chat");
      else setDesktopView("chat");
    }
  }, [searchParams, isMobile]);

  // Reset older messages accumulation when switching conversations
  useEffect(() => {
    setOlderMessagesByRoom((prev) => ({ ...prev, [selectedConversation]: [] }));
    setNextOlderPageByRoom((prev) => ({ ...prev, [selectedConversation]: 2 }));
    setIsLoadingOlderByRoom((prev) => ({
      ...prev,
      [selectedConversation]: false,
    }));
  }, [selectedConversation]);

  // ── Messages for selected room ────────────────────────────────────────────
  const { messages: apiMessages, totalMessages } = useRoomMessages(
    selectedConversation,
    1,
    MESSAGES_PAGE_SIZE,
  );

  // Optimistic local messages for messages sent by the current user
  const [localMessages, setLocalMessages] = useState<Record<number, Message[]>>(
    {},
  );

  const currentMessages: Message[] = useMemo(() => {
    const page1 = apiMessages;
    const older = olderMessagesByRoom[selectedConversation] ?? [];
    const local = localMessages[selectedConversation] ?? [];

    const page1Ids = new Set(page1.map((m) => m.id));
    const olderFiltered = older.filter((m) => !page1Ids.has(m.id));
    const localFiltered = local.filter((m) => !page1Ids.has(m.id));

    // oldest (older pages) → page 1 (recent) → optimistic local
    return [...olderFiltered, ...page1, ...localFiltered];
  }, [apiMessages, olderMessagesByRoom, localMessages, selectedConversation]);

  // Clear optimistic messages once API confirms them
  useEffect(() => {
    if (apiMessages.length === 0) return;

    setLocalMessages((prev) => {
      if (!prev[selectedConversation]?.length) return prev;
      const updated = { ...prev };
      delete updated[selectedConversation];
      return updated;
    });
  }, [apiMessages, selectedConversation]);

  // ── Sync mobile view ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isMobile) setMobileView("list");
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) {
      document.body.removeAttribute("data-hide-bottom-nav");
    } else {
      const shouldHide = mobileView === "chat" || mobileView === "media";
      if (shouldHide) {
        document.body.setAttribute("data-hide-bottom-nav", "true");
      } else {
        document.body.removeAttribute("data-hide-bottom-nav");
      }
    }

    return () => {
      document.body.removeAttribute("data-hide-bottom-nav");
    };
  }, [isMobile, mobileView]);

  // ── Older messages (scroll-based loading) ────────────────────────────────
  const olderMessages = olderMessagesByRoom[selectedConversation] ?? [];
  const hasMoreOlderMessages =
    selectedConversation > 0 &&
    totalMessages > MESSAGES_PAGE_SIZE + olderMessages.length;
  const isLoadingOlder = isLoadingOlderByRoom[selectedConversation] ?? false;

  const handleLoadOlderMessages = useCallback(async () => {
    const roomId = selectedConversation;
    if (!roomId || isLoadingOlderByRoom[roomId]) return;
    if (!hasMoreOlderMessages) return;

    const nextPage = nextOlderPageByRoom[roomId] ?? 2;

    setIsLoadingOlderByRoom((prev) => ({ ...prev, [roomId]: true }));
    try {
      const result = await triggerGetOlderMessages(
        { roomId, page: nextPage, limit: MESSAGES_PAGE_SIZE },
        true,
      ).unwrap();
      const mapped = result.messages.map((m) =>
        mapApiMessageToMessage(m, currentUid),
      );
      setOlderMessagesByRoom((prev) => ({
        ...prev,
        // Prepend: new older page goes before existing older pages
        [roomId]: [...mapped, ...(prev[roomId] ?? [])],
      }));
      setNextOlderPageByRoom((prev) => ({ ...prev, [roomId]: nextPage + 1 }));
    } catch {
      // silent — user can scroll up again to retry
    } finally {
      setIsLoadingOlderByRoom((prev) => ({ ...prev, [roomId]: false }));
    }
  }, [
    selectedConversation,
    isLoadingOlderByRoom,
    hasMoreOlderMessages,
    nextOlderPageByRoom,
    currentUid,
    triggerGetOlderMessages,
  ]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectConversation = async (id: number) => {
    // If it's a virtual room (negative ID), create the real room first
    if (id < 0) {
      const targetUserId = Math.abs(id);
      try {
        const result = await triggerFindOrCreateDirectRoom({
          targetUserId,
        }).unwrap();
        const realRoomId = result.id;

        // Now select the real room
        setSelectedConversation(realRoomId);

        if (isMobile) setMobileView("chat");
        else setDesktopView("chat");

        return;
      } catch (error) {
        console.error("Failed to create room:", error);
        return;
      }
    }

    // Normal room selection
    setSelectedConversation(id);

    if (isMobile) setMobileView("chat");
    else setDesktopView("chat");

    setConversationOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), unreadCount: 0 },
    }));

    // Persist read state to backend so it survives page reload
    triggerMarkRoomAsRead(id);
  };

  const handleSearchChange = (value: string) => setSearchTerm(value);
  const handleDateFilterChange = (value: Dayjs | null) =>
    setSelectedDateFilter(value);
  const handleTabChange = useCallback(
    (tab: ConversationCategory) => {
      setActiveTab(tab);
      setSearchTerm("");
      setSelectedDateFilter(null);
      setSelectedConversation(0);
      if (isMobile) setMobileView("list");
      else setDesktopView("chat");
    },
    [isMobile],
  );

  const handleMarkCurrentRoomAsRead = useCallback(() => {
    if (selectedConversation > 0) {
      triggerMarkRoomAsRead(selectedConversation);
    }
  }, [selectedConversation, triggerMarkRoomAsRead]);

  const handleMessagesChange = async (updatedMessages: Message[]) => {
    const lastMessage = updatedMessages[updatedMessages.length - 1];
    if (!lastMessage || !lastMessage.mine) return;

    // Optimistic update
    setLocalMessages((prev) => ({
      ...prev,
      [selectedConversation]: [
        ...(prev[selectedConversation] ?? []),
        lastMessage,
      ],
    }));

    // Update conversation preview optimistically
    let previewText = "";
    if (lastMessage.type === "text") {
      previewText = lastMessage.text ?? "";
    } else if (lastMessage.type === "file") {
      const text = lastMessage.text?.trim();
      previewText = text
        ? `${text} 📎 ${lastMessage.file?.name ?? "Fichier"}`
        : `📎 ${lastMessage.file?.name ?? "Fichier"}`;
    } else if (lastMessage.type === "request") {
      const text = lastMessage.text?.trim();
      previewText = text
        ? `${text} 🔗 Demande`
        : `🔗 ${lastMessage.request?.title ?? "Demande"}`;
    } else if (lastMessage.type === "task") {
      const text = lastMessage.text?.trim();
      previewText = text
        ? `${text} ✓ Tâche`
        : `✓ ${lastMessage.task?.title ?? "Tâche"}`;
    } else if (lastMessage.type === "appointment") {
      const text = lastMessage.text?.trim();
      previewText = text
        ? `${text} 📅 Rendez-vous`
        : `📅 ${lastMessage.appointment?.title ?? "Rendez-vous"}`;
    }

    setConversationOverrides((prev) => ({
      ...prev,
      [selectedConversation]: {
        ...(prev[selectedConversation] ?? {}),
        preview: `Vous : ${previewText}`,
        time: lastMessage.time,
        fullDate: new Date().toISOString(),
      },
    }));

    // Send typing stop when sending a message
    emitTyping(selectedConversation, false);

    // Send to API (text messages only; file handling stays in ChatWindow)
    if (lastMessage.type === "text" && lastMessage.text) {
      try {
        await triggerSendMessage({
          roomId: selectedConversation,
          content: lastMessage.text,
          type: "text",
        }).unwrap();
      } catch {
        // Keep optimistic message visible even on error
      }
    }
  };

  const handleSendFile = async (
    messageHtml: string,
    file?: File,
    request?: MessageRequest,
    task?: MessageTask,
    appointment?: MessageAppointment,
  ) => {
    const roomId = selectedConversationRef.current;
    if (!roomId) return;

    // Extract plain text from HTML for the content field
    const div = document.createElement("div");
    div.innerHTML = messageHtml;
    const plainText = (div.textContent || "").replace(/\u00a0/g, " ").trim();
    const messageContent =
      plainText ||
      file?.name ||
      request?.title ||
      task?.title ||
      appointment?.title ||
      "";

    if (file) {
      const messageType = file.type?.startsWith("image/") ? "image" : "file";
      console.log("[MessagesView] sending file via REST:", {
        roomId,
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        messageType,
        messageContent,
      });

      try {
        const saved = await triggerSendMessage({
          roomId,
          content: messageContent,
          type: messageType,
          attachments: [file],
          requestId: request?.id,
          taskId: task?.id,
          appointmentId: appointment?.id,
        }).unwrap();

        console.log("[MessagesView] file saved + message:new expected:", {
          messageId: saved.id,
          savedType: saved.type,
          hasFileUrl: !!saved.fileUrl,
          fileUrlPreview: saved.fileUrl ? saved.fileUrl.slice(0, 40) : null,
        });
      } catch (err) {
        console.error("[MessagesView] file send failed:", err);
      }
    } else if (request) {
      try {
        await triggerSendMessage({
          roomId,
          content: messageContent,
          type: "text",
          requestId: request.id,
        }).unwrap();
      } catch (err) {
        console.error("[MessagesView] request attachment send failed:", err);
      }
    } else if (task) {
      try {
        await triggerSendMessage({
          roomId,
          content: messageContent,
          type: "text",
          taskId: task.id,
        }).unwrap();
      } catch (err) {
        console.error("[MessagesView] task attachment send failed:", err);
      }
    } else if (appointment) {
      try {
        await triggerSendMessage({
          roomId,
          content: messageContent,
          type: "text",
          appointmentId: appointment.id,
        }).unwrap();
      } catch (err) {
        console.error(
          "[MessagesView] appointment attachment send failed:",
          err,
        );
      }
    }
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  // Filtering (category, search, date) is handled server-side via roomsParams.
  // allConversations already contains only the relevant subset from the API.
  const filteredConversations = allConversations;

  useEffect(() => {
    if (filteredConversations.length === 0) return;
    // While rooms are being fetched (e.g. after a tab/category change triggered
    // by URL navigation), the new room hasn't arrived yet — don't override.
    if (roomsLoading) return;

    const selectedStillExists = filteredConversations.some(
      (c) => c.id === selectedConversation,
    );

    if (!selectedStillExists) {
      setSelectedConversation(filteredConversations[0].id);
      if (isMobile) setMobileView("list");
      else setDesktopView("chat");
    }
  }, [filteredConversations, selectedConversation, isMobile, roomsLoading]);

  const hasSelectedConversation = filteredConversations.some(
    (c) => c.id === selectedConversation,
  );

  const showEmptyState =
    filteredConversations.length === 0 || !hasSelectedConversation;

  const currentConversation = useMemo(
    () => allConversations.find((c) => c.id === selectedConversation),
    [allConversations, selectedConversation],
  );

  const currentRoom = useMemo(
    () => rawRooms.find((r) => r.id === selectedConversation),
    [rawRooms, selectedConversation],
  );

  const recipientInfo = useMemo(() => {
    if (!currentRoom) return { recipientType: null, recipientId: null };

    const profiles = currentRoom.participantProfiles ?? [];
    const otherParticipant = profiles.find((p) => Number(p.id) !== currentUid);

    if (!otherParticipant) return { recipientType: null, recipientId: null };

    const roleCode = (otherParticipant.role?.code ?? "").toLowerCase();
    const recipientType: "client" | "collaborator" =
      roleCode === "client" || roleCode.startsWith("client_")
        ? "client"
        : "collaborator";

    return {
      recipientType,
      recipientId: otherParticipant.id,
    };
  }, [currentRoom, currentUid]);

  const isRemoteTyping = typingRooms.has(selectedConversation);

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderContentHeader = () => (
    <Box
      sx={{
        flexShrink: 0,
        mb: isMobile ? 1.5 : 2,
        px: isMobile ? 0.5 : 0.25,
        pt: isMobile ? 0.5 : 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: isMobile ? "space-between" : "flex-start",
          gap: isMobile ? 1 : 1.25,
          mb: 0.75,
          width: "100%",
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: isMobile ? 24 : 30,
            fontWeight: 600,
            lineHeight: 1.15,
            color: (theme.palette.grey as any)[1000],
            letterSpacing: "-0.02em",
          }}
        >
          Messagerie
        </Box>
      </Box>

      <Box
        sx={{
          fontSize: isMobile ? 13 : 14,
          color: theme.palette.info.light,
          lineHeight: 1.45,
        }}
      >
        Un espace simple et sécurisé pour vos échanges.
      </Box>
    </Box>
  );

  const renderMediaPanel = (content: React.ReactNode) => (
    <Paper
      elevation={0}
      sx={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        px: isMobile ? 1.25 : 2.5,
        pt: isMobile ? 1.25 : 2.25,
        pb: isMobile ? 1.25 : 1.75,
        display: "flex",
        flexDirection: "column",
        borderRadius: isMobile ? "16px" : "20px",
        border: "1px solid",
        borderColor: theme.palette.grey[200],
        backgroundColor: theme.palette.common.white,
        overflow: "hidden",
      }}
    >
      {content}
    </Paper>
  );

  if (roomsLoading) {
    return (
      <Box
        sx={{
          height: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (isMobile) {
    return (
      <>
        {mobileView === "list" && (
          <Box
            sx={{
              width: "100%",
              minWidth: 0,
              height: `calc(100dvh - ${MOBILE_HEADER_HEIGHT}px - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              px: 1.5,
              pt: 1.25,
              pb: 0,
              backgroundColor: theme.palette.common.white,
            }}
          >
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {renderContentHeader()}

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <ConversationsList
                  conversations={filteredConversations}
                  selectedConversation={selectedConversation}
                  searchTerm={searchTerm}
                  selectedDateFilter={selectedDateFilter}
                  tabs={visibleTabs}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  onSearchChange={handleSearchChange}
                  onDateFilterChange={handleDateFilterChange}
                  onSelect={handleSelectConversation}
                />
              </Box>
            </Box>
          </Box>
        )}

        {mobileView === "chat" && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              width: "100%",
              height: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: theme.palette.common.white,
            }}
          >
            {showEmptyState ? (
              <Box sx={{ flex: 1, minHeight: 0 }} />
            ) : (
              <ChatWindow
                conversationId={selectedConversation}
                conversation={currentConversation}
                messages={currentMessages}
                isCommunicationConfirmed
                isRemoteTyping={isRemoteTyping}
                recipientType={recipientInfo.recipientType}
                recipientId={recipientInfo.recipientId}
                onTypingChange={(typing) =>
                  emitTyping(selectedConversation, typing)
                }
                onMessagesChange={handleMessagesChange}
                onSendFile={handleSendFile}
                onLoadMore={handleLoadOlderMessages}
                hasMore={hasMoreOlderMessages}
                isLoadingMore={isLoadingOlder}
                onMarkAsRead={handleMarkCurrentRoomAsRead}
                onOpenMedia={() => {
                  setMobileView("media");
                  onOpenMedia?.();
                }}
                onBack={() => setMobileView("list")}
              />
            )}
          </Box>
        )}

        {mobileView === "media" && (
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              zIndex: 1200,
              width: "100%",
              height: `calc(100dvh - ${MOBILE_BOTTOM_NAV_HEIGHT}px)`,
              minHeight: 0,
              display: "flex",
              overflow: "hidden",
              backgroundColor: theme.palette.common.white,
            }}
          >
            {renderMediaPanel(
              <SharedMediaView
                conversationId={selectedConversation}
                onBack={() => setMobileView("chat")}
              />,
            )}
          </Box>
        )}
      </>
    );
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 120px)",
        minHeight: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {renderContentHeader()}

        {desktopView === "media" ? (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              display: "flex",
              overflow: "hidden",
            }}
          >
            {renderMediaPanel(
              <SharedMediaView
                conversationId={selectedConversation}
                onBack={() => setDesktopView("chat")}
              />,
            )}
          </Box>
        ) : (
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              gap: 2,
              width: "100%",
              overflow: "hidden",
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: 360,
                p: 1.75,
                display: "flex",
                flexDirection: "column",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: theme.palette.grey[200],
                backgroundColor: theme.palette.common.white,
                flexShrink: 0,
                minHeight: 0,
                overflow: "hidden",
              }}
            >
              <ConversationsList
                conversations={filteredConversations}
                selectedConversation={selectedConversation}
                searchTerm={searchTerm}
                selectedDateFilter={selectedDateFilter}
                tabs={visibleTabs}
                activeTab={activeTab}
                onTabChange={handleTabChange}
                onSearchChange={handleSearchChange}
                onDateFilterChange={handleDateFilterChange}
                onSelect={handleSelectConversation}
              />
            </Paper>

            <Paper
              elevation={0}
              sx={{
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                px: 2.5,
                pt: 2,
                pb: 1.75,
                display: "flex",
                flexDirection: "column",
                borderRadius: "20px",
                border: "1px solid",
                borderColor: theme.palette.grey[200],
                backgroundColor: theme.palette.common.white,
                overflow: "hidden",
              }}
            >
              {showEmptyState ? (
                <Box sx={{ flex: 1, minHeight: 0 }} />
              ) : (
                <ChatWindow
                  conversationId={selectedConversation}
                  conversation={currentConversation}
                  messages={currentMessages}
                  isCommunicationConfirmed
                  isRemoteTyping={isRemoteTyping}
                  recipientType={recipientInfo.recipientType}
                  recipientId={recipientInfo.recipientId}
                  onTypingChange={(typing) =>
                    emitTyping(selectedConversation, typing)
                  }
                  onMessagesChange={handleMessagesChange}
                  onSendFile={handleSendFile}
                  onLoadMore={handleLoadOlderMessages}
                  hasMore={hasMoreOlderMessages}
                  isLoadingMore={isLoadingOlder}
                  onMarkAsRead={handleMarkCurrentRoomAsRead}
                  onOpenMedia={() => {
                    setDesktopView("media");
                    onOpenMedia?.();
                  }}
                />
              )}
            </Paper>
          </Box>
        )}
      </Box>
    </Box>
  );
}
