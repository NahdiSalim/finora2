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
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  MessageCircle,
  Power,
  MoreVertical,
  ArchiveRestore,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import CustomButton from "./CustomButton";
import { useNavigate } from "react-router-dom";

type UserCardProps = {
  id: string | number;
  cover?: string;
  avatar?: string;
  name: string;
  email: string;
  ownerFirstName: string;
  ownerLastName: string;
  processedDocs: number;
  pendingDocs: number;
  archived?: boolean;
  onChat?: (e: React.MouseEvent) => void;
  onDeactivate?: (e: React.MouseEvent) => void;
  onRestore?: () => void;
  onDelete?: () => void;
  onCardClick?: () => void;
};

// ─── Archived Card ────────────────────────────────────────────────────────────

function ArchivedCard({
  avatar,
  name,
  email,
  processedDocs,
  pendingDocs,
  ownerFirstName,
  ownerLastName,

  onRestore,
  onDelete,
  onCardClick,
}: Omit<UserCardProps, "id" | "cover" | "archived">) {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const totalDocs = processedDocs + pendingDocs;

  const getInitials = (init: string, maxInitials: number = 2): string => {
    if (!init || typeof init !== "string") return "";

    return init
      .trim()
      .split(/\s+/) // Split by any whitespace
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, maxInitials);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setMenuAnchor(e.currentTarget);
  };

  const handleMenuClose = () => setMenuAnchor(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card
        onClick={onCardClick}
        sx={{
          borderRadius: 3,
          bgcolor: theme.palette.grey[50],
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: "none",
          cursor: onCardClick ? "pointer" : "default",
          position: "relative",
          overflow: "visible",
        }}
      >
        {/* 3-dot menu — top right */}
        <Box sx={{ position: "absolute", top: 8, right: 8, zIndex: 1 }}>
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVertical size={18} color={theme.palette.text.secondary} />
          </IconButton>
          <Menu
            anchorEl={menuAnchor}
            open={Boolean(menuAnchor)}
            onClose={handleMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{
              paper: {
                elevation: 2,
                sx: { borderRadius: 2, minWidth: 160 },
              },
            }}
          >
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onRestore?.();
              }}
              sx={{ gap: 1.5 }}
            >
              <ArchiveRestore size={16} />
              <Typography variant="body2">Restaurer</Typography>
            </MenuItem>
            <MenuItem
              onClick={() => {
                handleMenuClose();
                onDelete?.();
              }}
              sx={{ gap: 1.5, color: "error.main" }}
            >
              <Trash2 size={16} />
              <Typography variant="body2" color="error.main">
                Supprimer
              </Typography>
            </MenuItem>
          </Menu>
        </Box>

        <CardContent
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 1,
            pt: 3,
            pb: "16px !important",
          }}
        >
          {/* Avatar */}
          <Avatar
            src={avatar}
            sx={{
              width: 72,
              height: 72,
              border: `3px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[1],
              filter: "grayscale(40%)",
              opacity: 0.85,
            }}
          />

          {/* Name */}
          <Typography
            variant="body1"
            fontWeight={600}
            align="center"
            sx={{ mt: 0.5 }}
          >
            {name}
          </Typography>

          {/* Email */}
          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </Typography>

          <Divider sx={{ width: "100%", my: 0.5 }} />

          {/* Stats chips */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1,
              width: "100%",
            }}
          >
            {ownerFirstName && ownerFirstName.trim() !== "" && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 1,
                  backgroundColor: theme.palette.grey[200],
                  width: "100%",
                }}
              >
                <Tooltip
                  title={`${ownerFirstName} ${ownerLastName || ""}`}
                  arrow
                >
                  <Typography variant="caption">
                    {`${ownerFirstName} ${ownerLastName ? getInitials(ownerLastName) : ""}`}
                  </Typography>
                </Tooltip>
              </Box>
            )}

            <Box
              sx={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 1,
                backgroundColor: theme.palette.grey[200],
                width: "100%",
              }}
            >
              <Tooltip
                title={`${processedDocs}/${totalDocs} docs traités`}
                arrow
              >
                <Typography variant="caption">{`${processedDocs}/${totalDocs} docs traités`}</Typography>
              </Tooltip>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Default Card ─────────────────────────────────────────────────────────────

function DefaultCard({
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
}: Omit<UserCardProps, "archived" | "onRestore" | "onDelete">) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);
  const initials =
    name
      .trim()
      .split(/\s+/)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2) || "CL";

  const handleCardClick = () => {
    if (onCardClick) onCardClick();
    else navigate(`/clients/${id}`);
  };

  const handleChatClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChat?.(e);
  };

  const handleDeactivateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDeactivate?.(e);
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
          transition: "box-shadow 0.2s ease",
          cursor: "pointer",
          "&:active": { transform: "scale(0.98)" },
        }}
      >
        {/* Cover */}
        <Box
          sx={{
            height: 80,
            background: cover
              ? `url(${cover}) center/cover no-repeat`
              : "linear-gradient(135deg, #e8eefc 0%, #d9e6ff 100%)",
          }}
        />

        {/* Avatar */}
        <Box sx={{ display: "flex", justifyContent: "center", mt: -5 }}>
          <Avatar
            src={avatar}
            sx={{
              width: 80,
              height: 80,
              border: `3px solid ${theme.palette.background.paper}`,
              boxShadow: theme.shadows[2],
              background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
            }}
          >
            {!avatar && initials}
          </Avatar>
        </Box>

        <CardContent>
          <Typography
            variant="body1"
            fontWeight={600}
            align="center"
            gutterBottom
          >
            {name}
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            align="center"
            sx={{
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {email}
          </Typography>

          <Divider sx={{ my: 1 }} />

          {/* KPI Row */}
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Box textAlign="center" flex={1}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Traité
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
                En attente
              </Typography>
              <Typography variant="body1" fontWeight={600}>
                {pendingDocs}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          {/* Actions */}
          <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
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

            {onDeactivate && (
              <Tooltip title="Deactivate" arrow>
                <CustomButton
                  variant="outlined"
                  color="error"
                  onClick={handleDeactivateClick}
                  sx={{ minWidth: 44, p: 0 }}
                >
                  <Power size={20} />
                </CustomButton>
              </Tooltip>
            )}
          </Box>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function ClientCard({
  archived = false,
  ...props
}: UserCardProps) {
  if (archived) {
    return <ArchivedCard {...props} />;
  }
  return <DefaultCard {...props} />;
}
