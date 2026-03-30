import React from "react";
import { Box } from "@mui/material";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { Bell } from "lucide-react";
import { fToNow } from "src/utils/format-time";
import CustomButton from "src/components/common/CustomButton";

export type NotificationItemProps = {
  id: string;
  type: string;
  title: string;
  isUnRead: boolean;
  description: string;
  avatarUrl: string | null;
  postedAt: string | number | null;
  canRespond?: boolean;
  onAccept?: () => void;
  onReject?: () => void;
  isProcessing?: boolean;
};

function renderContent(notification: NotificationItemProps) {
  const title = (
    <Typography variant="subtitle2">
      {notification.title}
      <Typography
        component="span"
        variant="body2"
        sx={{ color: "text.secondary" }}
      >
        &nbsp; {notification.description}
      </Typography>
    </Typography>
  );

  if (notification.type === "order-placed") {
    return {
      avatarUrl: (
        <img
          alt={notification.title}
          src="/assets/icons/notification/ic-notification-package.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "order-shipped") {
    return {
      avatarUrl: (
        <img
          alt={notification.title}
          src="/assets/icons/notification/ic-notification-shipping.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "mail") {
    return {
      avatarUrl: (
        <img
          alt={notification.title}
          src="/assets/icons/notification/ic-notification-mail.svg"
        />
      ),
      title,
    };
  }
  if (notification.type === "chat-message") {
    return {
      avatarUrl: (
        <img
          alt={notification.title}
          src="/assets/icons/notification/ic-notification-chat.svg"
        />
      ),
      title,
    };
  }
  return {
    avatarUrl: notification.avatarUrl ? (
      <img alt={notification.title} src={notification.avatarUrl} />
    ) : null,
    title,
  };
}

export function NotificationItem({
  notification,
}: {
  notification: NotificationItemProps;
}) {
  const { avatarUrl, title } = renderContent(notification);

  return (
    <ListItemButton
      sx={{
        py: 1.5,
        px: 2.5,
        mt: "1px",
        ...(notification.isUnRead && {
          bgcolor: "action.selected",
        }),
      }}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: "background.neutral" }}>{avatarUrl}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={title}
        secondary={
          <Typography
            variant="caption"
            sx={{
              mt: 0.5,
              gap: 0.5,
              display: "flex",
              alignItems: "center",
              color: "text.disabled",
            }}
          >
            <Bell />
            {fToNow(notification.postedAt)}
          </Typography>
        }
      />
      {notification.canRespond && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, ml: 1 }}>
          <CustomButton
            size="small"
            variant="contained"
            color="success"
            onClick={(e) => {
              e.stopPropagation();
              notification.onAccept?.();
            }}
            loading={notification.isProcessing}
          >
            Accepter
          </CustomButton>
          <CustomButton
            size="small"
            variant="outlined"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              notification.onReject?.();
            }}
            disabled={notification.isProcessing}
          >
            Refuser
          </CustomButton>
        </Box>
      )}
    </ListItemButton>
  );
}
