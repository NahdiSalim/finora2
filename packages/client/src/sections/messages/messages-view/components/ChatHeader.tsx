import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Avatar from "@mui/material/Avatar";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import CircleIcon from "@mui/icons-material/Circle";

import CustomButton from "../../../../components/common/CustomButton";

import type { Conversation } from "../data/types";

type ChatHeaderProps = {
  conversation?: Conversation;
  onOpenMedia?: () => void;
};

export default function ChatHeader({
  conversation,
  onOpenMedia,
}: ChatHeaderProps) {
  const handleViewProfile = () => {
    console.log("View profile clicked", conversation);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        minHeight: 64,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: 0,
          flex: 1,
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
              bgcolor: conversation?.avatarColor,
              color: conversation?.avatarTextColor,
              fontWeight: 700,
              fontSize: 18,
            }}
          >
            {conversation?.avatar}
          </Avatar>

          {conversation?.online && (
            <CircleIcon
              sx={{
                position: "absolute",
                bottom: 2,
                right: 2,
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
              fontSize: 16,
              color: "#101828",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            {conversation?.name}
          </Typography>

          <Typography
            noWrap
            sx={{
              color: "#98A2B3",
              fontSize: 13,
              lineHeight: 1.4,
              mt: 0.4,
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
          gap: 1,
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={onOpenMedia}
          sx={{
            width: 40,
            height: 40,
            border: "1px solid #2E6BFF",
            borderRadius: "12px",
            color: "#2E6BFF",
            backgroundColor: "#FFFFFF",
            "&:hover": {
              backgroundColor: "#F5F8FF",
              borderColor: "#2E6BFF",
            },
          }}
        >
          <ImageOutlinedIcon sx={{ fontSize: 18, color: "inherit" }} />
        </IconButton>

        <CustomButton
          variant="outlined"
          color="primary"
          onClick={handleViewProfile}
          sx={{
            height: 40,
            minWidth: 0,
            px: 1.8,
            borderRadius: "12px",
            fontSize: 12.5,
            fontWeight: 600,
            whiteSpace: "nowrap",
            boxShadow: "none",
            backgroundColor: "#FFFFFF",
            color: "#2E6BFF",
            borderColor: "#2E6BFF",
            "&:hover": {
              backgroundColor: "#F5F8FF",
              borderColor: "#2E6BFF",
              boxShadow: "none",
            },
          }}
        >
          Voir le profil
        </CustomButton>
      </Box>
    </Box>
  );
}
