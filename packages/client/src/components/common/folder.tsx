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
import FolderHoverSVG from "./FolderHover";

// ----------------------------------------------------------------------

export type FolderState = "empty" | "hasFiles" | "archived";

export interface FolderProps {
  name: string;
  description?: string;
  state?: FolderState;
  fileCount?: number;
  updatedAt?: string | null;
  onClick?: () => void;
  onMenuAction?: (action: string) => void;
  menuOptions?: { label: string; icon: React.ReactNode; action: string }[];
  allowClickWhenArchived?: boolean;
  sx?: any;
}

const MONTH_SHORT_FR = [
  "JAN",
  "FÉV",
  "MAR",
  "AVR",
  "MAI",
  "JUN",
  "JUI",
  "AOÛ",
  "SEP",
  "OCT",
  "NOV",
  "DÉC",
];

function formatUpdatedAt(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const day = d.getDate();
    const month = MONTH_SHORT_FR[d.getMonth()] ?? "";
    return `${day} ${month}`;
  } catch {
    return "";
  }
}

export function Folder({
  name,
  description,
  state = "empty",
  fileCount,
  updatedAt,
  onClick,
  onMenuAction,
  allowClickWhenArchived = false,
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

  // Hover SVG applies only to "empty" and "hasFiles"
  const isHoverableState = state === "empty" || state === "hasFiles";
  const showHoverSVG = isHovered && isHoverableState;

  // Text/icon color flips to white on hover so it stays readable on the blue SVG
  const contentColor = showHoverSVG
    ? theme.palette.common.white
    : state === "archived"
      ? theme.palette.grey[500]
      : theme.palette.common.black;

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
    onMenuAction?.(action);
  };

  const handleFolderClick = () => {
    if (onClick && (state !== "archived" || allowClickWhenArchived)) {
      onClick();
    }
  };

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
        cursor:
          state === "archived" && !allowClickWhenArchived
            ? "default"
            : "pointer",
        overflow: "hidden",
        ...sx,
      }}
    >
      {/* SVG Background — base state always rendered */}
      <Box sx={{ position: "relative", width: "100%", height: "auto" }}>
        {getFolderSVG()}
      </Box>

      {/* Hover SVG — fades in on top, only for hoverable states */}
      {isHoverableState && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: isHovered ? 1 : 0,
            transition: "opacity 0.2s ease",
            pointerEvents: "none",
          }}
        >
          <FolderHoverSVG />
        </Box>
      )}

      {/* Content overlay */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 4,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          p: 1.5,
        }}
      >
        {/* Top row — 3-dots menu */}
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Tooltip title="More options" arrow>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{
                color: contentColor,
                bgcolor: alpha(theme.palette.common.white, 0.2),
                backdropFilter: "blur(4px)",
                opacity: isHovered || open ? 1 : 0,
                pointerEvents: isHovered || open ? "auto" : "none",
                transition: "opacity 0.2s ease",
                "&:hover": {
                  bgcolor: alpha(theme.palette.common.white, 0.3),
                },
              }}
            >
              <MoreVertical size={16} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Bottom row — name, count, date, description */}
        <Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              variant="caption"
              fontWeight={600}
              noWrap
              sx={{
                color: contentColor,
                maxWidth: 100,
                transition: "color 0.2s ease",
              }}
            >
              {name}
            </Typography>

            {fileCount !== undefined && (
              <Typography
                variant="caption"
                sx={{
                  color: contentColor,
                  bgcolor: alpha(theme.palette.common.white, 0.3),
                  backdropFilter: "blur(4px)",
                  px: 0.5,
                  borderRadius: 0.5,
                  fontSize: "0.6rem",
                  transition: "color 0.2s ease",
                }}
              >
                {fileCount} {fileCount === 1 ? "Doc" : "Docs"}
              </Typography>
            )}
          </Box>

          {formatUpdatedAt(updatedAt) && (
            <Typography
              variant="caption"
              sx={{
                color: contentColor,
                opacity: 0.85,
                fontWeight: 400,
                transition: "color 0.2s ease",
              }}
            >
              Modifié : {formatUpdatedAt(updatedAt)}
            </Typography>
          )}

          {description && (
            <Typography
              variant="caption"
              noWrap
              sx={{
                maxWidth: 150,
                color: contentColor,
                opacity: 0.9,
                textShadow: "0 1px 1px rgba(0,0,0,0.1)",
                display: "block",
                mt: 0.25,
                transition: "color 0.2s ease",
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Dropdown menu */}
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
