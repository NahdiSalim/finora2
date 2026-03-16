import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import CircleIcon from "@mui/icons-material/Circle";
import dayjs from "dayjs";

import type { Conversation } from "../data/types";

type ConversationItemProps = {
  conversation: Conversation;
  selected: boolean;
  onClick: () => void;
};

const getConversationDateLabel = (
  fullDate: string,
  time?: string,
  nowRef?: dayjs.Dayjs,
) => {
  const date = dayjs(fullDate);
  const now = nowRef ?? dayjs();

  // Pendant la même minute exacte que l'envoi
  if (date.isSame(now, "minute")) {
    return "Now";
  }

  // Même jour mais plus la même minute => afficher l'heure du message, figée
  if (date.isSame(now, "day")) {
    return time || "Today";
  }

  // Sinon autre jour
  return date.format("DD MMM");
};

export default function ConversationItem({
  conversation,
  selected,
  onClick,
}: ConversationItemProps) {
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
        gap: 1.5,
        px: 1.5,
        py: 1.35,
        minHeight: 84,
        borderRadius: "14px",
        cursor: "pointer",
        backgroundColor: selected ? "#EEF4FF" : "#FFFFFF",
        border: selected ? "1px solid #DCE8FF" : "1px solid transparent",
        transition: "all 0.2s ease",
        overflow: "hidden",
        "&:hover": {
          backgroundColor: selected ? "#EEF4FF" : "#F8FAFC",
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
              backgroundColor: "#2F6BFF",
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
            width: 48,
            height: 48,
            fontSize: 18,
            bgcolor: conversation.avatarColor,
            color: conversation.avatarTextColor,
            fontWeight: 700,
          }}
        >
          {conversation.avatar}
        </Avatar>

        {conversation.online && (
          <CircleIcon
            sx={{
              position: "absolute",
              right: 1,
              bottom: 1,
              fontSize: 10,
              color: "#22C55E",
              backgroundColor: "#FFFFFF",
              borderRadius: "50%",
              boxShadow: "0 0 0 2px #FFFFFF",
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
            mb: 0.2,
          }}
        >
          <Typography
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: 15,
              color: "#344054",
              lineHeight: 1.2,
              minWidth: 0,
              flex: 1,
            }}
          >
            {conversation.name}
          </Typography>

          <Typography
            sx={{
              whiteSpace: "nowrap",
              color: "#98A2B3",
              fontSize: 12,
              lineHeight: 1.2,
              fontWeight: 400,
              flexShrink: 0,
              pt: 0.1,
            }}
          >
            {displayDate}
          </Typography>
        </Box>

        <Typography
          noWrap
          sx={{
            color: "#98A2B3",
            fontSize: 12,
            lineHeight: 1.25,
            mb: 0.55,
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
              color: "#667085",
              fontSize: 13,
              lineHeight: 1.3,
              minWidth: 0,
              flex: 1,
            }}
          >
            {conversation.preview}
          </Typography>

          {!!conversation.unreadCount && conversation.unreadCount > 0 && (
            <Box
              sx={{
                minWidth: 22,
                height: 22,
                px: 0.75,
                borderRadius: "999px",
                backgroundColor: "#FF8A00",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Typography
                sx={{
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {conversation.unreadCount}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}
