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
  Download,
  Trash2,
  Share2,
  Edit,
  Copy,
  Star,
  Archive,
  Move,
  Eye,
  List,
} from "lucide-react";
import PdfIcon from "./pdfIcon";
import ImageIcon from "./imageIcon";
import XlsIcon from "./xlsIcon";
import { useFileDrawerStore } from "src/stores/fileDrawerStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FileType = "pdf" | "docx" | "xls" | "jpg" | "png" | "other";

export interface FileItem {
  id: string | number;
  name: string;
  type: FileType;
  size?: string;
  modified?: string;
  created?: string;
  thumbnail?: string;
  starred?: boolean;
  shared?: boolean;
  mimeType?: string | null;
}

export interface FileCardProps {
  file: FileItem;
  previewContentUrl?: string | null;
  onClick?: () => void;
  onMenuAction?: (action: string, file: FileItem) => void;
  menuOptions?: { label: string; icon: React.ReactNode; action: string }[];
  selectable?: boolean;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  sx?: object;
}

// ─── Constants ────────────────────────────────────────────────────────────────

export const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  pdf: <PdfIcon />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <XlsIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  other: <ImageIcon />,
};

export const FILE_TYPE_COLORS: Record<FileType, string> = {
  pdf: "#FEE9E7",
  docx: "#E9ECF0",
  xls: "#E3F2E9",
  jpg: "#E6F3FF",
  png: "#E6F3FF",
  other: "#F3F4F6",
};

const DEFAULT_MENU_OPTIONS = [
  { label: "Preview", icon: <Eye size={16} />, action: "preview" },
  { label: "Details", icon: <List size={16} />, action: "details" },
  { label: "Download", icon: <Download size={16} />, action: "download" },
  { label: "Share", icon: <Share2 size={16} />, action: "share" },
  { label: "Rename", icon: <Edit size={16} />, action: "rename" },
  { label: "Make a copy", icon: <Copy size={16} />, action: "copy" },
  { label: "Move to", icon: <Move size={16} />, action: "move" },
  { label: "Add star", icon: <Star size={16} />, action: "star" },
  { label: "Archive", icon: <Archive size={16} />, action: "archive" },
  { label: "Delete", icon: <Trash2 size={16} />, action: "delete" },
];

// ─── File Card ────────────────────────────────────────────────────────────────

export function FileCard({
  file,
  previewContentUrl,
  onClick,
  onMenuAction,
  menuOptions = DEFAULT_MENU_OPTIONS,
  selectable = false,
  selected = false,
  onSelect,
  sx,
}: FileCardProps) {
  const theme = useTheme();
  const { openDrawer } = useFileDrawerStore();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isStarred, setIsStarred] = useState(file.starred ?? false);

  const isPdf = file.type === "pdf";
  const isImage =
    file.type === "jpg" ||
    file.type === "png" ||
    !!file.mimeType?.toLowerCase().startsWith("image/");
  const hasContentPreview = Boolean(previewContentUrl && (isPdf || isImage));

  const previewBg =
    hasContentPreview && isImage
      ? `url(${previewContentUrl})`
      : file.thumbnail
        ? `url(${file.thumbnail})`
        : "none";

  const previewBgColor =
    (hasContentPreview && isImage) || file.thumbnail
      ? "transparent"
      : FILE_TYPE_COLORS[file.type];

  // ── Handlers ──

  const handleCardClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".file-menu-btn") || target.closest(".file-checkbox"))
      return;
    openDrawer(file, previewContentUrl);
    onClick?.();
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect?.(e.target.checked);
  };

  const handleMenuOpen = (e: React.MouseEvent<HTMLElement>) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleMenuClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchorEl(null);
  };

  const handleMenuItemClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnchorEl(null);
    if (action === "star") setIsStarred((prev) => !prev);
    onMenuAction?.(action, file);
  };

  const handleQuickAction = (action: string) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onMenuAction?.(action, file);
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
        border: selected
          ? `2px solid ${theme.palette.primary.main}`
          : "1px solid transparent",
        p: 1,
        bgcolor: theme.palette.grey[50],
        ...sx,
      }}
    >
      {/* Checkbox */}
      {selectable && (
        <Box
          className="file-checkbox"
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
            sx={{ p: 0.5 }}
          />
        </Box>
      )}

      {/* Star badge */}
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

      {/* Preview area */}
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
        {/* PDF thumbnail — iframe narrow enough that the A4 page fills/overflows its
            width at any browser zoom (75-100%), eliminating side gray space.
            scale = card_inner_width(184px) / iframe_width(480px) = 0.383.
            Hash params (#toolbar=0 etc.) are silently ignored for blob: URLs
            by Chrome, so we omit them. */}
        {hasContentPreview && isPdf && previewContentUrl && (
          <Box sx={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <Box
              component="iframe"
              title={file.name}
              src={previewContentUrl}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: 480,
                height: 1000,
                border: "none",
                transformOrigin: "top left",
                transform: "scale(0.383)",
                pointerEvents: "none",
              }}
            />
          </Box>
        )}

        {/* Fallback icon */}
        {!hasContentPreview && !file.thumbnail && (
          <Box sx={{ transform: "scale(1.5)" }}>
            {FILE_TYPE_ICONS[file.type]}
          </Box>
        )}

        {/* Hover overlay */}
        {isHovered && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              bgcolor: alpha(theme.palette.common.black, 0.4),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
            }}
          >
            {(["preview", "download", "share"] as const).map((action) => (
              <Tooltip
                key={action}
                title={action.charAt(0).toUpperCase() + action.slice(1)}
              >
                <IconButton
                  size="small"
                  sx={{
                    bgcolor: "background.paper",
                    "&:hover": { bgcolor: "background.paper" },
                  }}
                  onClick={handleQuickAction(action)}
                >
                  {action === "preview" && <Eye size={18} />}
                  {action === "download" && <Download size={18} />}
                  {action === "share" && <Share2 size={18} />}
                </IconButton>
              </Tooltip>
            ))}
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{ pt: 1.5, display: "flex", alignItems: "center", gap: 1 }}>
        <Box sx={{ flexShrink: 0 }}>{FILE_TYPE_ICONS[file.type]}</Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={500} noWrap sx={{ mb: 0.25 }}>
            {file.name}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {file.modified && (
              <Typography variant="caption" color="text.secondary">
                {file.modified}
              </Typography>
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

        {/* 3-dot menu */}
        <Tooltip title="More options" arrow>
          <IconButton
            className="file-menu-btn"
            size="small"
            onClick={handleMenuOpen}
            sx={{
              flexShrink: 0,
              color: isHovered ? "text.primary" : "text.secondary",
            }}
          >
            <MoreVertical size={18} />
          </IconButton>
        </Tooltip>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          transformOrigin={{ horizontal: "right", vertical: "top" }}
          anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                minWidth: 180,
                borderRadius: 2,
                boxShadow: theme.shadows[8],
              },
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
