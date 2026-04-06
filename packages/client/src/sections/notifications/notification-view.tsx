import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Avatar,
  Stack,
  Skeleton,
  Badge,
  Paper,
  Chip,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  CheckCheck,
  FileText,
  MessageSquare,
  UserPlus,
  Calendar,
  Bell,
  File,
  InboxIcon,
} from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import { Scrollbar } from "src/components/scrollbar";
import { useAlert } from "src/contexts/AlertContext";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import {
  useGetNotificationsQuery,
  useMarkAllNotificationsAsReadMutation,
  useMarkNotificationAsReadMutation,
} from "src/lib/services/notificationsApi";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";
import "dayjs/locale/fr";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(isYesterday);
dayjs.locale("fr");

// ─── Animation Variants ───────────────────────────────────────────────────────

const listVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.04 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: "easeOut" },
  },
  exit: { opacity: 0, x: -16, transition: { duration: 0.18 } },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface NotificationAttachment {
  id: number;
  fileName: string;
  fileType: string;
  url: string;
}

interface NotificationActor {
  id: number;
  firstName: string;
  lastName: string;
  avatar?: string;
  type: "client" | "accountant" | "system";
}

interface Notification {
  id: number;
  type: string;
  actor: NotificationActor;
  title: string;
  message: string;
  targetTitle?: string;
  attachment?: NotificationAttachment;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface NotificationGroup {
  label: string;
  notifications: Notification[];
}

// ─── Config Maps ──────────────────────────────────────────────────────────────

const NOTIFICATION_ICON_MAP: Record<string, React.ReactNode> = {
  invitation_accepted: <UserPlus size={14} />,
  relationship_invitation: <UserPlus size={14} />,
  meeting_updated: <Calendar size={14} />,
  file_attached: <FileText size={14} />,
  comment_added: <MessageSquare size={14} />,
  task_assigned: <Check size={14} />,
  request_created: <Bell size={14} />,
};

const NOTIFICATION_COLOR_KEY: Record<
  string,
  "success" | "warning" | "info" | "primary" | "secondary" | "error"
> = {
  invitation_accepted: "success",
  relationship_invitation: "success",
  meeting_updated: "warning",
  file_attached: "info",
  comment_added: "primary",
  task_assigned: "secondary",
  request_created: "primary",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeParseJson(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "object" && !Array.isArray(value))
    return value as Record<string, unknown>;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

function normalizeNotification(raw: Record<string, unknown>): Notification {
  const data = safeParseJson(raw.data);
  return {
    id: Number(raw.id),
    type: String(raw.type ?? "default").toLowerCase(),
    actor: (raw.actor as NotificationActor) ?? {
      id: Number(raw.userId ?? 0),
      firstName: String(raw.actorFirstName ?? raw.userFirstName ?? "System"),
      lastName: String(raw.actorLastName ?? raw.userLastName ?? ""),
      type: (raw.actorType as NotificationActor["type"]) ?? "system",
    },
    title: String(raw.title ?? "Notification"),
    message: String(raw.message ?? ""),
    targetTitle:
      (raw.targetTitle as string | undefined) ??
      (data.targetTitle as string | undefined),
    attachment: raw.attachment as NotificationAttachment | undefined,
    read: Boolean(raw.read),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    metadata: data,
  };
}

function groupNotifications(
  notifications: Notification[],
): NotificationGroup[] {
  const groups: NotificationGroup[] = [];
  const today: Notification[] = [];
  const yesterday: Notification[] = [];
  const earlier: Notification[] = [];

  for (const n of notifications) {
    const d = dayjs(n.createdAt);
    if (d.isToday()) today.push(n);
    else if (d.isYesterday()) yesterday.push(n);
    else earlier.push(n);
  }

  if (today.length) groups.push({ label: "Aujourd'hui", notifications: today });
  if (yesterday.length)
    groups.push({ label: "Hier", notifications: yesterday });
  if (earlier.length)
    groups.push({ label: "Plus tôt", notifications: earlier });
  return groups;
}

function formatTimeDisplay(createdAt: string): string {
  const d = dayjs(createdAt);
  if (d.isToday()) return `Aujourd'hui à ${d.format("HH:mm")}`;
  if (d.isYesterday()) return `Hier à ${d.format("HH:mm")}`;
  return d.fromNow();
}

function getActorInitials(actor: NotificationActor): string {
  return `${actor.firstName.charAt(0)}${actor.lastName.charAt(0)}`.toUpperCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface NotificationIconBadgeProps {
  type: string;
  actor: NotificationActor;
  read: boolean;
}

function NotificationIconBadge({
  type,
  actor,
  read,
}: NotificationIconBadgeProps) {
  const theme = useTheme();
  const colorKey = NOTIFICATION_COLOR_KEY[type] ?? "primary";
  const color = theme.palette[colorKey].main;
  const icon = NOTIFICATION_ICON_MAP[type] ?? <Bell size={14} />;

  return (
    <Badge
      overlap="circular"
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      badgeContent={
        <Box
          sx={{
            width: 20,
            height: 20,
            borderRadius: "50%",
            backgroundColor: color,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            border: `2px solid ${theme.palette.background.paper}`,
            boxShadow: `0 2px 6px ${alpha(color, 0.4)}`,
          }}
        >
          {icon}
        </Box>
      }
    >
      <Avatar
        src={actor.avatar}
        sx={{
          width: 42,
          height: 42,
          background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
          fontSize: 14,
          fontWeight: 700,
          boxShadow: read ? "none" : `0 0 0 3px ${alpha(color, 0.12)}`,
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        }}
      >
        {getActorInitials(actor)}
      </Avatar>
    </Badge>
  );
}

interface NotificationBodyProps {
  notification: Notification;
}

function NotificationBody({ notification }: NotificationBodyProps) {
  const theme = useTheme();
  const {
    type,
    actor,
    targetTitle,
    message,
    title,
    attachment,
    read,
    createdAt,
  } = notification;
  const actorName = `${actor.firstName} ${actor.lastName}`;
  const timeDisplay = formatTimeDisplay(createdAt);

  const renderText = () => {
    switch (type) {
      case "invitation_accepted":
      case "relationship_invitation":
        return (
          <span>
            <strong>{actorName}</strong>{" "}
            <span>{message || "a accepté votre invitation."}</span>
          </span>
        );
      case "meeting_updated":
        return (
          <span>
            <strong>{actorName}</strong>{" "}
            <span>
              a mis à jour la réunion
              {targetTitle ? (
                <>
                  {" "}
                  <strong>{targetTitle}</strong>
                </>
              ) : (
                ""
              )}
              .
            </span>
          </span>
        );
      case "file_attached":
        return (
          <span>
            <strong>{actorName}</strong>{" "}
            <span>
              a joint un fichier à <strong>{targetTitle || title}</strong>.
            </span>
          </span>
        );
      case "comment_added":
        return (
          <span>
            <strong>{actorName}</strong>{" "}
            <span>
              a ajouté un commentaire
              {targetTitle ? (
                <>
                  {" "}
                  sur <strong>{targetTitle}</strong>
                </>
              ) : (
                ""
              )}
              .
            </span>
          </span>
        );
      case "task_assigned":
        return (
          <span>
            <strong>{actorName}</strong>{" "}
            <span>
              vous a assigné une tâche
              {targetTitle ? (
                <>
                  {" "}
                  : <strong>{targetTitle}</strong>
                </>
              ) : (
                ""
              )}
              .
            </span>
          </span>
        );
      default:
        return (
          <span>
            <strong>{actorName}</strong> <span>{message || title}</span>
          </span>
        );
    }
  };

  return (
    <Box sx={{ flex: 1, minWidth: 0, pl: read ? 0 : 0.5 }}>
      {/* Main text */}
      <Typography
        variant="body2"
        sx={{
          lineHeight: 1.55,
          color: "text.primary",
          "& strong": { fontWeight: 700, color: "text.primary" },
          "& span": { color: "text.secondary" },
        }}
      >
        {renderText()}
      </Typography>

      {/* Timestamp */}
      <Typography
        variant="caption"
        sx={{
          display: "block",
          mt: 0.4,
          color: !read ? "primary.main" : "text.disabled",
          fontWeight: !read ? 600 : 400,
          fontSize: "0.7rem",
          letterSpacing: 0.2,
        }}
      >
        {timeDisplay}
      </Typography>

      {/* Attachment chip */}
      {attachment && (
        <Paper
          component="a"
          href={attachment.url}
          target="_blank"
          rel="noopener noreferrer"
          elevation={0}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            mt: 1.25,
            px: 1.25,
            py: 0.75,
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            backgroundColor: alpha(theme.palette.background.default, 0.7),
            textDecoration: "none",
            cursor: "pointer",
            transition: "background-color 0.15s ease, border-color 0.15s ease",
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.05),
              borderColor: alpha(theme.palette.primary.main, 0.3),
            },
          }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <Box
            sx={{
              width: 28,
              height: 28,
              borderRadius: 1.5,
              backgroundColor: alpha(theme.palette.error.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.palette.error.main,
              flexShrink: 0,
            }}
          >
            <File size={14} />
          </Box>
          <Typography
            variant="caption"
            fontWeight={600}
            noWrap
            sx={{ maxWidth: 200, color: "text.primary" }}
          >
            {attachment.fileName}
          </Typography>
        </Paper>
      )}

      {/* Quoted message */}
      {message &&
        !["relationship_invitation", "invitation_accepted"].includes(type) && (
          <Box
            sx={{
              mt: 1.25,
              pl: 1.5,
              py: 0.5,
              borderLeft: `3px solid ${alpha(theme.palette.primary.main, 0.3)}`,
              borderRadius: "0 4px 4px 0",
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontStyle: "italic", lineHeight: 1.6, display: "block" }}
            >
              «{message}»
            </Typography>
          </Box>
        )}
    </Box>
  );
}

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

function NotificationItem({
  notification,
  onMarkAsRead,
}: NotificationItemProps) {
  const theme = useTheme();
  const colorKey = NOTIFICATION_COLOR_KEY[notification.type] ?? "primary";
  const accentColor = theme.palette[colorKey].main;

  return (
    <motion.div variants={itemVariants} layout>
      <Box
        onClick={() => onMarkAsRead(notification.id)}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1.75,
          px: 2,
          py: 1.75,
          borderRadius: 2.5,
          position: "relative",
          cursor: "pointer",
          overflow: "hidden",
          backgroundColor: notification.read
            ? "transparent"
            : alpha(accentColor, 0.045),
          transition: "all 0.2s ease",
          "&:hover": {
            backgroundColor: alpha(accentColor, 0.08),
            "& .notification-actions": { opacity: 1 },
          },
          "&::before": !notification.read
            ? {
                content: '""',
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: 3,
                height: "50%",
                borderRadius: "0 2px 2px 0",
                backgroundColor: accentColor,
              }
            : {},
        }}
      >
        <NotificationIconBadge
          type={notification.type}
          actor={notification.actor}
          read={notification.read}
        />
        <NotificationBody notification={notification} />

        {/* Unread dot */}
        {!notification.read && (
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: accentColor,
              flexShrink: 0,
              mt: 0.75,
              boxShadow: `0 0 0 3px ${alpha(accentColor, 0.2)}`,
            }}
          />
        )}
      </Box>
    </motion.div>
  );
}

// ─── Skeleton Loader ──────────────────────────────────────────────────────────

function NotificationSkeleton() {
  return (
    <Stack spacing={1.5} sx={{ px: 2, py: 1 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Box
          key={i}
          sx={{ display: "flex", gap: 1.75, alignItems: "flex-start" }}
        >
          <Skeleton variant="circular" width={42} height={42} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="60%" height={16} />
            <Skeleton variant="text" width="85%" height={14} sx={{ mt: 0.5 }} />
            <Skeleton variant="text" width="30%" height={12} sx={{ mt: 0.5 }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isUnread }: { isUnread: boolean }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 10,
        gap: 2,
      }}
    >
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          backgroundColor: alpha(theme.palette.grey[500], 0.07),
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: theme.palette.grey[400],
          border: `1.5px dashed ${alpha(theme.palette.grey[400], 0.4)}`,
        }}
      >
        {isUnread ? <CheckCheck size={28} /> : <InboxIcon size={28} />}
      </Box>
      <Typography variant="body2" color="text.secondary" fontWeight={500}>
        {isUnread ? "Vous êtes à jour !" : "Aucune notification pour l'instant"}
      </Typography>
      <Typography
        variant="caption"
        color="text.disabled"
        textAlign="center"
        maxWidth={220}
      >
        {isUnread
          ? "Toutes vos notifications ont été lues."
          : "Les nouvelles activités apparaîtront ici."}
      </Typography>
    </Box>
  );
}

// ─── Group Header ─────────────────────────────────────────────────────────────

function GroupHeader({ label, count }: { label: string; count: number }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        mb: 1,
        mt: 0.5,
      }}
    >
      <Typography
        variant="overline"
        sx={{
          fontWeight: 700,
          fontSize: "0.65rem",
          letterSpacing: 1.2,
          color: "text.disabled",
        }}
      >
        {label}
      </Typography>
      <Chip
        label={count}
        size="small"
        sx={{
          height: 18,
          fontSize: "0.65rem",
          fontWeight: 700,
          backgroundColor: alpha(theme.palette.primary.main, 0.1),
          color: "primary.main",
          "& .MuiChip-label": { px: 0.75 },
        }}
      />
      <Box
        sx={{
          flex: 1,
          height: "1px",
          backgroundColor: alpha(theme.palette.divider, 0.4),
        }}
      />
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NotificationsView() {
  const theme = useTheme();
  const { showAlert } = useAlert();
  const [, setSearchParams] = useSearchParams();
  const [selectedTab, setSelectedTab] = useState<"all" | "unread">("all");

  const {
    data: notificationsData,
    refetch: refetchNotifications,
    isLoading,
    isError,
  } = useGetNotificationsQuery(
    { limit: 100, offset: 0 },
    { refetchOnFocus: true, refetchOnReconnect: true },
  );

  const [markAsRead] = useMarkNotificationAsReadMutation();
  const [markAllAsRead] = useMarkAllNotificationsAsReadMutation();

  // Normalize raw API data once
  const notifications = useMemo<Notification[]>(() => {
    const source = notificationsData?.notifications ?? [];
    return (source as unknown as Record<string, unknown>[]).map(
      normalizeNotification,
    );
  }, [notificationsData]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const filteredNotifications = useMemo(
    () =>
      selectedTab === "unread"
        ? notifications.filter((n) => !n.read)
        : notifications,
    [notifications, selectedTab],
  );

  const groupedNotifications = useMemo(
    () => groupNotifications(filteredNotifications),
    [filteredNotifications],
  );

  const handleTabChange = useCallback(
    (tabId: string) => {
      const tab = tabId as "all" | "unread";
      setSelectedTab(tab);
      setSearchParams({ tab });
    },
    [setSearchParams],
  );

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead().unwrap();
      showAlert(
        "Toutes les notifications ont été marquées comme lues",
        "success",
      );
      // RTK Query cache invalidation should handle the refetch; explicit call as safety net
      refetchNotifications();
    } catch {
      showAlert("Erreur lors du marquage des notifications", "error");
    }
  }, [markAllAsRead, showAlert, refetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (id: number) => {
      // Find the notification — skip API call if already read
      const notification = notifications.find((n) => n.id === id);
      if (!notification || notification.read) return;
      try {
        await markAsRead(id).unwrap();
        refetchNotifications();
      } catch {
        // Silent fail — non-critical action
      }
    },
    [markAsRead, notifications, refetchNotifications],
  );

  // ── Page actions ──────────────────────────────────────────────────────────
  const pageActions =
    unreadCount > 0
      ? [
          {
            label: "Tout marquer comme lu",
            icon: <CheckCheck size={16} />,
            onClick: handleMarkAllAsRead,
            variant: "outlined" as const,
            color: "primary" as const,
            sx: {
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 600,
              fontSize: "0.8rem",
              borderWidth: 1.5,
              "&:hover": {
                borderWidth: 1.5,
                backgroundColor: alpha(theme.palette.primary.main, 0.07),
              },
            },
          },
        ]
      : [];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <PageHeader
      title="Notifications"
      caption="Gérez vos notifications et restez informé"
      actions={pageActions}
    >
      <Box>
        <FolderTabNavigation
          tabs={[
            { id: "all", label: "Tout", count: notifications.length },
            { id: "unread", label: "Non lues", count: unreadCount },
          ]}
          activeTab={selectedTab}
          onTabChange={handleTabChange}
        />

        <Box
          sx={{
            bgcolor: alpha(theme.palette.background.paper, 0.96),
            backdropFilter: "blur(16px)",
            borderRadius: "0 12px 12px 12px",
            boxShadow: `0 4px 24px ${alpha(theme.palette.common.black, 0.05)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.45)}`,
            overflow: "hidden",
          }}
        >
          <Scrollbar sx={{ maxHeight: "calc(100vh - 270px)" }}>
            <Box sx={{ py: 2 }}>
              {isLoading ? (
                <NotificationSkeleton />
              ) : isError ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="body2" color="error">
                    Impossible de charger les notifications.
                  </Typography>
                </Box>
              ) : filteredNotifications.length === 0 ? (
                <EmptyState isUnread={selectedTab === "unread"} />
              ) : (
                <AnimatePresence mode="popLayout">
                  <motion.div
                    variants={listVariants}
                    initial="hidden"
                    animate="visible"
                  >
                    {groupedNotifications.map((group) => (
                      <Box key={group.label} sx={{ mb: 2 }}>
                        <GroupHeader
                          label={group.label}
                          count={group.notifications.length}
                        />
                        <Stack spacing={0.25}>
                          {group.notifications.map((notification) => (
                            <NotificationItem
                              key={notification.id}
                              notification={notification}
                              onMarkAsRead={handleMarkAsRead}
                            />
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </motion.div>
                </AnimatePresence>
              )}
            </Box>
          </Scrollbar>
        </Box>
      </Box>
    </PageHeader>
  );
}
