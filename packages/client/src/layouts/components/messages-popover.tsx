import type { ButtonProps } from "@mui/material/Button";

import { useState, useCallback } from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import { useTheme, alpha } from "@mui/material/styles";

import { Mail } from "lucide-react";

import { fToNow } from "src/utils/format-time";

import { Iconify } from "src/components/iconify";
import { Scrollbar } from "src/components/scrollbar";

// ----------------------------------------------------------------------

type MessageItemProps = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  message: string;
  isUnRead: boolean;
  sentAt: string | number | null;
  isOnline?: boolean;
};

export type MessagesPopoverProps = ButtonProps & {
  data?: MessageItemProps[];
};

export function MessagesPopover({
  data = [],
  sx,
  ...other
}: MessagesPopoverProps) {
  const theme = useTheme();
  const [messages, setMessages] = useState(data);

  const totalUnRead = messages.filter((item) => item.isUnRead === true).length;
  const hasUnread = totalUnRead > 0;

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(
    null,
  );

  const handleOpenPopover = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpenPopover(event.currentTarget);
    },
    [],
  );

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleMarkAllAsRead = useCallback(() => {
    const updatedMessages = messages.map((message) => ({
      ...message,
      isUnRead: false,
    }));

    setMessages(updatedMessages);
  }, [messages]);

  return (
    <>
      <Button
        variant="outlined"
        onClick={handleOpenPopover}
        sx={{
          position: "relative",
          minWidth: 44,
          height: 44,
          p: 0,
          borderRadius: 1.5,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.common.black,
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
        <Mail />

        {/* Red Dot Badge for Unread */}
        {hasUnread && (
          <Box
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              width: 8,
              height: 8,
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
            pr: 1.5,
            display: "flex",
            alignItems: "center",
          }}
        >
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Messages
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              You have {totalUnRead} unread message
              {totalUnRead !== 1 ? "s" : ""}
            </Typography>
          </Box>

          {hasUnread && (
            <Tooltip title="Mark all as read">
              <IconButton
                color="primary"
                onClick={handleMarkAllAsRead}
                size="small"
                sx={{
                  "&:hover": {
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Iconify icon="eva:done-all-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        <Divider sx={{ borderStyle: "dashed" }} />

        {/* Messages List */}
        <Scrollbar
          fillContent
          sx={{ minHeight: 240, maxHeight: { xs: 360, sm: 400 } }}
        >
          {messages.length === 0 ? (
            <Box
              sx={{
                py: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Iconify
                icon="solar:chat-round-dots-bold-duotone"
                width={64}
                sx={{ color: "text.disabled", mb: 2 }}
              />
              <Typography variant="body2" sx={{ color: "text.secondary" }}>
                No messages yet
              </Typography>
            </Box>
          ) : (
            <List disablePadding>
              {messages.map((message) => (
                <MessageItem key={message.id} message={message} />
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
            sx={{
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            View all messages
          </Button>
        </Box>
      </Popover>
    </>
  );
}

// ----------------------------------------------------------------------

function MessageItem({ message }: { message: MessageItemProps }) {
  const theme = useTheme();

  return (
    <ListItemButton
      sx={{
        py: 2,
        px: 2.5,
        mt: "1px",
        ...(message.isUnRead && {
          bgcolor: "action.selected",
        }),
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.04),
        },
      }}
    >
      <ListItemAvatar>
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={message.senderAvatar || undefined}
            sx={{
              width: 48,
              height: 48,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
            }}
          >
            {!message.senderAvatar &&
              message.senderName.charAt(0).toUpperCase()}
          </Avatar>

          {/* Online Status Indicator */}
          {message.isOnline && (
            <Box
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
                width: 12,
                height: 12,
                borderRadius: "50%",
                backgroundColor: theme.palette.success.main,
                border: `2px solid ${theme.palette.background.paper}`,
              }}
            />
          )}
        </Box>
      </ListItemAvatar>

      <ListItemText
        sx={{ ml: 1 }}
        primary={
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 0.5,
            }}
          >
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: message.isUnRead ? 600 : 500,
                color: message.isUnRead ? "text.primary" : "text.secondary",
              }}
            >
              {message.senderName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: "text.disabled",
                flexShrink: 0,
                ml: 1,
              }}
            >
              {fToNow(message.sentAt)}
            </Typography>
          </Box>
        }
        secondary={
          <Typography
            variant="body2"
            sx={{
              color: message.isUnRead ? "text.primary" : "text.secondary",
              fontWeight: message.isUnRead ? 500 : 400,
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              lineHeight: 1.5,
            }}
          >
            {message.message}
          </Typography>
        }
      />
    </ListItemButton>
  );
}
