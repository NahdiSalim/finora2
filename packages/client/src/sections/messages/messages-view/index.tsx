import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Badge from "@mui/material/Badge";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import type { Dayjs } from "dayjs";

import { useSelector } from "react-redux";
import ConversationsList from "./views/ConversationsList";
import ChatWindow from "./views/ChatWindow";
import SharedMediaView from "./views/SharedMediaView";
import { useChatSocket } from "./hooks/useChatSocket";
import type { RootState } from "src/lib/store";

import {
  conversations as initialConversations,
  messagesByConversation as initialMessagesByConversation,
} from "./data/mock";

import type { Conversation, Message } from "./data/types";

type MessagesViewProps = {
  onOpenMedia?: () => void;
};

const MOBILE_BOTTOM_NAV_HEIGHT = 72;
const MOBILE_HEADER_HEIGHT = 88;

export default function MessagesView({ onOpenMedia }: MessagesViewProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const currentUserId = useSelector((state: RootState) => state.auth.user?.id);

  const { joinRoom, leaveRoom, sendMessage } = useChatSocket({
    onMessageNew: (msg) => {
      // Ignorer l'écho de nos propres messages (déjà dans l'état local)
      if (currentUserId && msg.senderId === Number(currentUserId)) return;

      setAllMessagesByConversation((prev) => {
        const existing = prev[msg.roomId] ?? [];
        // Déduplication par id réel
        if (existing.some((m) => m.id === msg.id)) return prev;
        const date = msg.createdAt.slice(0, 10);
        const time = new Date(msg.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const newMessage: Message = {
          id: msg.id,
          type: "text",
          text: msg.content,
          mine: false,
          time,
          date,
        };
        return { ...prev, [msg.roomId]: [...existing, newMessage] };
      });

      setAllConversations((prev) =>
        prev.map((c) =>
          c.id !== msg.roomId
            ? c
            : {
                ...c,
                preview: msg.content,
                time: new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                fullDate: msg.createdAt,
                unreadCount:
                  msg.roomId !== selectedConversation
                    ? c.unreadCount + 1
                    : c.unreadCount,
              },
        ),
      );
    },
  });

  const [selectedConversation, setSelectedConversation] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Dayjs | null>(
    null,
  );

  const [desktopView, setDesktopView] = useState<"chat" | "media">("chat");
  const [mobileView, setMobileView] = useState<"list" | "chat" | "media">(
    "list",
  );

  const [allMessagesByConversation, setAllMessagesByConversation] = useState<
    Record<number, Message[]>
  >(initialMessagesByConversation);

  const [allConversations, setAllConversations] =
    useState<Conversation[]>(initialConversations);

  useEffect(() => {
    joinRoom(selectedConversation);
    return () => {
      leaveRoom(selectedConversation);
    };
  }, [selectedConversation, joinRoom, leaveRoom]);

  useEffect(() => {
    setAllMessagesByConversation(initialMessagesByConversation);
    setAllConversations(initialConversations);
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setMobileView("list");
    }
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

  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id);

    if (isMobile) {
      setMobileView("chat");
    } else {
      setDesktopView("chat");
    }

    setAllConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleDateFilterChange = (value: Dayjs | null) => {
    setSelectedDateFilter(value);
  };

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
      (conversation) => conversation.id === selectedConversation,
    );

    if (!selectedStillExists) {
      setSelectedConversation(filteredConversations[0].id);

      if (isMobile) {
        setMobileView("list");
      } else {
        setDesktopView("chat");
      }
    }
  }, [filteredConversations, selectedConversation, isMobile]);

  const hasSelectedConversation = filteredConversations.some(
    (conversation) => conversation.id === selectedConversation,
  );

  const currentMessages = useMemo(() => {
    return allMessagesByConversation[selectedConversation] || [];
  }, [allMessagesByConversation, selectedConversation]);

  const totalUnreadMessages = useMemo(() => {
    return allConversations.reduce(
      (total, conversation) => total + (conversation.unreadCount || 0),
      0,
    );
  }, [allConversations]);

  const showEmptyState =
    filteredConversations.length === 0 || !hasSelectedConversation;

  const handleMessagesChange = (updatedMessages: Message[]) => {
    const lastMessage = updatedMessages[updatedMessages.length - 1];

    setAllMessagesByConversation((prev) => ({
      ...prev,
      [selectedConversation]: updatedMessages,
    }));

    if (!lastMessage) return;

    setAllConversations((prev) => {
      const updatedConversations = prev.map((conversation) => {
        if (conversation.id !== selectedConversation) {
          return conversation;
        }

        let previewText = "";

        if (lastMessage.type === "text") {
          previewText = lastMessage.text || "";
        } else if (lastMessage.type === "file") {
          previewText = `📎 ${lastMessage.file?.name || "Fichier"}`;
        } else if (lastMessage.type === "request") {
          previewText = `🔗 ${lastMessage.request?.title || "Demande"}`;
        }

        const preview = lastMessage.mine ? `Vous: ${previewText}` : previewText;

        return {
          ...conversation,
          preview,
          time: lastMessage.time,
          fullDate: new Date().toISOString(),
        };
      });

      return [...updatedConversations].sort(
        (a, b) =>
          new Date(b.fullDate).getTime() - new Date(a.fullDate).getTime(),
      );
    });
  };

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
                messages={currentMessages}
                isCommunicationConfirmed
                onMessagesChange={handleMessagesChange}
                onSendMessage={(content) =>
                  sendMessage(selectedConversation, content)
                }
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
                  messages={currentMessages}
                  isCommunicationConfirmed
                  onMessagesChange={handleMessagesChange}
                  onSendMessage={(content) =>
                    sendMessage(selectedConversation, content)
                  }
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
