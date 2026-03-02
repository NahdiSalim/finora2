import React from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import { Camera, Pencil } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";

export interface ProfileHeaderProps {
  coverImage?: string;
  avatarImage?: string;
  name: string;
  subtitle?: string;
  onEditCover?: () => void;
  onEditAvatar?: () => void;
  onEditProfile?: () => void;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  coverImage,
  avatarImage,
  name,
  subtitle,
  onEditCover,
  onEditAvatar,
  onEditProfile,
}) => {
  const theme = useTheme();

  return (
    <Box sx={{ width: "100%" }}>
      {/* Cover Section */}
      <Box
        sx={{
          position: "relative",
          height: { xs: 120, sm: 180, md: 200 },
          borderRadius: 3,
          overflow: "hidden",
          backgroundColor: theme.palette.grey[200],
          backgroundImage: coverImage ? `url(${coverImage})` : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark overlay */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(to bottom, ${alpha(
              "#000",
              0.1,
            )}, ${alpha("#000", 0.5)})`,
          }}
        />

        {/* Edit Cover Button */}
        {onEditCover && (
          <IconButton
            onClick={onEditCover}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              backgroundColor: alpha("#fff", 0.85),
              "&:hover": {
                backgroundColor: "#fff",
              },
            }}
          >
            <Camera size={18} />
          </IconButton>
        )}
      </Box>

      {/* Profile Info Section */}
      <Box
        sx={{
          position: "relative",
          px: { xs: 2, sm: 4 },
          pb: 3,
          mt: -6,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          {/* Avatar */}
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={avatarImage}
              variant="rounded"
              sx={{
                width: { xs: 90, sm: 120 },
                height: { xs: 90, sm: 120 },
                borderRadius: 3,
                border: `4px solid ${theme.palette.background.paper}`,
                boxShadow: theme.shadows[4],
                backgroundColor: theme.palette.grey[300],
              }}
            />

            {onEditAvatar && (
              <IconButton
                size="small"
                onClick={onEditAvatar}
                sx={{
                  position: "absolute",
                  bottom: 8,
                  right: 8,
                  backgroundColor: theme.palette.background.paper,
                  boxShadow: theme.shadows[2],
                  "&:hover": {
                    backgroundColor: theme.palette.grey[100],
                  },
                }}
              >
                <Camera size={16} />
              </IconButton>
            )}
          </Box>

          {/* Name + Subtitle */}
          <Box sx={{ flex: 1, mt: 8 }}>
            <Typography variant="h5" fontWeight={700}>
              {name}
            </Typography>

            {subtitle && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {/* Edit Profile Button */}
          {onEditProfile && (
            <CustomButton
              size="large"
              startIcon={<Pencil />}
              onClick={onEditProfile}
              sx={{
                mt: 8,
                alignSelf: { xs: "flex-start", sm: "center" },
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Modifier
            </CustomButton>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default ProfileHeader;
