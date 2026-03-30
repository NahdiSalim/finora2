import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Paper,
  Stack,
  useTheme,
  alpha,
  Badge,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Image as ImageIcon,
  Check as CheckIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  timestamp: string;
  status: "sent" | "delivered" | "read";
  attachments?: Array<{
    type: "image" | "file";
    url: string;
    name: string;
  }>;
  isCurrentUser: boolean;
}

export interface ChatProps {
  /** Liste des messages */
  messages: Message[];
  /** ID de l'utilisateur courant */
  currentUserId: string;
  /** Nom de l'utilisateur courant */
  currentUserName: string;
  /** Avatar de l'utilisateur courant */
  currentUserAvatar?: string;
  /** Nom du destinataire */
  recipientName: string;
  /** Avatar du destinataire */
  recipientAvatar?: string;
  /** Statut du destinataire (en ligne/hors ligne) */
  recipientStatus?: "online" | "offline" | "away";
  /** Callback pour envoyer un message */
  onSendMessage: (content: string, attachments?: File[]) => void;
  /** Callback pour charger plus de messages (pagination) */
  onLoadMore?: () => void;
  /** Indique si le chargement est en cours */
  loading?: boolean;
  /** Indique s'il y a plus de messages à charger */
  hasMore?: boolean;
  /** Hauteur fixe du chat */
  height?: number | string;
  /** Placeholder du champ de saisie */
  placeholder?: string;
  /** Désactiver le champ de saisie */
  disabled?: boolean;
}

// Composant pour chaque message
const MessageBubble = ({ message }: { message: Message }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: message.isCurrentUser ? "flex-end" : "flex-start",
        mb: 2,
      }}
    >
      <Stack
        direction={message.isCurrentUser ? "row-reverse" : "row"}
        spacing={1}
        alignItems="flex-end"
        sx={{ maxWidth: "70%" }}
      >
        {/* Avatar */}
        <Avatar
          src={message.isCurrentUser ? undefined : message.senderAvatar}
          sx={{
            width: 32,
            height: 32,
            bgcolor: message.isCurrentUser
              ? theme.palette.primary.main
              : theme.palette.grey[400],
          }}
        >
          {!message.isCurrentUser && message.senderName.charAt(0)}
        </Avatar>

        {/* Contenu du message */}
        <Box>
          {/* Nom de l'expéditeur (pour les messages des autres) */}
          {!message.isCurrentUser && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ ml: 1, mb: 0.5 }}
            >
              {message.senderName}
            </Typography>
          )}

          {/* Bulle de message */}
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              bgcolor: message.isCurrentUser
                ? theme.palette.primary.main
                : alpha(theme.palette.grey[500], 0.1),
              color: message.isCurrentUser ? "white" : "text.primary",
              borderRadius: 2,
              borderBottomRightRadius: message.isCurrentUser ? 0 : 2,
              borderBottomLeftRadius: message.isCurrentUser ? 2 : 0,
            }}
          >
            {/* Pièces jointes */}
            {message.attachments && message.attachments.length > 0 && (
              <Box sx={{ mb: 1 }}>
                {message.attachments.map((attachment, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      bgcolor: alpha("#000", 0.1),
                      borderRadius: 1,
                      cursor: "pointer",
                      "&:hover": { bgcolor: alpha("#000", 0.2) },
                    }}
                  >
                    {attachment.type === "image" ? (
                      <ImageIcon />
                    ) : (
                      <AttachFileIcon />
                    )}
                    <Typography variant="caption">{attachment.name}</Typography>
                  </Box>
                ))}
              </Box>
            )}

            {/* Texte du message */}
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}
            >
              {message.content}
            </Typography>

            {/* Timestamp et statut */}
            <Stack
              direction="row"
              spacing={0.5}
              justifyContent="flex-end"
              alignItems="center"
              sx={{ mt: 0.5 }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: message.isCurrentUser
                    ? alpha("#fff", 0.7)
                    : "text.disabled",
                }}
              >
                {message.timestamp}
              </Typography>
              {message.isCurrentUser && (
                <Tooltip title={`Message ${message.status}`}>
                  {message.status === "read" ? (
                    <CheckCircleIcon
                      sx={{ fontSize: 14, color: alpha("#fff", 0.7) }}
                    />
                  ) : (
                    <CheckIcon
                      sx={{ fontSize: 14, color: alpha("#fff", 0.7) }}
                    />
                  )}
                </Tooltip>
              )}
            </Stack>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export function Chat({
  messages,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  recipientName,
  recipientAvatar,
  recipientStatus = "offline",
  onSendMessage,
  onLoadMore,
  loading = false,
  hasMore = false,
  height = 500,
  placeholder = "Écrivez votre message...",
  disabled = false,
}: ChatProps) {
  const theme = useTheme();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Scroll automatique vers le bas aux nouveaux messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Gestion de l'envoi de message
  const handleSendMessage = () => {
    if (newMessage.trim() && !disabled) {
      onSendMessage(newMessage);
      setNewMessage("");
    }
  };

  // Gestion de la touche Entrée
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scroll pour charger plus de messages
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && hasMore && !loading && onLoadMore) {
      onLoadMore();
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        height,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderRadius: 2,
      }}
    >
      {/* Header du chat */}
      <Box
        sx={{
          p: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: alpha(theme.palette.primary.main, 0.02),
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Badge
            color={
              recipientStatus === "online"
                ? "success"
                : recipientStatus === "away"
                  ? "warning"
                  : "default"
            }
            variant="dot"
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          >
            <Avatar src={recipientAvatar}>{recipientName.charAt(0)}</Avatar>
          </Badge>
          <Box>
            <Typography variant="subtitle2" fontWeight={600}>
              {recipientName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {recipientStatus === "online"
                ? "En ligne"
                : recipientStatus === "away"
                  ? "Absent"
                  : "Hors ligne"}
            </Typography>
          </Box>
        </Stack>
      </Box>

      {/* Zone des messages */}
      <Box
        ref={chatContainerRef}
        onScroll={handleScroll}
        sx={{
          flex: 1,
          overflowY: "auto",
          p: 2,
          bgcolor: alpha(theme.palette.background.default, 0.5),
        }}
      >
        {/* Indicateur de chargement */}
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        {/* Messages groupés par date */}
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {/* Élément pour le scroll automatique */}
        <div ref={messagesEndRef} />
      </Box>

      {/* Zone de saisie */}
      <Box
        sx={{
          p: 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-end">
          {/* Bouton d'attachement */}
          <Tooltip title="Joindre un fichier">
            <IconButton size="small" disabled={disabled}>
              <AttachFileIcon />
            </IconButton>
          </Tooltip>

          {/* Champ de texte */}
          <TextField
            fullWidth
            multiline
            maxRows={4}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
              },
            }}
          />

          {/* Bouton d'envoi */}
          <Tooltip title="Envoyer">
            <IconButton
              color="primary"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || disabled}
            >
              <SendIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>
    </Paper>
  );
}
