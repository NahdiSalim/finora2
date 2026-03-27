import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

import { messageRequests } from "../data/mock";
import type {
  Conversation,
  Message,
  MessageRequest,
  MessageTask,
  MessageAppointment,
} from "../data/types";
import ChatHeader from "../components/ChatHeader";
import MessageInput from "../components/MessageInput";
import MessageBubble from "../components/MessageBubble";
import MessagesDateDivider from "../components/MessagesDateDivider";

type ChatWindowProps = {
  conversationId: number;
  conversation?: Conversation;
  messages: Message[];
  isCommunicationConfirmed: boolean;
  onMessagesChange: (messages: Message[]) => void;
  onSendMessage?: (content: string) => void;
  onSendFile?: (
    text: string,
    file?: File,
    request?: MessageRequest,
    task?: MessageTask,
    appointment?: MessageAppointment,
  ) => void;
  onOpenMedia?: () => void;
  onBack?: () => void;
  recipientType?: "client" | "collaborator" | null;
  recipientId?: number | null;
  isRemoteTyping?: boolean;
  onTypingChange?: (typing: boolean) => void;
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
  conversation,
  messages,
  isCommunicationConfirmed,
  onMessagesChange,
  onSendMessage,
  onSendFile,
  onOpenMedia,
  onBack,
  recipientType,
  recipientId,
  isRemoteTyping = false,
  onTypingChange,
}: ChatWindowProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const currentConversation = conversation;

  const [inputValue, setInputValue] = useState("");
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setInputValue("");
  }, [conversationId]);

  useEffect(() => {
    messagesBottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [messages, conversationId]);

  // Emit typing start/stop when user types
  const handleInputChange = (val: string) => {
    setInputValue(val);
    if (!onTypingChange) return;
    onTypingChange(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => onTypingChange(false), 2000);
  };

  useEffect(
    () => () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    },
    [],
  );

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

  const handleSendMessage = (
    messageHtml: string,
    file?: File,
    request?: MessageRequest,
    task?: MessageTask,
    appointment?: MessageAppointment,
  ) => {
    if (!isCommunicationConfirmed) return;

    const now = new Date();
    const formattedTime = now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const formattedDate = now.toISOString().split("T")[0];
    const plainText = htmlToText(messageHtml);

    if (request) {
      const newMessage: Message = {
        id: Date.now(),
        type: "request",
        mine: true,
        time: formattedTime,
        date: formattedDate,
        text: plainText,
        html: messageHtml,
        request: {
          id: request.id,
          title: request.title,
          subtitle: request.subtitle,
          dateLabel: request.dateLabel,
          status: request.status,
          urgency: request.urgency,
        },
      };

      onMessagesChange([...messages, newMessage]);
      onSendFile?.(messageHtml, undefined, request, undefined, undefined);
      setInputValue("");
      return;
    }

    if (task) {
      const newMessage: Message = {
        id: Date.now(),
        type: "task",
        mine: true,
        time: formattedTime,
        date: formattedDate,
        text: plainText,
        html: messageHtml,
        task,
      };

      onMessagesChange([...messages, newMessage]);
      onSendFile?.(messageHtml, undefined, undefined, task, undefined);
      setInputValue("");
      return;
    }

    if (appointment) {
      const newMessage: Message = {
        id: Date.now(),
        type: "appointment",
        mine: true,
        time: formattedTime,
        date: formattedDate,
        text: plainText,
        html: messageHtml,
        appointment,
      };

      onMessagesChange([...messages, newMessage]);
      onSendFile?.(messageHtml, undefined, undefined, undefined, appointment);
      setInputValue("");
      return;
    }

    if (file) {
      console.log("[ChatWindow] file selected; sending callback:", {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
        conversationId,
      });
      onSendFile?.(messageHtml, file);

      const newMessage: Message = {
        id: Date.now(),
        type: "file",
        mine: true,
        time: formattedTime,
        date: formattedDate,
        text: plainText,
        html: messageHtml,
        file: {
          name: file.name,
          size: formatFileSize(file.size),
          type: file.type,
          url: URL.createObjectURL(file),
        },
      };

      onMessagesChange([...messages, newMessage]);
      setInputValue("");
      return;
    }

    if (!plainText && !hasFlagNode(messageHtml)) {
      return;
    }

    const newMessage: Message = {
      id: Date.now(),
      type: "text",
      text: plainText,
      html: messageHtml,
      mine: true,
      time: formattedTime,
      date: formattedDate,
    };

    onSendMessage?.(plainText);
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
        borderRadius: isMobile ? "14px" : "18px",
        border: isMobile ? "none" : "1px solid #F2F4F7",
        backgroundColor: "#FFFFFF",
      }}
    >
      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 1, md: 2 },
          pt: { xs: 2.5, md: 1.75 },
          pb: { xs: 1, md: 1.25 },
          borderBottom: "1px solid #F2F4F7",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ChatHeader
          conversation={currentConversation}
          onOpenMedia={onOpenMedia}
          onBack={onBack}
        />
      </Box>

      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          px: { xs: 0.75, md: 2.25 },
          pt: { xs: 1, md: 1.5 },
          pb: { xs: 0.5, md: 1.25 },
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

        {isRemoteTyping && (
          <Typography
            sx={{
              mt: 1.25,
              mb: 0.25,
              fontStyle: "italic",
              color: "#B0B7C3",
              fontSize: isMobile ? 12 : 13,
              pl: 0.5,
              fontWeight: 500,
            }}
          >
            {`••• ${currentConversation?.name} est en train d'écrire ...`}
          </Typography>
        )}

        <div ref={messagesBottomRef} />
      </Box>

      <Box
        sx={{
          flexShrink: 0,
          px: { xs: 1, md: 2 },
          pt: { xs: 0.75, md: 1 },
          pb: {
            xs: "calc(env(safe-area-inset-bottom, 0px) + 8px)",
            md: 0.75,
          },
          borderTop: "1px solid #F2F4F7",
          backgroundColor: isCommunicationConfirmed ? "#FFFFFF" : "#FCFCFD",
          position: { xs: "sticky", md: "relative" },
          bottom: 0,
          zIndex: 5,
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
          onChange={handleInputChange}
          onSend={handleSendMessage}
          requests={messageRequests}
          disabled={!isCommunicationConfirmed}
          recipientType={recipientType}
          recipientId={recipientId}
        />
      </Box>
    </Box>
  );
}
