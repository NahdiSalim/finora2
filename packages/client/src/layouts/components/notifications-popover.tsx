import type { ButtonProps } from "@mui/material/Button";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";

import Box from "@mui/material/Box";
import List from "@mui/material/List";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Tooltip from "@mui/material/Tooltip";
import Popover from "@mui/material/Popover";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import { useTheme, alpha } from "@mui/material/styles";

import { Bell } from "lucide-react";

import { Iconify } from "src/components/iconify";
import { Scrollbar } from "src/components/scrollbar";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "src/lib/services/notificationsApi";
import { useRespondToInvitationMutation } from "src/lib/services/relationshipsApi";
import { useAlert } from "src/contexts/AlertContext";

import {
  NotificationItem,
  type NotificationItemProps,
} from "./notifications-popover/NotificationItem";

// ----------------------------------------------------------------------

export type NotificationsPopoverProps = ButtonProps & {
  data?: NotificationItemProps[];
};

export function NotificationsPopover({
  data = [],
  sx,
  ...other
}: NotificationsPopoverProps) {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const { data: notificationsData, refetch: refetchNotifications } =
    useGetNotificationsQuery(
      { limit: 20, offset: 0 },
      {
        refetchOnFocus: false,
        refetchOnReconnect: false,
      },
    );
  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();
  const [respondToInvitation] = useRespondToInvitationMutation();
  const notificationAudioRef = useRef<HTMLAudioElement | null>(null);
  const seenNotificationIdsRef = useRef<Set<number>>(new Set());
  const suppressNextBeepRef = useRef(false);

  const playNotificationBeep = useCallback(() => {
    if (typeof window === "undefined") return;
    const audio = notificationAudioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // Browsers can block autoplay until first user interaction.
    });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return () => {};
    }
    const audio = new Audio("/assets/sounds/notification.mp3");
    audio.preload = "auto";
    audio.volume = 1;
    notificationAudioRef.current = audio;
    return () => {
      notificationAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const list = notificationsData?.notifications ?? [];
    const currentIds = list
      .map((n) => Number(n.id))
      .filter((id) => Number.isFinite(id));

    // First hydration: mark existing ids as seen without playing sound.
    if (seenNotificationIdsRef.current.size === 0) {
      seenNotificationIdsRef.current = new Set(currentIds);
      return;
    }

    const hasNewNotification = currentIds.some(
      (id) => !seenNotificationIdsRef.current.has(id),
    );
    if (suppressNextBeepRef.current) {
      suppressNextBeepRef.current = false;
    } else if (hasNewNotification) {
      playNotificationBeep();
    }

    seenNotificationIdsRef.current = new Set(currentIds);
  }, [notificationsData, playNotificationBeep]);

  const notifications = useMemo(() => {
    const source =
      notificationsData?.notifications ??
      data.map((d) => ({
        id: Number(d.id),
        type: d.type,
        title: d.title,
        message: d.description,
        read: !d.isUnRead,
        createdAt: d.postedAt,
        data: null,
      }));
    return source.map((n: any) => {
      const notificationType = String(n.type || "").toLowerCase();
      const notificationData = n.data ?? {};
      const invitationId = Number(notificationData.invitationId);
      const isInvite =
        notificationType.includes("relationship") ||
        notificationType.includes("invitation");
      const canRespond = isInvite && !n.read && Number.isFinite(invitationId);
      return {
        id: String(n.id),
        type: notificationType || "notification",
        title: n.title ?? "Notification",
        isUnRead: !n.read,
        description: n.message ?? "",
        avatarUrl: null,
        postedAt: n.createdAt ?? null,
        canRespond,
        isProcessing: processingId === n.id,
        onAccept: canRespond
          ? async () => {
              try {
                setProcessingId(n.id);
                await respondToInvitation({
                  invitationId,
                  response: "accept",
                }).unwrap();
                suppressNextBeepRef.current = true;
                await markAsRead(n.id).unwrap();
                showAlert("Invitation acceptée", "success");
                refetchNotifications();
              } catch {
                showAlert("Erreur lors de l'acceptation", "error");
              } finally {
                setProcessingId(null);
              }
            }
          : undefined,
        onReject: canRespond
          ? async () => {
              try {
                setProcessingId(n.id);
                await respondToInvitation({
                  invitationId,
                  response: "reject",
                }).unwrap();
                suppressNextBeepRef.current = true;
                await markAsRead(n.id).unwrap();
                showAlert("Invitation refusée", "success");
                refetchNotifications();
              } catch {
                showAlert("Erreur lors du refus", "error");
              } finally {
                setProcessingId(null);
              }
            }
          : undefined,
      } as NotificationItemProps;
    });
  }, [
    notificationsData,
    processingId,
    respondToInvitation,
    markAsRead,
    showAlert,
    refetchNotifications,
    data,
  ]);

  const totalUnRead = notifications.filter(
    (item) => item.isUnRead === true,
  ).length;
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
    suppressNextBeepRef.current = true;
    markAllAsRead()
      .unwrap()
      .then(() => refetchNotifications())
      .catch(() => showAlert("Erreur lors du marquage", "error"));
  }, [markAllAsRead, refetchNotifications, showAlert]);

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
        <Bell />

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
              width: 360,
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
              Notifications
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
          sx={{ minHeight: 240, maxHeight: { xs: 360, sm: "none" } }}
        >
          <List
            disablePadding
            subheader={
              <ListSubheader
                disableSticky
                sx={{ py: 1, px: 2.5, typography: "overline" }}
              >
                New
              </ListSubheader>
            }
          >
            {notifications.slice(0, 2).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </List>

          <List
            disablePadding
            subheader={
              <ListSubheader
                disableSticky
                sx={{ py: 1, px: 2.5, typography: "overline" }}
              >
                Before that
              </ListSubheader>
            }
          >
            {notifications.slice(2, 20).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
              />
            ))}
          </List>
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
            View all
          </Button>
        </Box>
      </Popover>
    </>
  );
}
