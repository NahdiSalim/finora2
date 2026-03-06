import React from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { useTheme, alpha } from "@mui/material/styles";
import { fToNow } from "src/utils/format-time";

export type MessageItemProps = {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  message: string;
  isUnRead: boolean;
  sentAt: string | number | null;
  isOnline?: boolean;
};

export function MessageItem({ message }: { message: MessageItemProps }) {
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
