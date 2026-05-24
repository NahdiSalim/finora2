// rewriting

import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Fab,
  Paper,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Chip,
  Collapse,
  Fade,
  CircularProgress,
  Tooltip,
  alpha,
  useTheme,
  useMediaQuery,
  Skeleton,
} from "@mui/material";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Trash2,
  Minimize2,
  Maximize2,
  Plus,
  History,
  Pencil,
  Check,
  ArrowLeft,
  MessageSquare,
  FileText,
  BarChart3,
  Calculator,
  AlertTriangle,
  Building2,
  Package,
  TrendingUp,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { ChatMessage } from "src/lib/services/chatbotApi";
import {
  useSendMessageMutation,
  useGetSessionsQuery,
  useGetSessionQuery,
  useRenameSessionMutation,
  useDeleteSessionMutation,
} from "src/lib/services/chatbotApi";
import { useAppSelector } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUGGESTED_PROMPTS = [
  "Afficher mes factures impayées",
  "Analyser mon chiffre d'affaires",
  "Créer une nouvelle facture",
  "Vérifier les anomalies comptables",
];

const TOOL_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  get_invoices: { label: "Factures", icon: <FileText size={12} /> },
  get_invoice_by_id: { label: "Détail facture", icon: <FileText size={12} /> },
  create_invoice: { label: "Création facture", icon: <Plus size={12} /> },
  get_invoice_analytics: {
    label: "Analytiques",
    icon: <BarChart3 size={12} />,
  },
  get_devis: { label: "Devis", icon: <FileText size={12} /> },
  create_devis: { label: "Création devis", icon: <Plus size={12} /> },
  get_suppliers: { label: "Fournisseurs", icon: <Building2 size={12} /> },
  get_bons_commande: { label: "Bons de commande", icon: <Package size={12} /> },
  calculate_tva: { label: "Calcul TVA", icon: <Calculator size={12} /> },
  detect_anomalies: { label: "Anomalies", icon: <AlertTriangle size={12} /> },
};

function formatRelativeDate(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / 86400000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── Shared gradient header ───────────────────────────────────────────────────

function GradientHeader({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.2)}`,
      }}
    >
      {children}
    </Box>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const theme = useTheme();
  const isUser = msg.role === "user";
  const ts =
    msg.timestamp ??
    (msg.createdAt ? new Date(msg.createdAt).getTime() : Date.now());

  return (
    <Fade in timeout={300}>
      <Box
        sx={{
          display: "flex",
          flexDirection: isUser ? "row-reverse" : "row",
          alignItems: "flex-start",
          gap: 1,
          mb: 1.5,
        }}
      >
        <Avatar
          sx={{
            width: 32,
            height: 32,
            flexShrink: 0,
            bgcolor: isUser
              ? theme.palette.primary.main
              : alpha(theme.palette.secondary.main, 0.12),
            color: isUser ? "#fff" : theme.palette.secondary.main,
            border: isUser
              ? "none"
              : `2px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
          }}
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </Avatar>

        <Box sx={{ maxWidth: "75%", minWidth: 60 }}>
          <Box
            sx={{
              px: 2,
              py: 1.5,
              borderRadius: isUser
                ? "16px 16px 2px 16px"
                : "16px 16px 16px 2px",
              bgcolor: isUser
                ? theme.palette.primary.main
                : theme.palette.background.paper,
              color: isUser ? "#fff" : "text.primary",
              boxShadow: isUser
                ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`
                : `0 1px 4px ${alpha(theme.palette.common.black, 0.06)}`,
              border: isUser
                ? "none"
                : `1px solid ${alpha(theme.palette.divider, 0.4)}`,
              "& p": { margin: 0, lineHeight: 1.6, fontSize: "0.875rem" },
              "& ul, & ol": { pl: 2.5, my: 0.75 },
              "& li": { fontSize: "0.875rem", lineHeight: 1.6, mb: 0.5 },
              "& strong": { fontWeight: 600 },
              "& h1, & h2, & h3, & h4": {
                fontSize: "0.95rem",
                fontWeight: 600,
                mt: 1,
                mb: 0.5,
              },
              "& table": {
                borderCollapse: "collapse",
                width: "100%",
                fontSize: "0.8rem",
                mt: 1,
              },
              "& th, & td": {
                border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                px: 1.25,
                py: 0.75,
                textAlign: "left",
              },
              "& th": {
                bgcolor: alpha(theme.palette.primary.main, 0.06),
                fontWeight: 600,
              },
              "& code": {
                bgcolor: alpha(
                  theme.palette.common.black,
                  isUser ? 0.15 : 0.05,
                ),
                px: 0.75,
                py: 0.25,
                borderRadius: 1,
                fontSize: "0.8rem",
                fontFamily: "monospace",
              },
            }}
          >
            {isUser ? (
              <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
                {msg.content}
              </Typography>
            ) : (
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            )}
          </Box>

          {!isUser && msg.toolsUsed && msg.toolsUsed.length > 0 && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 0.5,
                mt: 0.75,
                pl: 0.5,
              }}
            >
              {msg.toolsUsed.map((tool) => {
                const toolInfo = TOOL_LABELS[tool] ?? {
                  label: tool,
                  icon: null,
                };
                return (
                  <Chip
                    key={tool}
                    icon={toolInfo.icon as any}
                    label={toolInfo.label}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.7rem",
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      "& .MuiChip-label": { px: 1 },
                      "& .MuiChip-icon": {
                        color: theme.palette.primary.main,
                        ml: 0.75,
                      },
                    }}
                  />
                );
              })}
            </Box>
          )}

          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              color: "text.disabled",
              fontSize: "0.7rem",
              textAlign: isUser ? "right" : "left",
              px: 0.5,
            }}
          >
            {new Date(ts).toLocaleTimeString("fr-FR", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}

function TypingIndicator() {
  const theme = useTheme();
  return (
    <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 1.5 }}>
      <Avatar
        sx={{
          width: 32,
          height: 32,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          color: theme.palette.secondary.main,
          border: `2px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
        }}
      >
        <Bot size={16} />
      </Avatar>
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderRadius: "16px 16px 16px 2px",
          bgcolor: theme.palette.background.paper,
          border: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
          boxShadow: `0 1px 4px ${alpha(theme.palette.common.black, 0.06)}`,
          display: "flex",
          alignItems: "center",
          gap: 0.6,
        }}
      >
        {[0, 1, 2].map((i) => (
          <Box
            key={i}
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: theme.palette.primary.main,
              animation: "bounce 1.4s infinite",
              animationDelay: `${i * 0.2}s`,
              "@keyframes bounce": {
                "0%, 80%, 100%": {
                  transform: "translateY(0) scale(0.8)",
                  opacity: 0.5,
                },
                "40%": { transform: "translateY(-4px) scale(1)", opacity: 1 },
              },
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ─── History View (full-panel, replaces chat when open) ──────────────────────

interface HistoryViewProps {
  activeSessionId: number | null;
  onSelectSession: (id: number) => void;
  onNewChat: () => void;
  onBack: () => void;
  onClose: () => void;
}

function HistoryView({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onBack,
  onClose,
}: HistoryViewProps) {
  const theme = useTheme();
  const { data, isLoading } = useGetSessionsQuery();
  const [renameSession] = useRenameSessionMutation();
  const [deleteSession] = useDeleteSessionMutation();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const sessions = data?.data ?? [];

  const handleRename = async (id: number) => {
    if (editTitle.trim()) await renameSession({ id, title: editTitle.trim() });
    setEditingId(null);
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <GradientHeader>
        <Tooltip title="Retour au chat">
          <IconButton
            size="small"
            onClick={onBack}
            sx={{
              color: alpha("#fff", 0.85),
              "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.12) },
            }}
          >
            <ArrowLeft size={18} />
          </IconButton>
        </Tooltip>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: alpha("#fff", 0.2),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <History size={16} color="#fff" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="#fff"
            fontSize="0.85rem"
          >
            Historique
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: alpha("#fff", 0.75), fontSize: "0.65rem" }}
          >
            {sessions.length} conversation{sessions.length !== 1 ? "s" : ""}
          </Typography>
        </Box>
        <Tooltip title="Fermer">
          <IconButton
            size="small"
            onClick={onClose}
            sx={{
              color: alpha("#fff", 0.7),
              "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.1) },
            }}
          >
            <X size={16} />
          </IconButton>
        </Tooltip>
      </GradientHeader>

      {/* New conversation button */}
      <Box sx={{ px: 2, pt: 2, pb: 1, flexShrink: 0 }}>
        <Box
          onClick={onNewChat}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1.5,
            borderRadius: 2.5,
            cursor: "pointer",
            border: `1.5px dashed ${alpha(theme.palette.primary.main, 0.45)}`,
            color: theme.palette.primary.main,
            transition: "all 0.2s",
            "&:hover": {
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              borderColor: theme.palette.primary.main,
            },
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Plus size={16} />
          </Box>
          <Typography variant="body2" fontWeight={600} fontSize="0.85rem">
            Nouvelle conversation
          </Typography>
        </Box>
      </Box>

      {/* Session list */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          pb: 2,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: alpha(theme.palette.divider, 0.5),
            borderRadius: 2,
          },
        }}
      >
        {isLoading ? (
          <Box>
            {[...Array(5)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  gap: 1.5,
                  mb: 1.5,
                  alignItems: "center",
                }}
              >
                <Skeleton variant="circular" width={40} height={40} />
                <Box sx={{ flex: 1 }}>
                  <Skeleton variant="text" width="70%" height={18} />
                  <Skeleton variant="text" width="50%" height={14} />
                </Box>
              </Box>
            ))}
          </Box>
        ) : sessions.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 6 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 2,
              }}
            >
              <MessageSquare size={24} color={theme.palette.text.disabled} />
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              Aucune conversation
            </Typography>
            <Typography
              variant="caption"
              color="text.disabled"
              display="block"
              mt={0.5}
            >
              Commencez une nouvelle conversation
            </Typography>
          </Box>
        ) : (
          sessions.map((session) => {
            const isActive = activeSessionId === session.id;
            return (
              <Box
                key={session.id}
                onClick={() =>
                  editingId !== session.id && onSelectSession(session.id)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1.5,
                  mb: 1,
                  borderRadius: 2.5,
                  cursor: "pointer",
                  bgcolor: isActive
                    ? alpha(theme.palette.primary.main, 0.1)
                    : alpha(theme.palette.background.paper, 0.8),
                  border: `1px solid ${isActive ? alpha(theme.palette.primary.main, 0.35) : alpha(theme.palette.divider, 0.5)}`,
                  boxShadow: isActive
                    ? `0 2px 12px ${alpha(theme.palette.primary.main, 0.12)}`
                    : `0 1px 4px ${alpha(theme.palette.common.black, 0.04)}`,
                  transition: "all 0.18s",
                  "&:hover": {
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.12)
                      : alpha(theme.palette.background.paper, 1),
                    boxShadow: `0 4px 16px ${alpha(theme.palette.common.black, 0.08)}`,
                    transform: "translateY(-1px)",
                  },
                }}
              >
                {/* Icon */}
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: 2,
                    flexShrink: 0,
                    bgcolor: isActive
                      ? alpha(theme.palette.primary.main, 0.15)
                      : alpha(theme.palette.grey[500], 0.08),
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <MessageSquare
                    size={18}
                    color={
                      isActive
                        ? theme.palette.primary.main
                        : theme.palette.text.secondary
                    }
                  />
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {editingId === session.id ? (
                    <Box
                      sx={{ display: "flex", gap: 0.5 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TextField
                        size="small"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(session.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        autoFocus
                        sx={{
                          flex: 1,
                          "& .MuiInputBase-input": {
                            fontSize: "0.8rem",
                            py: 0.5,
                          },
                        }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleRename(session.id)}
                        sx={{ color: "success.main" }}
                      >
                        <Check size={14} />
                      </IconButton>
                    </Box>
                  ) : (
                    <>
                      <Typography
                        variant="body2"
                        fontWeight={isActive ? 700 : 500}
                        noWrap
                        sx={{
                          fontSize: "0.82rem",
                          color: isActive ? "primary.main" : "text.primary",
                          lineHeight: 1.3,
                        }}
                      >
                        {session.title}
                      </Typography>
                      {session.lastMessage && (
                        <Typography
                          variant="caption"
                          color="text.disabled"
                          noWrap
                          sx={{
                            fontSize: "0.72rem",
                            display: "block",
                            mt: 0.25,
                          }}
                        >
                          {session.lastMessage.role === "user"
                            ? "Vous: "
                            : "Assistant: "}
                          {session.lastMessage.content.slice(0, 45)}
                          {session.lastMessage.content.length > 45 ? "…" : ""}
                        </Typography>
                      )}
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.68rem",
                          color: isActive
                            ? alpha(theme.palette.primary.main, 0.7)
                            : "text.disabled",
                        }}
                      >
                        {formatRelativeDate(session.updatedAt)}
                      </Typography>
                    </>
                  )}
                </Box>

                {/* Actions — always visible on touch, hover on desktop */}
                {editingId !== session.id && (
                  <Box
                    sx={{
                      display: "flex",
                      flexShrink: 0,
                      gap: 0.25,
                      opacity: { xs: 1, sm: 0 },
                      ".MuiBox-root:hover > &": { opacity: 1 },
                      transition: "opacity 0.15s",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip title="Renommer">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setEditingId(session.id);
                          setEditTitle(session.title);
                        }}
                        sx={{
                          p: 0.5,
                          color: "text.secondary",
                          borderRadius: 1.5,
                          "&:hover": {
                            color: "primary.main",
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                          },
                        }}
                      >
                        <Pencil size={13} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Supprimer">
                      <IconButton
                        size="small"
                        onClick={() => deleteSession(session.id)}
                        sx={{
                          p: 0.5,
                          color: "text.secondary",
                          borderRadius: 1.5,
                          "&:hover": {
                            color: "error.main",
                            bgcolor: alpha(theme.palette.error.main, 0.08),
                          },
                        }}
                      >
                        <Trash2 size={13} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>
            );
          })
        )}
      </Box>
    </Box>
  );
}

// ─── Chat View ────────────────────────────────────────────────────────────────

interface ChatViewProps {
  activeSessionId: number | null;
  localMessages: ChatMessage[];
  isTyping: boolean;
  loadingSession: boolean;
  input: string;
  expanded: boolean;
  isMobile: boolean;
  onInput: (v: string) => void;
  onSend: (text?: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onShowHistory: () => void;
  onNewChat: () => void;
  onToggleExpand: () => void;
  onClose: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  inputRef: React.RefObject<HTMLInputElement | null>;
}

function ChatView({
  activeSessionId,
  localMessages,
  isTyping,
  loadingSession,
  input,
  expanded,
  isMobile,
  onInput,
  onSend,
  onKeyDown,
  onShowHistory,
  onNewChat,
  onToggleExpand,
  onClose,
  messagesEndRef,
  inputRef,
}: ChatViewProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <GradientHeader>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            bgcolor: alpha("#fff", 0.2),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <TrendingUp size={16} color="#fff" />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="#fff"
            noWrap
            fontSize="0.85rem"
          >
            Assistant Finora
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                bgcolor: "#10B981",
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: alpha("#fff", 0.85), fontSize: "0.65rem" }}
            >
              Assistant comptable intelligent
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 0.25 }}>
          <Tooltip title="Historique des conversations">
            <IconButton
              size="small"
              onClick={onShowHistory}
              sx={{
                color: alpha("#fff", 0.7),
                "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.1) },
              }}
            >
              <History size={15} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Nouvelle conversation">
            <IconButton
              size="small"
              onClick={onNewChat}
              sx={{
                color: alpha("#fff", 0.7),
                "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.1) },
              }}
            >
              <Plus size={15} />
            </IconButton>
          </Tooltip>
          {!isMobile && (
            <Tooltip title={expanded ? "Réduire" : "Agrandir"}>
              <IconButton
                size="small"
                onClick={onToggleExpand}
                sx={{
                  color: alpha("#fff", 0.7),
                  "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.1) },
                }}
              >
                {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Fermer">
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: alpha("#fff", 0.7),
                "&:hover": { color: "#fff", bgcolor: alpha("#fff", 0.1) },
              }}
            >
              <X size={15} />
            </IconButton>
          </Tooltip>
        </Box>
      </GradientHeader>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 2,
          py: 1.5,
          display: "flex",
          flexDirection: "column",
          bgcolor: alpha(theme.palette.background.default, 0.6),
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-thumb": {
            bgcolor: alpha(theme.palette.divider, 0.5),
            borderRadius: 2,
          },
        }}
      >
        {loadingSession ? (
          <Box sx={{ pt: 2 }}>
            {[...Array(3)].map((_, i) => (
              <Box
                key={i}
                sx={{
                  display: "flex",
                  gap: 1,
                  mb: 2,
                  flexDirection: i % 2 === 0 ? "row" : "row-reverse",
                }}
              >
                <Skeleton variant="circular" width={30} height={30} />
                <Skeleton
                  variant="rounded"
                  width="60%"
                  height={48}
                  sx={{ borderRadius: 3 }}
                />
              </Box>
            ))}
          </Box>
        ) : (
          localMessages.map((msg, i) => <MessageBubble key={i} msg={msg} />)
        )}
        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested prompts — only on fresh chat */}
      {!activeSessionId && localMessages.length <= 1 && !isTyping && (
        <Box
          sx={{
            px: 1.5,
            pb: 1,
            pt: 1,
            display: "flex",
            gap: 0.75,
            flexWrap: "wrap",
            borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            bgcolor: alpha(theme.palette.background.paper, 0.5),
          }}
        >
          {SUGGESTED_PROMPTS.map((prompt) => (
            <Chip
              key={prompt}
              label={prompt}
              size="small"
              onClick={() => onSend(prompt)}
              sx={{
                fontSize: "0.7rem",
                height: 24,
                cursor: "pointer",
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                  transform: "translateY(-1px)",
                },
                "& .MuiChip-label": { px: 1 },
              }}
            />
          ))}
        </Box>
      )}

      {/* Input */}
      <Box
        sx={{
          px: 2,
          py: 1.5,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          bgcolor: theme.palette.background.paper,
          display: "flex",
          gap: 1,
          alignItems: "flex-end",
          flexShrink: 0,
        }}
      >
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={4}
          placeholder="Posez votre question..."
          value={input}
          onChange={(e) => onInput(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={isTyping}
          size="small"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2.5,
              fontSize: "0.875rem",
              bgcolor: alpha(theme.palette.background.default, 0.5),
              "& fieldset": { borderColor: alpha(theme.palette.divider, 0.4) },
              "&:hover fieldset": {
                borderColor: alpha(theme.palette.primary.main, 0.5),
              },
              "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "2px",
              },
            },
            "& .MuiInputBase-input": {
              py: 1.25,
            },
          }}
        />
        <IconButton
          onClick={() => onSend()}
          disabled={!input.trim() || isTyping}
          sx={{
            width: 40,
            height: 40,
            flexShrink: 0,
            borderRadius: 2.5,
            background:
              input.trim() && !isTyping
                ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                : alpha(theme.palette.action.disabled, 0.1),
            color:
              input.trim() && !isTyping
                ? "#fff"
                : theme.palette.action.disabled,
            transition: "all 0.2s",
            "&:hover": {
              transform: input.trim() && !isTyping ? "scale(1.05)" : "none",
            },
            "&.Mui-disabled": {
              bgcolor: alpha(theme.palette.action.disabled, 0.1),
            },
          }}
        >
          {isTyping ? (
            <CircularProgress
              size={16}
              sx={{ color: theme.palette.primary.main }}
            />
          ) : (
            <Send size={17} />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}

// ─── Root Widget ──────────────────────────────────────────────────────────────

export default function ChatbotWidget() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { pathname } = useLocation();

  // Hide entirely on mobile when on the messages page — the chat window is
  // full-screen there and the FAB would overlap the send button.
  const isInChatRoom = isMobile && /\/messages/.test(pathname);

  const { user } = useAppSelector((state) => state.auth);
  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const isClient =
    userRole?.toUpperCase() === ROLE_CODES.CLIENT ||
    userRole?.toUpperCase() === "CLIENT";

  // ── State ──────────────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  // 'chat' | 'history'  — controls which full-panel view is shown
  const [view, setView] = useState<"chat" | "history">("chat");
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [sendMessage] = useSendMessageMutation();
  const { data: sessionData, isFetching: loadingSession } = useGetSessionQuery(
    activeSessionId!,
    { skip: !activeSessionId },
  );

  // ── Effects ────────────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (open && view === "chat") scrollToBottom();
  }, [localMessages, isTyping, open, view, scrollToBottom]);

  useEffect(() => {
    if (open && view === "chat") {
      setHasUnread(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, view]);

  // Populate messages when a session is loaded from DB
  useEffect(() => {
    if (sessionData?.data?.messages) {
      setLocalMessages(
        sessionData.data.messages.map((m) => ({
          ...m,
          timestamp: new Date(m.createdAt!).getTime(),
        })),
      );
    }
  }, [sessionData]);

  // Welcome message for a fresh chat
  useEffect(() => {
    if (!activeSessionId && localMessages.length === 0) {
      setLocalMessages([
        {
          role: "assistant",
          content:
            "Bonjour, je suis votre assistant comptable Finora.\n\nJe peux vous aider avec :\n\n**Gestion financière**\n- Consultation et création de factures\n- Gestion des devis\n- Suivi des fournisseurs\n\n**Analyses**\n- Calculs TVA et montants HT/TTC\n- Analyses de votre chiffre d'affaires\n- Détection d'anomalies comptables\n\nComment puis-je vous assister aujourd'hui ?",
          timestamp: Date.now(),
        },
      ]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSessionId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleSelectSession = (id: number) => {
    setActiveSessionId(id);
    setLocalMessages([]);
    setView("chat");
  };

  const handleNewChat = () => {
    setActiveSessionId(null);
    setLocalMessages([]);
    setView("chat");
  };

  const handleSend = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isTyping) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: messageText,
      timestamp: Date.now(),
    };
    setLocalMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const result = await sendMessage({
        message: messageText,
        sessionId: activeSessionId ?? undefined,
      }).unwrap();

      if (!activeSessionId) setActiveSessionId(result.sessionId);

      setLocalMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: result.reply,
          toolsUsed: result.toolsUsed,
          timestamp: Date.now(),
        },
      ]);

      if (!open) setHasUnread(true);
    } catch {
      setLocalMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Désolé, une erreur s'est produite. Veuillez réessayer.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Early returns AFTER all hooks ──────────────────────────────────────────

  // Only render for CLIENT role
  if (!isClient) return null;

  // Don't render at all on mobile inside a chat room — avoids blocking the input bar
  if (isInChatRoom) return null;

  // ── Dimensions ─────────────────────────────────────────────────────────────
  // History view is always the same width as the chat panel — no sidebar squeezing
  const panelWidth = isMobile ? "100vw" : expanded ? 480 : 380;
  const panelHeight = isMobile ? "100dvh" : expanded ? 680 : 520;

  return (
    <>
      {/* ── FAB — hidden on mobile when panel is open (panel is full-screen) */}
      {!(isMobile && open) && (
        <Tooltip title="Assistant financier" placement="left">
          <Fab
            onClick={() => setOpen((v) => !v)}
            sx={{
              position: "fixed",
              bottom: { xs: 88, sm: 24 },
              right: { xs: 16, sm: 24 },
              zIndex: 1300,
              width: 56,
              height: 56,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              color: "#fff",
              boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.45)}`,
              transition: "all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
              "&:hover": { transform: "scale(1.08)" },
            }}
          >
            {hasUnread && (
              <Box
                sx={{
                  position: "absolute",
                  top: 6,
                  right: 6,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  bgcolor: "#EF4444",
                  border: "2px solid #fff",
                  animation: "pulse 1.5s infinite",
                  "@keyframes pulse": {
                    "0%, 100%": { transform: "scale(1)" },
                    "50%": { transform: "scale(1.3)" },
                  },
                }}
              />
            )}
            <MessageCircle size={22} />
          </Fab>
        </Tooltip>
      )}

      {/* ── Panel ───────────────────────────────────────────────────────── */}
      <Collapse
        in={open}
        timeout={300}
        sx={{
          position: "fixed",
          bottom: isMobile ? 0 : 92,
          right: isMobile ? 0 : 24,
          zIndex: 1299,
          transformOrigin: "bottom right",
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: panelWidth,
            height: panelHeight,
            display: "flex",
            flexDirection: "column",
            borderRadius: isMobile ? 0 : 4,
            overflow: "hidden",
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            boxShadow: `0 24px 64px ${alpha(theme.palette.common.black, 0.18)}`,
            bgcolor: alpha(theme.palette.background.default, 0.97),
            backdropFilter: "blur(20px)",
            // Slide animation between views
            "& > *": { transition: "opacity 0.2s ease" },
          }}
        >
          {view === "history" ? (
            <HistoryView
              activeSessionId={activeSessionId}
              onSelectSession={handleSelectSession}
              onNewChat={handleNewChat}
              onBack={() => setView("chat")}
              onClose={() => setOpen(false)}
            />
          ) : (
            <ChatView
              activeSessionId={activeSessionId}
              localMessages={localMessages}
              isTyping={isTyping}
              loadingSession={loadingSession}
              input={input}
              expanded={expanded}
              isMobile={isMobile}
              onInput={setInput}
              onSend={handleSend}
              onKeyDown={handleKeyDown}
              onShowHistory={() => setView("history")}
              onNewChat={handleNewChat}
              onToggleExpand={() => setExpanded((v) => !v)}
              onClose={() => setOpen(false)}
              messagesEndRef={messagesEndRef}
              inputRef={inputRef}
            />
          )}
        </Paper>
      </Collapse>
    </>
  );
}
