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
import { useTheme, alpha } from "@mui/material/styles";

import { Mail } from "lucide-react";

import { Iconify } from "src/components/iconify";
import { Scrollbar } from "src/components/scrollbar";
import { useConversations } from "src/sections/messages/messages-view/hooks/useChatData";
import { useMarkRoomAsReadMutation } from "src/lib/services/chatApi";
import type { Conversation } from "src/sections/messages/messages-view/data/types";

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

// ── Room item ─────────────────────────────────────────────────────────────────
function RoomItem({
  conversation,
  isRead,
  onClick,
}: {
  conversation: Conversation;
  isRead: boolean;
  onClick: () => void;
}) {
  const theme = useTheme();
  const hasUnread =
    !isRead && !!conversation.unreadCount && conversation.unreadCount > 0;

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
        ...(hasUnread && {
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
            bgcolor: conversation.avatarColor ?? "#D9D9D9",
            color: conversation.avatarTextColor ?? "#666666",
          }}
        >
          {conversation.avatar}
        </Avatar>

        {hasUnread && (
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
        {/* Name + time */}
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
              fontWeight: hasUnread ? 700 : 500,
              fontSize: 14,
              color: hasUnread
                ? theme.palette.text.primary
                : theme.palette.text.primary,
              lineHeight: 1.3,
            }}
          >
            {conversation.name}
          </Typography>
          <Typography
            sx={{
              flexShrink: 0,
              fontSize: 11,
              color: hasUnread ? theme.palette.primary.main : "text.disabled",
              fontWeight: hasUnread ? 600 : 400,
              lineHeight: 1.3,
            }}
          >
            {relativeTimeFr(conversation.fullDate)}
          </Typography>
        </Box>

        {/* Role */}
        <Typography
          noWrap
          sx={{
            fontSize: 12,
            color: "text.disabled",
            lineHeight: 1.3,
            mb: 0.3,
          }}
        >
          {conversation.role}
        </Typography>

        {/* Preview + badge */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            minWidth: 0,
          }}
        >
          <Typography
            noWrap
            sx={{
              flex: 1,
              minWidth: 0,
              fontSize: 12.5,
              color: hasUnread ? theme.palette.text.primary : "text.secondary",
              fontWeight: hasUnread ? 600 : 400,
              lineHeight: 1.4,
            }}
          >
            {conversation.preview || "Aucun message"}
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

  // Rooms marked as read locally (optimistic — avoids stale badge after click)
  const [localReadIds, setLocalReadIds] = useState<Set<number>>(new Set());
  const [markRoomAsRead] = useMarkRoomAsReadMutation();

  const { conversations, isLoading } = useConversations({ pageSize: 10 });

  const unreadConversations = useMemo(
    () =>
      conversations.filter(
        (c) => !localReadIds.has(c.id) && !!c.unreadCount && c.unreadCount > 0,
      ),
    [conversations, localReadIds],
  );

  const totalUnread = unreadConversations.length;
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

  const handleRoomClick = useCallback(
    (conv: Conversation) => {
      // Optimistically mark as read locally
      setLocalReadIds((prev) => new Set([...prev, conv.id]));
      // Persist to backend — updates readBy[] on all unread messages in this room
      markRoomAsRead(conv.id);
      handleClosePopover();
      navigate(
        `${dashboardBase}/messages?roomId=${conv.id}&category=${conv.category}`,
      );
    },
    [navigate, handleClosePopover, dashboardBase, markRoomAsRead],
  );

  const handleViewAll = useCallback(() => {
    handleClosePopover();
    navigate(`${dashboardBase}/messages`);
  }, [navigate, handleClosePopover, dashboardBase]);

  const subtitleText = useMemo(() => {
    if (isLoading) return "Chargement…";
    if (totalUnread === 0) return "Aucun message non lu";
    return `Vous avez ${totalUnread} message${totalUnread > 1 ? "s" : ""} non lu${totalUnread > 1 ? "s" : ""}`;
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
          ) : conversations.length === 0 ? (
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
                Aucune conversation
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {conversations.map((conv) => (
                <RoomItem
                  key={conv.id}
                  conversation={conv}
                  isRead={localReadIds.has(conv.id)}
                  onClick={() => handleRoomClick(conv)}
                />
              ))}
            </List>
          )}
        </Scrollbar>

        <Divider sx={{ borderStyle: "dashed" }} />

        {/* Footer */}
        <Box sx={{ p: 1 }}>
          <Button
            fullWidth
            disableRipple
            color="inherit"
            onClick={handleViewAll}
            sx={{
              fontSize: 13,
              fontWeight: 500,
              borderRadius: "10px",
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.06),
                color: theme.palette.primary.main,
              },
            }}
          >
            Voir tous les messages
          </Button>
        </Box>
      </Popover>
    </>
  );
}
