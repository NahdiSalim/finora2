import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Badge from "@mui/material/Badge";
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

import { useConversations, useRoomMessages } from "./hooks/useChatData";
import { useSendMessageMutation, chatApi } from "src/lib/services/chatApi";
import { disconnectSocket, isSocketConnected } from "src/lib/socket";

import type { RootState } from "src/lib/store";
import type { Conversation, Message } from "./data/types";

type MessagesViewProps = {
  onOpenMedia?: () => void;
};

const MOBILE_BOTTOM_NAV_HEIGHT = 72;
const MOBILE_HEADER_HEIGHT = 88;

export default function MessagesView({ onOpenMedia }: MessagesViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const dispatch = useAppDispatch();

  const rawUserId = useSelector((state: RootState) => state.auth.user?.id);
  const currentUid = rawUserId ? Number(rawUserId) : 0;

  // ── API data ──────────────────────────────────────────────────────────────
  const { conversations: apiConversations, isLoading: roomsLoading } =
    useConversations();
  const [triggerSendMessage] = useSendMessageMutation();

  // ── Local state ───────────────────────────────────────────────────────────
  const [selectedConversation, setSelectedConversation] = useState<number>(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Dayjs | null>(
    null,
  );
  const [desktopView, setDesktopView] = useState<"chat" | "media">("chat");
  const [mobileView, setMobileView] = useState<"list" | "chat" | "media">(
    "list",
  );

  // Ref to always have current selectedConversation in socket callbacks
  const selectedConversationRef = useRef(selectedConversation);
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);

  // Typing indicator state: set of roomIds where the other user is typing
  const [typingRooms, setTypingRooms] = useState<Set<number>>(new Set());

  // Buffer realtime messages that arrive before the active conversation is ready.
  // This prevents "works for sender, not for recipient until refresh" cases caused by timing.
  const pendingRealtimeByRoomRef = useRef<Map<number, SocketMessage[]>>(
    new Map(),
  );

  // ── Socket ────────────────────────────────────────────────────────────────
  const { joinRoom, leaveRoom, emitTyping } = useChatSocket({
    onMessageNew: (msg: SocketMessage) => {
      const d = new Date(msg.createdAt);
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
            msg.roomId,
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
        chatApi.util.updateQueryData("getUserRooms", undefined, (draft) => {
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
        }),
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
            msg.roomId,
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
        chatApi.util.updateQueryData("getRoomMessages", roomId, (draft) => {
          const idx = draft.messages.findIndex((m) => m.id === messageId);
          if (idx !== -1) draft.messages.splice(idx, 1);
        }),
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
        chatApi.util.updateQueryData("getRoomMessages", roomId, (draft) => {
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
        }),
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

  // Auto-select first conversation when rooms load
  useEffect(() => {
    if (allConversations.length > 0 && selectedConversation === 0) {
      setSelectedConversation(allConversations[0].id);
    }
  }, [allConversations, selectedConversation]);

  // ── Messages for selected room ────────────────────────────────────────────
  const { messages: apiMessages } = useRoomMessages(selectedConversation);

  // Optimistic local messages for messages sent by the current user
  const [localMessages, setLocalMessages] = useState<Record<number, Message[]>>(
    {},
  );

  const currentMessages: Message[] = useMemo(() => {
    const base = apiMessages;
    const extra = localMessages[selectedConversation] ?? [];
    const ids = new Set(base.map((m) => m.id));
    return [...base, ...extra.filter((m) => !ids.has(m.id))];
  }, [apiMessages, localMessages, selectedConversation]);

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

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id);

    if (isMobile) setMobileView("chat");
    else setDesktopView("chat");

    setConversationOverrides((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? {}), unreadCount: 0 },
    }));
  };

  const handleSearchChange = (value: string) => setSearchTerm(value);
  const handleDateFilterChange = (value: Dayjs | null) =>
    setSelectedDateFilter(value);

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
    if (lastMessage.type === "text") previewText = lastMessage.text ?? "";
    else if (lastMessage.type === "file")
      previewText = `📎 ${lastMessage.file?.name ?? "Fichier"}`;
    else if (lastMessage.type === "request")
      previewText = `🔗 ${lastMessage.request?.title ?? "Demande"}`;

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

  const handleSendFile = async (file: File) => {
    const roomId = selectedConversationRef.current;
    if (!roomId) return;

    const messageType = file.type?.startsWith("image/") ? "image" : "file";
    console.log("[MessagesView] sending file via REST:", {
      roomId,
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      messageType,
    });

    try {
      const saved = await triggerSendMessage({
        roomId,
        content: file.name,
        type: messageType,
        attachments: [file],
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
  };

  // ── Derived state ─────────────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return allConversations.filter((conversation) => {
      const matchesSearch =
        !normalizedSearch ||
        conversation.name.toLowerCase().includes(normalizedSearch) ||
        conversation.preview.toLowerCase().includes(normalizedSearch) ||
        conversation.role.toLowerCase().includes(normalizedSearch);

      const matchesDate = !selectedDateFilter
        ? true
        : conversation.fullDate.slice(0, 10) ===
          selectedDateFilter.format("YYYY-MM-DD");

      return matchesSearch && matchesDate;
    });
  }, [allConversations, searchTerm, selectedDateFilter]);

  useEffect(() => {
    if (filteredConversations.length === 0) return;

    const selectedStillExists = filteredConversations.some(
      (c) => c.id === selectedConversation,
    );

    if (!selectedStillExists) {
      setSelectedConversation(filteredConversations[0].id);
      if (isMobile) setMobileView("list");
      else setDesktopView("chat");
    }
  }, [filteredConversations, selectedConversation, isMobile]);

  const hasSelectedConversation = filteredConversations.some(
    (c) => c.id === selectedConversation,
  );

  const totalUnreadMessages = useMemo(
    () =>
      allConversations.reduce((total, c) => total + (c.unreadCount || 0), 0),
    [allConversations],
  );

  const showEmptyState =
    filteredConversations.length === 0 || !hasSelectedConversation;

  const currentConversation = useMemo(
    () => allConversations.find((c) => c.id === selectedConversation),
    [allConversations, selectedConversation],
  );

  const allMessagesByConversation = useMemo(
    () => ({ [selectedConversation]: currentMessages }),
    [selectedConversation, currentMessages],
  );

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

        {totalUnreadMessages > 0 && (
          <Badge
            badgeContent={totalUnreadMessages}
            sx={{
              display: "flex",
              flexShrink: 0,
              "& .MuiBadge-badge": {
                position: "static",
                transform: "none",
                backgroundColor: "#F79009",
                color: "#FFFFFF",
                minWidth: 20,
                height: 20,
                px: 0.75,
                borderRadius: "999px",
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
              },
            }}
          />
        )}
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
              height: "100dvh",
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              backgroundColor: theme.palette.common.white,
              pb: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
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
                onTypingChange={(typing) =>
                  emitTyping(selectedConversation, typing)
                }
                onMessagesChange={handleMessagesChange}
                onSendFile={handleSendFile}
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
              height: "100dvh",
              minHeight: 0,
              display: "flex",
              overflow: "hidden",
              backgroundColor: theme.palette.common.white,
              pb: "calc(env(safe-area-inset-bottom, 0px) + 4px)",
            }}
          >
            {renderMediaPanel(
              <SharedMediaView
                conversationId={selectedConversation}
                allMessagesByConversation={allMessagesByConversation}
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
                allMessagesByConversation={allMessagesByConversation}
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
                  onTypingChange={(typing) =>
                    emitTyping(selectedConversation, typing)
                  }
                  onMessagesChange={handleMessagesChange}
                  onSendFile={handleSendFile}
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
