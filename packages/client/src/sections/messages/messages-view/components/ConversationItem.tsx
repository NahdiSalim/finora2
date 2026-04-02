import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CircleIcon from "@mui/icons-material/Circle";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";
import { Settings, Users } from "lucide-react";
import dayjs from "dayjs";

import type { Conversation } from "../data/types";

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
  showManageButton?: boolean;
  onManage?: () => void;
};

const getConversationDateLabel = (
  fullDate: string | null | undefined,
  time?: string,
  nowRef?: dayjs.Dayjs,
) => {
  if (!fullDate) return "";
  const date = dayjs(fullDate);
  if (!date.isValid()) return "";

  const now = nowRef ?? dayjs();

  if (date.isSame(now, "minute")) {
    return "Now";
  }

  if (date.isSame(now, "day")) {
    return time || "Today";
  }

  return date.format("DD MMM");
};

export default function ConversationItem({
  conversation,
  selected,
  onClick,
  showManageButton = false,
  onManage,
}: ConversationItemProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(dayjs());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const displayDate = useMemo(() => {
    return getConversationDateLabel(
      conversation.fullDate,
      conversation.time,
      now,
    );
  }, [conversation.fullDate, conversation.time, now]);

  return (
    <Box
      onClick={onClick}
      sx={{
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 1.25 : 1.5,
        px: isMobile ? 1.5 : 2,
        py: isMobile ? 1.4 : 1.75,
        minHeight: isMobile ? 86 : 88,
        borderRadius: isMobile ? "14px" : "14px",
        cursor: "pointer",
        backgroundColor: selected
          ? theme.palette.primary.lighter
          : theme.palette.common.white,
        border: "1px solid",
        borderColor: selected ? theme.palette.primary.light : "transparent",
        transition: "all 0.2s ease",
        overflow: "hidden",
        "&:hover": {
          backgroundColor: selected
            ? theme.palette.primary.lighter
            : theme.palette.grey[100],
        },
        "&::before": selected
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              top: 10,
              bottom: 10,
              width: "3px",
              borderRadius: "999px",
              backgroundColor: theme.palette.primary.main,
            }
          : undefined,
      }}
    >
      <Box
        sx={{
          position: "relative",
          flexShrink: 0,
        }}
      >
        <Avatar
          sx={{
            width: isMobile ? 48 : 48,
            height: isMobile ? 48 : 48,
            fontSize: isMobile ? 18 : 18,
            bgcolor: conversation.avatarColor,
            color: conversation.avatarTextColor,
            fontWeight: 700,
          }}
        >
          {conversation.isGroup ? <Users size={22} /> : conversation.avatar}
        </Avatar>

        {conversation.online && !conversation.isGroup && (
          <CircleIcon
            sx={{
              position: "absolute",
              right: 1,
              bottom: 1,
              fontSize: isMobile ? 10 : 10,
              color: "#22C55E",
              backgroundColor: theme.palette.common.white,
              borderRadius: "50%",
              boxShadow: `0 0 0 2px ${theme.palette.common.white}`,
            }}
          />
        )}
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.25,
          }}
        >
          <Typography
            noWrap
            sx={{
              minWidth: 0,
              flex: 1,
              fontWeight: 600,
              fontSize: isMobile ? 15.5 : 16,
              lineHeight: isMobile ? "20px" : "20px",
              color: (theme.palette.grey as any)[1000],
            }}
          >
            {conversation.name}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <Typography
              sx={{
                flexShrink: 0,
                whiteSpace: "nowrap",
                color: theme.palette.info.light,
                fontSize: isMobile ? 12 : 12,
                fontWeight: 400,
                lineHeight: "18px",
              }}
            >
              {displayDate}
            </Typography>
            {conversation.unreadCount > 0 && (
              <Box
                sx={{
                  minWidth: 20,
                  height: 20,
                  px: 0.75,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10px",
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.common.white,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {conversation.unreadCount}
              </Box>
            )}
          </Box>
        </Box>

        <Typography
          noWrap
          sx={{
            color: theme.palette.info.light,
            fontSize: isMobile ? 12 : 12,
            fontWeight: 400,
            lineHeight: "18px",
            mb: 0.45,
          }}
        >
          {conversation.role}
        </Typography>

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
              minWidth: 0,
              flex: 1,
              color: theme.palette.grey[800],
              fontSize: isMobile ? 13.5 : 13,
              fontWeight: 400,
              lineHeight: "18px",
            }}
          >
            {conversation.preview}
          </Typography>

          {/* Group Management Button */}
          {conversation.isGroup && showManageButton && onManage && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onManage();
              }}
              sx={{
                width: 28,
                height: 28,
                color: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                },
              }}
            >
              <Settings size={16} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}
