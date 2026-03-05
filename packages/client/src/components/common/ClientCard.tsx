import React, { useState } from "react";
import {
  Card,
  Box,
  Avatar,
  Typography,
  Divider,
  CardContent,
  useTheme,
  Tooltip,
} from "@mui/material";
import { MessageCircle, Power } from "lucide-react";
import { motion } from "framer-motion";
import CustomButton from "./CustomButton";
import { useNavigate } from "react-router-dom";

type UserCardProps = {
  id: string | number;
  cover: string;
  avatar: string;
  name: string;
  email: string;
  processedDocs: number;
  pendingDocs: number;
  onChat?: (e: React.MouseEvent) => void; // Updated to accept event
  onDeactivate?: (e: React.MouseEvent) => void; // Updated to accept event
  onCardClick?: () => void;
};

export default function ClientCard({
  id,
  cover,
  avatar,
  name,
  email,
  processedDocs,
  pendingDocs,
  onChat,
  onDeactivate,
  onCardClick,
}: UserCardProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const handleCardClick = () => {
    if (onCardClick) {
      onCardClick();
    } else {
      // Default navigation to details page
      navigate(`/clients/${id}`);
    }
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onChat) onChat(e); // Pass the event
  };

  const handleDeactivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDeactivate) onDeactivate(e); // Pass the event
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ y: -4 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        onClick={handleCardClick}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: isHovered ? theme.shadows[8] : theme.shadows[2],
          transition: "box-shadow 0.2s ease, transform 0.2s ease",
          cursor: "pointer", // Change cursor to indicate clickability
          position: "relative",
          "&:active": {
            transform: "scale(0.98)", // Subtle press effect
          },
        }}
      >
        {/* Cover */}
        <Box
          sx={{
            height: 80,
            backgroundImage: `url(${cover})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />

        {/* Avatar */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mt: -5,
          }}
        >
          <Avatar
            src={avatar}
            sx={{
              width: 80,
              height: 80,
              border: `3px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[2],
            }}
          />
        </Box>

        <CardContent>
          {/* Name */}
          <Typography
            variant="body1"
            fontWeight={600}
            align="center"
            gutterBottom
          >
            {name}
          </Typography>

          {/* Email */}
          <Typography variant="body2" color="text.secondary" align="center">
            {email}
          </Typography>

          <Divider sx={{ my: 1 }} />

          {/* KPI Row */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Box textAlign="center" flex={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Processed
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {processedDocs}
              </Typography>
            </Box>

            <Divider orientation="vertical" flexItem />

            <Box textAlign="center" flex={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Pending
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {pendingDocs}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Action Buttons */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
            }}
          >
            <Tooltip title="Message" arrow>
              <CustomButton
                onClick={handleChatClick}
                variant="contained"
                color="primary"
                fullWidth
              >
                <MessageCircle size={20} />
                Message
              </CustomButton>
            </Tooltip>

            <Tooltip title="Deactivate" arrow>
              <CustomButton
                variant="outlined"
                color="error"
                onClick={handleDeactivateClick}
                sx={{
                  position: "relative",
                  minWidth: 44,
                  p: 0,
                }}
              >
                <Power size={20} />
              </CustomButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}
