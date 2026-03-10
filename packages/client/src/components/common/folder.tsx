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
  /** Dernière date de modification (ISO string ou date formatée) */
  updatedAt?: string | null;
  onClick?: () => void;
  onMenuAction?: (action: string) => void;
  menuOptions?: { label: string; icon: React.ReactNode; action: string }[];
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
        return theme.palette.common.white;
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
        Width: 195,
        p: 0.25,
        borderRadius: 5,
        opacity: state === "archived" ? 0.7 : 1,
        cursor: state === "archived" ? "default" : "pointer",
        overflow: "hidden",
        ...sx,
      }}
    >
      {/* SVG Container */}
      <Box>{getFolderSVG()}</Box>

      {/* Content Container */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          width: "100%",
          px: 1,
        }}
      >
        {/* Text Column */}
        <Box sx={{ flex: 1, minWidth: 0, mt: -9 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}
          >
            <Typography
              variant="body1"
              fontWeight={600}
              maxWidth="90%"
              noWrap
              sx={{
                color: getStateColor(),
              }}
            >
              {name}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: getStateColor(),
              }}
            >
              {fileCount} {fileCount === 1 ? "Doc" : "Docs"}
            </Typography>
          </Box>

          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.25 }}
          >
            {description && (
              <Typography
                variant="caption"
                noWrap
                sx={{
                  maxWidth: description ? 120 : "none",
                  color: getStateColor(),
                }}
              >
                {description}
              </Typography>
            )}

            {formatUpdatedAt(updatedAt) && (
              <Typography
                variant="caption"
                sx={{
                  color: getStateColor(),
                  opacity: 0.85,
                  fontWeight: 400,
                }}
              >
                Modifié : {formatUpdatedAt(updatedAt)}
              </Typography>
            )}

            {state === "archived" && (
              <Typography variant="caption" color="text.disabled">
                Archived
              </Typography>
            )}
          </Box>
        </Box>

        {/* 3-dots Menu */}
        <Tooltip title="More options" arrow>
          <IconButton
            size="small"
            onClick={handleMenuClick}
            sx={{
              mt: -9,
              color: getStateColor(),
              "&:hover": {
                bgcolor: alpha(getStateColor(), 0.08),
              },
            }}
          >
            <MoreVertical size={18} />
          </IconButton>
        </Tooltip>

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
              <ListItemIcon
                sx={{ minWidth: 32, color: theme.palette.info.main }}
              >
                {option.icon}
              </ListItemIcon>
              <ListItemText primary={option.label} />
            </MenuItem>
          ))}
        </Menu>
      </Box>
    </Box>
  );
}
