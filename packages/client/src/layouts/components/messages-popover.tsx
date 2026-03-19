import type { ButtonProps } from "@mui/material/Button";

import { useState, useCallback } from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { useTheme, alpha } from "@mui/material/styles";

import { Mail } from "lucide-react";

import { Iconify } from "src/components/iconify";
import { Scrollbar } from "src/components/scrollbar";

import {
  MessageItem,
  type MessageItemProps,
} from "./messages-popover/MessageItem";

// ----------------------------------------------------------------------

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
                icon="solar:chat-round-dots-bold"
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
