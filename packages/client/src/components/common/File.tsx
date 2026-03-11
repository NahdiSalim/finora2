import React, { useState } from "react";
import {
  Card,
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
  Chip,
  Checkbox,
} from "@mui/material";
import {
  MoreVertical,
  FileText,
  File,
  Download,
  Trash2,
  Share2,
  Edit,
  Copy,
  Star,
  Archive,
  Move,
  Eye,
} from "lucide-react";
import PdfIcon from "./pdfIcon";
import ImageIcon from "./imageIcon";
import XlsIcon from "./xlsIcon";

// ----------------------------------------------------------------------

export type FileType = "pdf" | "docx" | "xls" | "jpg" | "png" | "other";

export interface FileItem {
  id: string | number;
  name: string;
  type: FileType;
  size?: string;
  modified?: string;
  thumbnail?: string;
  starred?: boolean;
  shared?: boolean;
  /** MIME type from API, used for image preview (e.g. image/jpeg, image/gif) */
  mimeType?: string | null;
}

export interface FileCardProps {
  file: FileItem;
  /** URL (e.g. blob) to show real document preview in the card (PDF = iframe, image = background) */
  previewContentUrl?: string | null;
  onClick?: () => void;
  onMenuAction?: (action: string, file: FileItem) => void;
  menuOptions?: { label: string; icon: React.ReactNode; action: string }[];
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  sx?: any;
}

// ----------------------------------------------------------------------

// File type icons mapping
const fileTypeIcons: Record<FileType, React.ReactNode> = {
  pdf: <PdfIcon />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <XlsIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  other: <File size={24} color="#6B7280" />,
};

// File type background colors
const fileTypeColors: Record<FileType, string> = {
  pdf: "#FEE9E7",
  docx: "#E9ECF0",
  xls: "#E3F2E9",
  jpg: "#E6F3FF",
  png: "#E6F3FF",
  other: "#F3F4F6",
};

// ----------------------------------------------------------------------

export function FileCard({
  file,
  previewContentUrl,
  onClick,
  onMenuAction,
  menuOptions = [
    { label: "Preview", icon: <Eye size={16} />, action: "preview" },
    { label: "Download", icon: <Download size={16} />, action: "download" },
    { label: "Share", icon: <Share2 size={16} />, action: "share" },
    { label: "Rename", icon: <Edit size={16} />, action: "rename" },
    { label: "Make a copy", icon: <Copy size={16} />, action: "copy" },
    { label: "Move to", icon: <Move size={16} />, action: "move" },
    { label: "Add star", icon: <Star size={16} />, action: "star" },
    { label: "Archive", icon: <Archive size={16} />, action: "archive" },
    { label: "Delete", icon: <Trash2 size={16} />, action: "delete" },
  ],
  selectable = false,
  selected = false,
  onSelect,
  sx,
}: FileCardProps) {
  const isPdf = file.type === "pdf";
  const isImage =
    file.type === "jpg" ||
    file.type === "png" ||
    (file.mimeType && file.mimeType.toLowerCase().startsWith("image/"));
  const hasContentPreview = Boolean(previewContentUrl && (isPdf || isImage));
  const previewBg =
    hasContentPreview && isImage
      ? `url(${previewContentUrl})`
      : file.thumbnail
        ? `url(${file.thumbnail})`
        : "none";
  const previewBgColor =
    hasContentPreview && isImage
      ? "transparent"
      : file.thumbnail
        ? "transparent"
        : fileTypeColors[file.type];
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isStarred, setIsStarred] = useState(file.starred || false);
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

    // Special handling for star action
    if (action === "star") {
      setIsStarred(!isStarred);
    }

    if (onMenuAction) {
      onMenuAction(action, file);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger if clicking on menu or checkbox
    if (
      (e.target as HTMLElement).closest(".menu-button") ||
      (e.target as HTMLElement).closest(".checkbox")
    ) {
      return;
    }

    if (selectable && onSelect) {
      onSelect(!selected);
    } else if (onClick) {
      onClick();
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect(e.target.checked);
    }
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsStarred(!isStarred);
    if (onMenuAction) {
      onMenuAction("star", file);
    }
  };

  return (
    <Card
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      sx={{
        width: 200,
        height: 215,
        position: "relative",
        borderRadius: 2,
        overflow: "hidden",
        boxShadow: isHovered ? theme.shadows[8] : theme.shadows[1],
        transition: "box-shadow 0.2s ease, transform 0.2s ease",
        transform: isHovered ? "translateY(-2px)" : "none",
        cursor: "pointer",
        border: selected ? `2px solid ${theme.palette.primary.main}` : "none",
        p: 1,
        backgroundColor: theme.palette.grey[50],
        ...sx,
      }}
    >
      {/* Selection Checkbox */}
      {selectable && (
        <Box
          className="checkbox"
          sx={{
            position: "absolute",
            top: 8,
            left: 8,
            zIndex: 10,
            bgcolor: "background.paper",
            borderRadius: 1.5,
            boxShadow: theme.shadows[2],
          }}
        >
          <Checkbox
            checked={selected}
            onChange={handleCheckboxChange}
            size="small"
            sx={{
              p: 0.5,
              color: theme.palette.primary.main,
            }}
          />
        </Box>
      )}

      {/* Star Icon */}
      {isStarred && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 40,
            zIndex: 10,
            color: theme.palette.warning.main,
          }}
        >
          <Star size={16} fill={theme.palette.warning.main} />
        </Box>
      )}

      {/* Preview Area - real document content (Figma) or fallback icon */}
      <Box
        sx={{
          height: 160,
          bgcolor: previewBgColor,
          backgroundImage: previewBg,
          backgroundSize: "cover",
          backgroundPosition: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          borderBottom: `1px solid ${theme.palette.divider}`,
          overflow: "hidden",
          borderRadius: 2,
        }}
      >
        {/* PDF: use embed for reliable blob PDF preview in card */}
        {hasContentPreview && isPdf && previewContentUrl && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              overflow: "hidden",
            }}
          >
            <embed
              src={previewContentUrl}
              type="application/pdf"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                border: "none",
                pointerEvents: "none",
              }}
            />
          </Box>
        )}
        {/* Show file type icon only when no content preview */}
        {!hasContentPreview && !file.thumbnail && (
          <Box sx={{ transform: "scale(1.5)" }}>{fileTypeIcons[file.type]}</Box>
        )}

        {/* Hover overlay with quick actions */}
        {isHovered && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: alpha(theme.palette.common.black, 0.4),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            <Tooltip title="Preview">
              <IconButton
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.paper" },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMenuAction) onMenuAction("preview", file);
                }}
              >
                <Eye size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Download">
              <IconButton
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.paper" },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMenuAction) onMenuAction("download", file);
                }}
              >
                <Download size={18} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Share">
              <IconButton
                size="small"
                sx={{
                  bgcolor: "background.paper",
                  "&:hover": { bgcolor: "background.paper" },
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMenuAction) onMenuAction("share", file);
                }}
              >
                <Share2 size={18} />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          pt: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        {/* File Type Icon */}
        <Box sx={{ flexShrink: 0 }}>{fileTypeIcons[file.type]}</Box>

        {/* File Name and Metadata */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            fontWeight={500}
            noWrap
            sx={{
              mb: 0.25,
              color: "text.primary",
            }}
          >
            {file.name}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {/* {file.size && (
              <Typography variant="caption" color="text.secondary">
                {file.size}
              </Typography>
            )} */}
            {file.modified && (
              <>
                <Typography variant="caption" color="text.secondary">
                  •
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {file.modified}
                </Typography>
              </>
            )}
            {file.shared && (
              <Chip
                label="Shared"
                size="small"
                sx={{
                  height: 18,
                  fontSize: "0.6rem",
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                }}
              />
            )}
          </Box>
        </Box>

        {/* 3-dots Menu */}
        <Tooltip title="More options" arrow>
          <IconButton
            className="menu-button"
            size="small"
            onClick={handleMenuClick}
            sx={{
              flexShrink: 0,
              color: isHovered ? "text.primary" : "text.secondary",
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
              minWidth: 180,
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
    </Card>
  );
}
