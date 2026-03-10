import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  alpha,
  Tooltip,
} from "@mui/material";
import {
  MoreVertical,
  Archive,
  Trash2,
  Download,
  Share2,
  Edit,
} from "lucide-react";
import FolderEmptySVG from "./FolderEmptySVG";
import FolderHasFilesSVG from "./FolderHasFilesSVG";
import FolderArchivedSVG from "./FolderArchiveSVG";

// ----------------------------------------------------------------------

export type FolderState = "empty" | "hasFiles" | "archived";

export interface FolderProps {
  name: string;
  description?: string;
  state?: FolderState;
  fileCount?: number;
  onClick?: () => void;
  onMenuAction?: (action: string) => void;
  menuOptions?: { label: string; icon: React.ReactNode; action: string }[];
  sx?: any;
}

export function Folder({
  name,
  description,
  state = "empty",
  fileCount,
  onClick,
  onMenuAction,
  menuOptions = [
    { label: "Edit", icon: <Edit size={16} />, action: "edit" },
    { label: "Download", icon: <Download size={16} />, action: "download" },
    { label: "Share", icon: <Share2 size={16} />, action: "share" },
    { label: "Archive", icon: <Archive size={16} />, action: "archive" },
    { label: "Delete", icon: <Trash2 size={16} />, action: "delete" },
  ],
  sx,
}: FolderProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const open = Boolean(anchorEl);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = (event: React.MouseEvent) => {
    event.stopPropagation();
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: string, event: React.MouseEvent) => {
    event.stopPropagation();
    setAnchorEl(null);
    if (onMenuAction) {
      onMenuAction(action);
    }
  };

  const handleFolderClick = () => {
    if (onClick && state !== "archived") {
      onClick();
    }
  };

  // Get the appropriate SVG based on state
  const getFolderSVG = () => {
    switch (state) {
      case "hasFiles":
        return <FolderHasFilesSVG />;
      case "archived":
        return <FolderArchivedSVG />;
      case "empty":
      default:
        return <FolderEmptySVG />;
    }
  };

  // Get state color
  const getStateColor = () => {
    switch (state) {
      case "hasFiles":
        return theme.palette.common.black;
      case "archived":
        return theme.palette.grey[500];
      case "empty":
      default:
        return theme.palette.common.black;
    }
  };

  return (
    <Box
      onClick={handleFolderClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        position: "relative",
        width: 195,
        backgroundColor: "transparent",
        borderRadius: 5,
        opacity: state === "archived" ? 0.7 : 1,
        cursor: state === "archived" ? "default" : "pointer",
        overflow: "hidden",
        ...sx,
      }}
    >
      {/* SVG Container - Background */}
      <Box sx={{ position: "relative", width: "100%", height: "auto" }}>
        {getFolderSVG()}
      </Box>

      {/* Content Container - Positioned absolutely over the SVG */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 8,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 1.5,
        }}
      >
        {/* Top Row with Menu Button */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          {/* 3-dots Menu */}
          <Tooltip title="More options" arrow>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{
                color: getStateColor(),
                bgcolor: alpha(theme.palette.common.white, 0.2),
                backdropFilter: "blur(4px)",
                "&:hover": {
                  bgcolor: alpha(theme.palette.common.white, 0.3),
                },
              }}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Bottom Row with Text */}
        <Box>
          {/* Name and File Count */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              noWrap
              sx={{
                color: getStateColor(),
                maxWidth: 100,
              }}
            >
              {name}
            </Typography>
            {fileCount !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  color: getStateColor(),
                  bgcolor: alpha(theme.palette.common.black, 0.2),
                  backdropFilter: "blur(4px)",
                  px: 0.5,
                  borderRadius: 0.5,
                  fontSize: "0.6rem",
                }}
              >
                {fileCount} {fileCount === 1 ? "Doc" : "Docs"}
              </Typography>
            )}
          </Box>

          {/* Description */}
          {description && (
            <Typography
              variant="caption"
              noWrap
              sx={{
                maxWidth: 150,
                color: getStateColor(),
                opacity: 0.9,
                textShadow: "0 1px 1px rgba(0,0,0,0.1)",
                display: "block",
                mt: 0.25,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Menu Dropdown */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            mt: 0.5,
            minWidth: 150,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        {menuOptions.map((option) => (
          <MenuItem
            key={option.action}
            onClick={(e) => handleMenuItemClick(option.action, e)}
            sx={{
              py: 1,
              px: 1.5,
              color:
                option.action === "delete"
                  ? theme.palette.error.main
                  : "text.primary",
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
              {option.icon}
            </ListItemIcon>
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
