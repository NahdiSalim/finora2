import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

import { conversations } from "../data/mock";
import type { Message } from "../data/types";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import MessageBubble from "../components/MessageBubble";
import MessagesDateDivider from "../components/MessagesDateDivider";

type ChatWindowProps = {
  conversationId: number;
  messages: Message[];
  isCommunicationConfirmed: boolean;
  onMessagesChange: (messages: Message[]) => void;
  onOpenMedia?: () => void;
};

function htmlToText(html: string) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\u00a0/g, " ").trim();
}

function hasFlagNode(html: string) {
  return html.includes('data-flag-code="');
}

export default function ChatWindow({
  conversationId,
  messages,
  isCommunicationConfirmed,
  onMessagesChange,
  onOpenMedia,
}: ChatWindowProps) {
  const currentConversation = useMemo(
    () => conversations.find((c) => c.id === conversationId),
    [conversationId],
  );

  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputValue("");
  }, [conversationId]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [conversationId]);

  useEffect(() => {
    let startTypingTimer: ReturnType<typeof setTimeout> | undefined;
    let stopTypingTimer: ReturnType<typeof setTimeout> | undefined;

    if (isCommunicationConfirmed && messages.length > 0) {
      startTypingTimer = setTimeout(() => {
        setIsTyping(true);

        stopTypingTimer = setTimeout(() => {
          setIsTyping(false);
        }, 1800);
      }, 1200);
    } else {
      setIsTyping(false);
    }

    return () => {
      if (startTypingTimer) clearTimeout(startTypingTimer);
      if (stopTypingTimer) clearTimeout(stopTypingTimer);
    };
  }, [messages, isCommunicationConfirmed]);

  const formatDateLabel = (date: string) => {
    const today = new Date().toISOString().split("T")[0];

    if (date === today) {
      return "Aujourd'hui";
    }

    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const shouldShowDateDivider = (
    currentMessage: Message,
    previousMessage?: Message,
  ) => {
    if (!previousMessage) return true;
    return currentMessage.date !== previousMessage.date;
  };

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSendMessage = (file?: File) => {
    if (!isCommunicationConfirmed) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDate = now.toISOString().split("T")[0];

    if (file) {
      const newMessage: Message = {
        id: Date.now(),
        type: "file",
        mine: true,
        time: formattedTime,
        date: formattedDate,
        file: {
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          url: URL.createObjectURL(file),
        },
      };

      onMessagesChange([...messages, newMessage]);
      return;
    }

    const plainText = htmlToText(inputValue);

    if (!plainText && !hasFlagNode(inputValue)) {
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      type: "text",
      text: plainText,
      html: inputValue,
      mine: true,
      time: formattedTime,
      date: formattedDate,
    };

    onMessagesChange([...messages, newMessage]);
    setInputValue("");
  };

  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: "18px",
        border: "1px solid #F2F4F7",
        backgroundColor: "#FFFFFF",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, md: 2 },
          pt: { xs: 1.5, md: 1.75 },
          pb: 1.25,
          borderBottom: "1px solid #F2F4F7",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ChatHeader
          conversation={currentConversation}
          onOpenMedia={onOpenMedia}
        />
      </Box>

      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: { xs: 1.5, md: 2.25 },
          pt: 1.5,
          pb: 1.25,
          backgroundColor: "#FFFFFF",
          "&::-webkit-scrollbar": {
            width: 6,
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "#E4E7EC",
            borderRadius: "999px",
          },
        }}
      >
        {messages.length === 0 ? (
          <Box
            sx={{
              height: "100%",
              minHeight: 260,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: "#98A2B3",
                textAlign: "center",
              }}
            >
              Aucun message pour le moment.
            </Typography>
          </Box>
        ) : (
          messages.map((message, index) => {
            const previousMessage = messages[index - 1];
            const showDivider = shouldShowDateDivider(message, previousMessage);

            return (
              <Box key={message.id}>
                {showDivider && (
                  <MessagesDateDivider label={formatDateLabel(message.date)} />
                )}

                <MessageBubble
                  message={message}
                  conversation={currentConversation}
                />
              </Box>
            );
          })
        )}

        {isTyping && (
          <Typography
            sx={{
              mt: 1.25,
              mb: 0.25,
              fontStyle: "italic",
              color: "#B0B7C3",
              fontSize: 13,
              pl: 0.5,
              fontWeight: 500,
            }}
          >
            {`••• ${currentConversation?.name} est en train d'écrire ...`}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 1.5, md: 2 },
          pt: 1,
          pb: 0.75,
          borderTop: "1px solid #F2F4F7",
          backgroundColor: isCommunicationConfirmed ? "#FFFFFF" : "#FCFCFD",
        }}
      >
        {!isCommunicationConfirmed && (
          <Typography
            sx={{
              mb: 1,
              fontSize: 13,
              color: "#98A2B3",
              fontWeight: 500,
            }}
          >
            Choisissez d’abord un mode de communication pour pouvoir écrire.
          </Typography>
        )}

        <MessageInput
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          disabled={!isCommunicationConfirmed}
        />
      </Box>
    </Box>
  );
}
