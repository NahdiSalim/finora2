import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import type { Dayjs } from "dayjs";

import ConversationsList from "./views/ConversationsList";
import ChatWindow from "./views/ChatWindow";
import SharedMediaView from "./views/SharedMediaView";
import CommunicationModal from "./components/CommunicationModal";
import {
  conversations as initialConversations,
  messagesByConversation as initialMessagesByConversation,
} from "./data/mock";
import type { Conversation, Message } from "./data/types";

type MessagesViewProps = {
  onOpenMedia?: () => void;
};

export default function MessagesView({ onOpenMedia }: MessagesViewProps) {
  const [selectedConversation, setSelectedConversation] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedDateFilter, setSelectedDateFilter] = useState<Dayjs | null>(
    null,
  );
  const [isCommunicationModalOpen, setIsCommunicationModalOpen] =
    useState<boolean>(false);
  const [
    platformConfirmedConversationIds,
    setPlatformConfirmedConversationIds,
  ] = useState<number[]>([]);
  const [currentView, setCurrentView] = useState<"chat" | "media">("chat");
  const [allMessagesByConversation, setAllMessagesByConversation] = useState<
    Record<number, Message[]>
  >(initialMessagesByConversation);
  const [allConversations, setAllConversations] =
    useState<Conversation[]>(initialConversations);

  useEffect(() => {
    setAllMessagesByConversation(initialMessagesByConversation);
    setAllConversations(initialConversations);
  }, []);

  const markConversationAsRead = (id: number) => {
    setAllConversations((prev) =>
      prev.map((conversation) =>
        conversation.id === id
          ? { ...conversation, unreadCount: 0 }
          : conversation,
      ),
    );
  };

  const handleSelectConversation = (id: number) => {
    setSelectedConversation(id);
    setCurrentView("chat");

    const alreadyConfirmed = platformConfirmedConversationIds.includes(id);

    if (!alreadyConfirmed) {
      setIsCommunicationModalOpen(true);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleDateFilterChange = (value: Dayjs | null) => {
    setSelectedDateFilter(value);
  };

  const handleCloseCommunicationModal = () => {
    const alreadyConfirmed =
      platformConfirmedConversationIds.includes(selectedConversation);

    setIsCommunicationModalOpen(false);

    if (!alreadyConfirmed) {
      setTimeout(() => {
        setIsCommunicationModalOpen(true);
      }, 500);
    }
  };

  const handleChooseWhatsApp = () => {
    const selectedContact = allConversations.find(
      (conversation) => conversation.id === selectedConversation,
    );

    if (!selectedContact) {
      setIsCommunicationModalOpen(false);
      return;
    }

    const message = encodeURIComponent(
      `Bonjour ${selectedContact.name}, je vous contacte via FINORA.`,
    );

    window.open(
      `https://wa.me/${selectedContact.phone}?text=${message}`,
      "_blank",
    );

    setPlatformConfirmedConversationIds((prev) => {
      if (prev.includes(selectedConversation)) {
        return prev;
      }

      return [...prev, selectedConversation];
    });

    markConversationAsRead(selectedConversation);
    setIsCommunicationModalOpen(false);
  };

  const handleChoosePlatform = () => {
    setPlatformConfirmedConversationIds((prev) => {
      if (prev.includes(selectedConversation)) {
        return prev;
      }

      return [...prev, selectedConversation];
    });

    markConversationAsRead(selectedConversation);
    setIsCommunicationModalOpen(false);
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
    if (filteredConversations.length === 0) {
      return;
    }

    const selectedStillExists = filteredConversations.some(
      (conversation) => conversation.id === selectedConversation,
    );

    if (!selectedStillExists) {
      setSelectedConversation(filteredConversations[0].id);
      setCurrentView("chat");
    }
  }, [filteredConversations, selectedConversation]);

  const hasSelectedConversation = filteredConversations.some(
    (conversation) => conversation.id === selectedConversation,
  );

  const selectedConversationData = allConversations.find(
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

  const isSelectedConversationConfirmed =
    platformConfirmedConversationIds.includes(selectedConversation);

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
        } else {
          previewText = `📎 ${lastMessage.file?.name || "Fichier"}`;
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
        mb: 2,
        px: 0.25,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: 30,
            fontWeight: 600,
            lineHeight: 1.15,
            color: "#101828",
            letterSpacing: "-0.02em",
          }}
        >
          Messagerie
        </Box>

        {totalUnreadMessages > 0 && (
          <Box
            sx={{
              minWidth: 22,
              height: 22,
              px: 0.75,
              borderRadius: "999px",
              backgroundColor: "#F59E0B",
              color: "#FFFFFF",
              fontSize: 11,
              fontWeight: 700,
              lineHeight: "22px",
              textAlign: "center",
            }}
          >
            {totalUnreadMessages}
          </Box>
        )}
      </Box>

      <Box
        sx={{
          fontSize: 14,
          color: "#98A2B3",
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
        px: 2.5,
        pt: 2.25,
        pb: 1.75,
        display: "flex",
        flexDirection: "column",
        borderRadius: "20px",
        border: "1px solid #EEF2F6",
        backgroundColor: "#FFFFFF",
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      {content}
    </Paper>
  );

  const renderLockedDiscussionState = () => (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        px: 3,
        py: 6,
      }}
    >
      <Box
        sx={{
          maxWidth: 420,
          textAlign: "center",
        }}
      >
        <Typography
          sx={{
            fontSize: 18,
            fontWeight: 600,
            color: "#101828",
            mb: 1,
          }}
        >
          Accès à la discussion verrouillé
        </Typography>

        <Typography
          sx={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "#98A2B3",
          }}
        >
          Choisissez d’abord un mode de communication pour accéder à cette
          discussion et commencer les échanges.
        </Typography>
      </Box>
    </Box>
  );

  return (
    <>
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

          {currentView === "media" ? (
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
                  onBack={() => setCurrentView("chat")}
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
                  width: { xs: 320, xl: 360 },
                  p: 1.75,
                  display: "flex",
                  flexDirection: "column",
                  borderRadius: "20px",
                  border: "1px solid #EEF2F6",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "none",
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
                  border: "1px solid #EEF2F6",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "none",
                  overflow: "hidden",
                }}
              >
                {showEmptyState ? (
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: 0,
                    }}
                  />
                ) : isSelectedConversationConfirmed ? (
                  <ChatWindow
                    conversationId={selectedConversation}
                    messages={currentMessages}
                    isCommunicationConfirmed
                    onMessagesChange={handleMessagesChange}
                    onOpenMedia={() => {
                      setCurrentView("media");
                      onOpenMedia?.();
                    }}
                  />
                ) : (
                  renderLockedDiscussionState()
                )}
              </Paper>
            </Box>
          )}
        </Box>
      </Box>

      <CommunicationModal
        open={isCommunicationModalOpen}
        contactName={selectedConversationData?.name || "ce contact"}
        onClose={handleCloseCommunicationModal}
        onChooseWhatsApp={handleChooseWhatsApp}
        onChoosePlatform={handleChoosePlatform}
      />
    </>
  );
}
