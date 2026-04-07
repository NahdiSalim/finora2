import type { ButtonProps } from "@mui/material/Button";

import { useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useDashboardBase } from "src/hooks/useDashboardBase";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import ListItemButton from "@mui/material/ListItemButton";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import { useTheme, alpha } from "@mui/material/styles";

import {
  Mail,
  FileText,
  Calendar,
  ClipboardList,
  CheckCheck,
} from "lucide-react";

import { Iconify } from "src/components/iconify";
import { Scrollbar } from "src/components/scrollbar";
import {
  useGetRecentMessagesQuery,
  useMarkAllRoomsAsReadMutation,
  type RecentMessage,
} from "src/lib/services/chatApi";
import CustomButton from "src/components/common/CustomButton";

// ----------------------------------------------------------------------

export type MessagesPopoverProps = ButtonProps;

// ── Relative time in French ───────────────────────────────────────────────────
function relativeTimeFr(dateStr: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diff)) return "";

  const s = Math.floor(diff / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);

  if (s < 60) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  if (h < 24) return `il y a ${h} h`;
  if (d === 1) return "hier";
  if (d < 7) return `il y a ${d} jours`;

  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

// ── Helper to get avatar initials ────────────────────────────────────────────
function getAvatarInitials(sender: RecentMessage["sender"]): string {
  if (sender.firstName && sender.lastName) {
    return `${sender.firstName[0]}${sender.lastName[0]}`.toUpperCase();
  }
  if (sender.firstName) return sender.firstName[0].toUpperCase();
  if (sender.lastName) return sender.lastName[0].toUpperCase();
  if (sender.username) return sender.username[0].toUpperCase();
  return "?";
}

// ── Helper to get sender display name ─────────────────────────────────────────
function getSenderName(sender: RecentMessage["sender"]): string {
  if (sender.firstName && sender.lastName) {
    return `${sender.firstName} ${sender.lastName}`;
  }
  if (sender.firstName) return sender.firstName;
  if (sender.lastName) return sender.lastName;
  return sender.username ?? "Utilisateur";
}

// ── Helper to get message preview ─────────────────────────────────────────────
function getMessagePreview(message: RecentMessage): {
  text: string;
  icon?: React.ReactElement;
} {
  const MAX_LENGTH = 60;

  if (message.type === "file" || message.type === "image") {
    return {
      text: message.content || "Fichier joint",
      icon: <FileText size={14} />,
    };
  }

  if (message.type === "request" && message.request) {
    return {
      text: message.request.subject,
      icon: <FileText size={14} />,
    };
  }

  if (message.type === "task" && message.task) {
    return {
      text: message.task.title,
      icon: <ClipboardList size={14} />,
    };
  }

  if (message.type === "appointment" && message.appointment) {
    return {
      text: message.appointment.title,
      icon: <Calendar size={14} />,
    };
  }

  const text = message.content || "";
  return {
    text: text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH)}...` : text,
  };
}

// ── Message item ──────────────────────────────────────────────────────────────
function MessageItem({
  message,
  onClick,
}: {
  message: RecentMessage;
  onClick: () => void;
}) {
  const theme = useTheme();
  const preview = getMessagePreview(message);

  return (
    <ListItemButton
      onClick={onClick}
      sx={{
        py: 1.5,
        px: 2.5,
        gap: 1.5,
        alignItems: "flex-start",
        transition: "background 0.15s",
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        },
        ...(message.unread && {
          bgcolor: alpha(theme.palette.primary.main, 0.05),
        }),
      }}
    >
      {/* Avatar with unread dot */}
      <Box sx={{ position: "relative", flexShrink: 0 }}>
        <Avatar
          sx={{
            width: 44,
            height: 44,
            fontSize: 16,
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
            color: theme.palette.common.white,
          }}
        >
          {message.room.type === "group"
            ? (message.room.name || "G")
                .split(" ")
                .map((w) => w[0])
                .filter(Boolean)
                .join("")
                .slice(0, 2)
                .toUpperCase()
            : getAvatarInitials(message.sender)}
        </Avatar>

        {message.unread && (
          <Box
            sx={{
              position: "absolute",
              bottom: 1,
              right: 1,
              width: 11,
              height: 11,
              borderRadius: "50%",
              bgcolor: "#22C55E",
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* Sender name + time */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.15,
          }}
        >
          <Typography
            noWrap
            sx={{
              flex: 1,
              minWidth: 0,
              fontWeight: message.unread ? 700 : 500,
              fontSize: 14,
              color: theme.palette.text.primary,
              lineHeight: 1.3,
            }}
          >
            {message.room.type === "group"
              ? message.room.name || "Groupe"
              : getSenderName(message.sender)}
          </Typography>
          <Typography
            sx={{
              flexShrink: 0,
              fontSize: 11,
              color: message.unread
                ? theme.palette.primary.main
                : "text.disabled",
              fontWeight: message.unread ? 600 : 400,
              lineHeight: 1.3,
            }}
          >
            {relativeTimeFr(message.createdAt)}
          </Typography>
        </Box>

        {/* Message preview with icon */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            minWidth: 0,
          }}
        >
          {preview.icon && (
            <Box
              sx={{
                flexShrink: 0,
                color: "text.disabled",
                display: "flex",
                alignItems: "center",
              }}
            >
              {preview.icon}
            </Box>
          )}
          <Typography
            noWrap
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 12.5,
              color: message.unread
                ? theme.palette.text.primary
                : "text.secondary",
              fontWeight: message.unread ? 600 : 400,
              lineHeight: 1.4,
            }}
          >
            {message.room.type === "group"
              ? `${getSenderName(message.sender)}: ${preview.text || "Message"}`
              : preview.text || "Message"}
          </Typography>
        </Box>
      </Box>
    </ListItemButton>
  );
}

// ── Main popover ──────────────────────────────────────────────────────────────
export function MessagesPopover({ sx, ...other }: MessagesPopoverProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const dashboardBase = useDashboardBase();

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(
    null,
  );

  // Fetch recent messages with real-time updates via WebSocket
  const {
    data: recentMessagesData,
    isLoading,
    refetch,
  } = useGetRecentMessagesQuery(undefined, {
    // No polling - WebSocket handles real-time updates automatically
  });

  const [markAllAsRead, { isLoading: isMarkingAllAsRead }] =
    useMarkAllRoomsAsReadMutation();

  // Deduplicate by roomId — keep only the latest message per room
  const messages = useMemo(() => {
    const raw = recentMessagesData?.messages ?? [];
    const seen = new Map<number, RecentMessage>();
    for (const msg of raw) {
      if (!seen.has(msg.roomId)) {
        seen.set(msg.roomId, msg);
      }
    }
    return Array.from(seen.values());
  }, [recentMessagesData]);
  const totalUnread = recentMessagesData?.unreadCount ?? 0;
  const hasUnread = totalUnread > 0;

  const handleOpenPopover = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpenPopover(event.currentTarget);
    },
    [],
  );

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleMessageClick = useCallback(
    (message: RecentMessage) => {
      handleClosePopover();
      // Use room.type to determine the correct tab:
      // - "group" → group tab
      // - anything else → derive from room.category if available, otherwise omit
      //   so index.tsx can search across all tabs
      const category =
        message.room.type === "group" ? "group" : (message.room.category ?? "");
      const params = new URLSearchParams();
      params.set("roomId", String(message.roomId));
      if (category) params.set("category", category);
      navigate(`${dashboardBase}/messages?${params.toString()}`);
    },
    [navigate, handleClosePopover, dashboardBase],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      refetch();
    } catch {
      /* ignored */
    }
  }, [markAllAsRead, refetch]);

  const handleViewAll = useCallback(() => {
    handleClosePopover();
    navigate(`${dashboardBase}/messages`);
  }, [navigate, handleClosePopover, dashboardBase]);

  const subtitleText = useMemo(() => {
    if (isLoading) return "Chargement…";
    if (totalUnread === 0) return "Aucun message non lu";
    return `${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}`;
  }, [isLoading, totalUnread]);

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpenPopover}
        sx={{
          position: "relative",
          minWidth: { xs: 38, sm: 44 },
          width: { xs: 38, sm: 44 },
          height: { xs: 38, sm: 44 },
          p: 0,
          borderRadius: 1.5,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.common.black,
          flexShrink: 0,
          transition: theme.transitions.create([
            "border-color",
            "background-color",
            "color",
          ]),
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.primary.main,
          },
          ...(openPopover && {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.primary.main,
          }),
          ...sx,
        }}
        {...other}
      >
        <Mail size={17} />

        {hasUnread && (
          <Box
            sx={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 9,
              height: 9,
              borderRadius: "50%",
              backgroundColor: theme.palette.error.main,
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        )}
      </Button>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 380,
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              mt: 1,
              borderRadius: "16px",
              boxShadow: theme.shadows[8],
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            py: 2,
            pl: 2.5,
            pr: 2,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography
              sx={{ fontWeight: 700, fontSize: 15, color: "text.primary" }}
            >
              Messages
            </Typography>
            <Typography
              sx={{
                fontSize: 12.5,
                color: hasUnread
                  ? theme.palette.warning.dark
                  : "text.secondary",
                fontWeight: hasUnread ? 600 : 400,
                mt: 0.25,
              }}
            >
              {subtitleText}
            </Typography>
          </Box>

          {/* Mark all as read button */}
          {hasUnread && (
            <Tooltip title="Marquer tout comme lu">
              <IconButton
                onClick={handleMarkAllAsRead}
                disabled={isMarkingAllAsRead}
                sx={{
                  color: theme.palette.primary.main,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                {isMarkingAllAsRead ? (
                  <CircularProgress size={20} />
                ) : (
                  <CheckCheck size={20} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderStyle: "dashed" }} />

        {/* List */}
        <Scrollbar
          fillContent
          sx={{ minHeight: 240, maxHeight: { xs: 360, sm: 420 } }}
        >
          {isLoading ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={28} />
            </Box>
          ) : messages.length === 0 ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <Iconify
                icon="solar:chat-round-dots-bold"
                width={56}
                sx={{ color: "text.disabled" }}
              />
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontSize: 13 }}
              >
                Aucun message récent
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {messages.map((msg: RecentMessage) => (
                <MessageItem
                  key={msg.id}
                  message={msg}
                  onClick={() => handleMessageClick(msg)}
                />
              ))}
            </List>
          )}
        </Scrollbar>

        <Divider sx={{ borderStyle: "dashed" }} />

        {/* Footer */}
        <Box sx={{ p: 1 }}>
          <CustomButton
            fullWidth
            disableRipple
            color="primary"
            onClick={handleViewAll}
            variant="text"
            sx={{
              fontSize: 13,
              fontWeight: 500,
              borderRadius: "10px",
            }}
          >
            Voir tous les messages
          </CustomButton>
        </Box>
      </Popover>
    </>
  );
}
