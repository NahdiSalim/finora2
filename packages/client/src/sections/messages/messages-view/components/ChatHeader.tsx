import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CircleIcon from "@mui/icons-material/Circle";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";

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
            {conversation?.avatar}
          </Avatar>

          {conversation?.online && (
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
