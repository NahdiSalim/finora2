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
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme, alpha } from "@mui/material/styles";

import { Bell, BellDot } from "lucide-react";

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

const parseNotificationData = (value: unknown): Record<string, unknown> => {
  if (!value) return {};
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
};

const readNumericId = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

export function NotificationsPopover({
  data = [],
  sx,
  ...other
}: NotificationsPopoverProps) {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [processingId, setProcessingId] = useState<number | null>(null);
  const {
    data: notificationsData,
    refetch: refetchNotifications,
    isLoading,
  } = useGetNotificationsQuery(
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
      const notificationData = parseNotificationData(n.data);
      const invitationId =
        readNumericId(notificationData.invitationId) ??
        readNumericId(notificationData.relationshipId) ??
        readNumericId((n as Record<string, unknown>).invitationId);
      const actionUrl = String(
        (n as Record<string, unknown>).actionUrl ??
          (notificationData.actionUrl as string | undefined) ??
          "",
      ).toLowerCase();
      const title = String(n.title ?? "").toLowerCase();
      const isInvite =
        notificationType.includes("relationship") ||
        notificationType.includes("invitation");
      const isInvitationToRespond =
        actionUrl.includes("/relationships/invitations/") ||
        title.includes("nouvelle invitation");
      const canRespond =
        isInvite && isInvitationToRespond && !n.read && invitationId != null;
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
                  invitationId: invitationId as number,
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
                  invitationId: invitationId as number,
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

  // Render empty state if no notifications
  const renderEmptyState = () => (
    <Box
      sx={{
        py: 8,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
      }}
    >
      <BellDot size={20} sx={{ color: "text.disabled", mb: 1, opacity: 0.6 }} />
      <Typography variant="body2" color="text.disabled">
        Aucune notification
      </Typography>
    </Box>
  );

  // Render loading skeleton
  const renderLoading = () => (
    <Box
      sx={{
        py: 8,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <CircularProgress size={32} />
    </Box>
  );

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
            "transform",
          ]),
          "&:hover": {
            borderColor: theme.palette.primary.main,
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.primary.main,
            transform: "scale(1.02)",
          },
          "&:active": {
            transform: "scale(0.98)",
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
        <Bell size={20} />

        {/* Badge for unread count */}
        {hasUnread && (
          <Box
            sx={{
              position: "absolute",
              top: 4,
              right: 4,
              minWidth: 18,
              height: 18,
              borderRadius: 9,
              backgroundColor: theme.palette.error.main,
              color: theme.palette.common.white,
              fontSize: "0.65rem",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 0.5,
              lineHeight: 1,
              transform: "translate(25%, -25%)",
            }}
          >
            {totalUnRead > 9 ? "9+" : totalUnRead}
          </Box>
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
              mt: 1.5,
              borderRadius: 2.5,
              boxShadow: theme.shadows[16],
              transition: theme.transitions.create(["transform", "opacity"], {
                duration: theme.transitions.duration.short,
              }),
            },
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            py: 1.5,
            px: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Notifications
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {totalUnRead === 0
                ? "Aucun message non lu"
                : `${totalUnRead} message${totalUnRead > 1 ? "s" : ""} non lu${
                    totalUnRead > 1 ? "s" : ""
                  }`}
            </Typography>
          </Box>

          {hasUnread && (
            <Tooltip title="Tout marquer comme lu">
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
                <Iconify icon="eva:done-all-fill" width={20} />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Notification list */}
        <Scrollbar
          fillContent
          sx={{
            minHeight: 240,
            maxHeight: { xs: 360, sm: "none" },
            "& .MuiList-root": {
              py: 0,
            },
          }}
        >
          {isLoading ? (
            renderLoading()
          ) : notifications.length === 0 ? (
            renderEmptyState()
          ) : (
            <>
              {/* New section */}
              <List
                disablePadding
                subheader={
                  <ListSubheader
                    disableSticky
                    sx={{
                      py: 1,
                      px: 2,
                      typography: "overline",
                      fontWeight: 600,
                      color: "text.secondary",
                      backgroundColor: "transparent",
                    }}
                  >
                    Nouveau
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

              {/* Older section */}
              <List
                disablePadding
                subheader={
                  <ListSubheader
                    disableSticky
                    sx={{
                      py: 1,
                      px: 2,
                      typography: "overline",
                      fontWeight: 600,
                      color: "text.secondary",
                      backgroundColor: "transparent",
                    }}
                  >
                    Avant
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
            </>
          )}
        </Scrollbar>

        {/* Footer with "View all" button */}
        <Divider sx={{ borderStyle: "dashed" }} />
        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            disableRipple
            color="inherit"
            sx={{
              borderRadius: 1.5,
              textTransform: "none",
              fontWeight: 500,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            Voir toutes les notifications
          </Button>
        </Box>
      </Popover>
    </>
  );
}
