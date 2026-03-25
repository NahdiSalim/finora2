import { useState } from "react";
import {
  Box,
  Typography,
  useTheme,
  alpha,
  IconButton,
  Menu,
  MenuItem,
} from "@mui/material";
import { FileText, MoreVertical, Trash2, Download } from "lucide-react";

type FileType = "pdf" | "docx" | "xls" | "jpg" | "png" | "other";

interface FileCardProps {
  file: {
    id: string;
    name: string;
    type: FileType;
    thumbnail?: string;
  };
  showDelete?: boolean;
  onDownload?: () => void;
  onDelete?: () => void;
}

const fileTypeIcons: Record<FileType, React.ReactNode> = {
  pdf: <FileText size={24} color="#DC2626" />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <FileText size={24} color="#217346" />,
  jpg: <FileText size={24} color="#3B82F6" />,
  png: <FileText size={24} color="#3B82F6" />,
  other: <FileText size={24} color="#6B7280" />,
};

const fileTypeColors: Record<FileType, string> = {
  pdf: "#FEE9E7",
  docx: "#E9ECF0",
  xls: "#E3F2E9",
  jpg: "#E6F3FF",
  png: "#E6F3FF",
  other: "#F3F4F6",
};

export function FileCard({
  file,
  showDelete = false,
  onDownload,
  onDelete,
}: FileCardProps) {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleDownload = () => {
    handleMenuClose();
    if (onDownload) {
      onDownload();
    }
  };

  const handleDelete = () => {
    handleMenuClose();
    if (onDelete) {
      onDelete();
    }
  };

  const getFileExtension = (filename: string) => {
    const parts = filename.split(".");
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
  };

  return (
    <Box
      sx={{
        bgcolor: "white",
        borderRadius: 2,
        overflow: "hidden",
        border: `1px solid ${theme.palette.grey[200]}`,
        position: "relative",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      {/* Thumbnail/Preview Area */}
      <Box
        sx={{
          height: 120,
          bgcolor: fileTypeColors[file.type],
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
        }}
      >
        {file.thumbnail ? (
          <Box
            component="img"
            src={file.thumbnail}
            alt={file.name}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          fileTypeIcons[file.type]
        )}

        {/* Menu Button */}
        <IconButton
          size="small"
          onClick={handleMenuOpen}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: alpha(theme.palette.common.white, 0.9),
            "&:hover": {
              bgcolor: theme.palette.common.white,
            },
            width: 28,
            height: 28,
          }}
        >
          <MoreVertical size={16} />
        </IconButton>

        {/* Delete Button (if showDelete) */}
        {showDelete && (
          <IconButton
            size="small"
            sx={{
              position: "absolute",
              top: 8,
              right: showDelete ? 40 : 8,
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.2),
              },
              width: 28,
              height: 28,
            }}
          >
            <Trash2 size={16} />
          </IconButton>
        )}
      </Box>

      {/* File Info Bar */}
      <Box
        sx={{
          p: 1.5,
          display: "flex",
          alignItems: "center",
          gap: 1,
          borderTop: `1px solid ${theme.palette.grey[200]}`,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="caption"
            sx={{
              fontSize: 11,
              fontWeight: 500,
              color: theme.palette.text.secondary,
              display: "block",
            }}
          >
            {getFileExtension(file.name)}
          </Typography>
          <Typography
            variant="body2"
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.palette.text.primary,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {file.name}
          </Typography>
        </Box>
      </Box>

      {/* Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
      >
        <MenuItem onClick={handleDownload}>
          <Download size={16} style={{ marginRight: 8 }} />
          Télécharger
        </MenuItem>
        {showDelete && onDelete && (
          <MenuItem
            onClick={handleDelete}
            sx={{ color: theme.palette.error.main }}
          >
            <Trash2 size={16} style={{ marginRight: 8 }} />
            Supprimer
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
}
