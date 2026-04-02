import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import AvatarGroup from "@mui/material/AvatarGroup";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CircleIcon from "@mui/icons-material/Circle";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";
import { Users, Phone, Video } from "lucide-react";
import { useGlobalCall } from "src/contexts/GlobalCallContext";

import type { Conversation } from "../data/types";

type ChatHeaderProps = {
  conversation?: Conversation;
  onOpenMedia?: () => void;
  onBack?: () => void;
};

export default function ChatHeader({
  conversation,
  onOpenMedia,
  onBack,
}: ChatHeaderProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { initiateCall } = useGlobalCall();

  const handleStartCall = (type: "audio" | "video") => {
    if (!conversation) return;

    const participants = [];

    if (conversation.isGroup && conversation.members) {
      participants.push(
        ...conversation.members.map((m) => ({
          id: m.id,
          name: m.name,
          avatar: m.avatar,
        })),
      );
    } else if (conversation.participantId) {
      participants.push({
        id: conversation.participantId,
        name: conversation.name,
        avatar: conversation.avatar,
      });
    }

    if (participants.length === 0) {
      console.error("[ChatHeader] No participants found for call");
      return;
    }

    initiateCall(
      conversation.id,
      type,
      participants,
      conversation.name,
      conversation.isGroup || false,
    );
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: isMobile ? 1 : 2,
        minHeight: isMobile ? 52 : 64,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 1 : 1.5,
          minWidth: 0,
          flex: 1,
        }}
      >
        {isMobile && (
          <IconButton
            onClick={onBack}
            sx={{
              width: 32,
              height: 32,
              color: (theme.palette.grey as any)[1000],
              ml: -0.25,
              flexShrink: 0,
            }}
          >
            <ArrowBackIosNewRoundedIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}

        <Box
          sx={{
            position: "relative",
            flexShrink: 0,
          }}
        >
          <Avatar
            sx={{
              width: isMobile ? 40 : 48,
              height: isMobile ? 40 : 48,
              bgcolor: conversation?.avatarColor,
              color: conversation?.avatarTextColor,
              fontWeight: 700,
              fontSize: isMobile ? 16 : 18,
            }}
          >
            {conversation?.isGroup ? (
              <Users size={isMobile ? 20 : 24} />
            ) : (
              conversation?.avatar
            )}
          </Avatar>

          {conversation?.online && !conversation?.isGroup && (
            <CircleIcon
              sx={{
                position: "absolute",
                bottom: 1,
                right: 1,
                fontSize: isMobile ? 9 : 10,
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
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Typography
            noWrap
            sx={{
              fontWeight: 600,
              fontSize: isMobile ? 15 : 16,
              color: (theme.palette.grey as any)[1000],
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {conversation?.name}
          </Typography>

          {/* Group: Show member avatars */}
          {conversation?.isGroup && conversation.members ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 0.5,
              }}
            >
              <AvatarGroup
                max={4}
                sx={{
                  "& .MuiAvatar-root": {
                    width: isMobile ? 20 : 22,
                    height: isMobile ? 20 : 22,
                    fontSize: 10,
                    fontWeight: 600,
                    border: `1.5px solid ${theme.palette.background.paper}`,
                  },
                }}
              >
                {conversation.members.map((member) => {
                  const roleColor =
                    member.role === "client"
                      ? theme.palette.primary.main
                      : theme.palette.secondary.main;
                  return (
                    <Avatar
                      key={member.id}
                      sx={{
                        bgcolor: alpha(roleColor, 0.2),
                        color: roleColor,
                      }}
                    >
                      {member.avatar.charAt(0)}
                    </Avatar>
                  );
                })}
              </AvatarGroup>
              <Typography
                sx={{
                  color: theme.palette.info.light,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 400,
                }}
              >
                {conversation.memberCount} membres
              </Typography>
            </Box>
          ) : (
            <Typography
              noWrap
              sx={{
                color: theme.palette.info.light,
                fontSize: isMobile ? 12 : 13,
                lineHeight: 1.35,
                mt: 0.25,
                fontWeight: 400,
              }}
            >
              {conversation?.role}
            </Typography>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          flexShrink: 0,
        }}
      >
        {/* Call buttons - For both 1:1 and group conversations */}
        {conversation && (
          <>
            <IconButton
              onClick={() => handleStartCall("audio")}
              sx={{
                width: isMobile ? 34 : 40,
                height: isMobile ? 34 : 40,
                border: "1px solid",
                borderColor: theme.palette.success.main,
                borderRadius: "10px",
                color: theme.palette.success.main,
                backgroundColor: theme.palette.common.white,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.success.main, 0.08),
                  borderColor: theme.palette.success.main,
                },
              }}
            >
              <Phone size={isMobile ? 16 : 18} />
            </IconButton>

            <IconButton
              onClick={() => handleStartCall("video")}
              sx={{
                width: isMobile ? 34 : 40,
                height: isMobile ? 34 : 40,
                border: "1px solid",
                borderColor: theme.palette.info.main,
                borderRadius: "10px",
                color: theme.palette.info.main,
                backgroundColor: theme.palette.common.white,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.info.main, 0.08),
                  borderColor: theme.palette.info.main,
                },
              }}
            >
              <Video size={isMobile ? 16 : 18} />
            </IconButton>
          </>
        )}

        <IconButton
          onClick={onOpenMedia}
          sx={{
            width: isMobile ? 34 : 40,
            height: isMobile ? 34 : 40,
            border: "1px solid",
            borderColor: theme.palette.primary.main,
            borderRadius: "10px",
            color: theme.palette.primary.main,
            backgroundColor: theme.palette.common.white,
            "&:hover": {
              backgroundColor: theme.palette.primary.lighter,
              borderColor: theme.palette.primary.main,
            },
          }}
        >
          <ImageOutlinedIcon
            sx={{ fontSize: isMobile ? 16 : 18, color: "inherit" }}
          />
        </IconButton>
      </Box>
    </Box>
  );
}
