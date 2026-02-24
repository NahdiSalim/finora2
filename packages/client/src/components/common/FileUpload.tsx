import { useState, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  useTheme,
  alpha,
} from "@mui/material";
import { Close as CloseIcon } from "@mui/icons-material";
import UploadIcon from "../../../public/assets/upload.svg";

interface FileUploadProps {
  label: string;
  value?: File | null;
  onChange?: (file: File | null) => void;
  error?: boolean;
  helperText?: string;
  maxSize?: number; // in MB
  acceptedFiles?: string[];
  disabled?: boolean;
}

export default function FileUpload({
  label,
  value = null,
  onChange,
  error = false,
  helperText,
  maxSize = 5,
  acceptedFiles = [".jpg", ".png", ".pdf", ".docx"],
  disabled = false,
}: FileUploadProps) {
  const theme = useTheme();
  const [file, setFile] = useState<File | null>(value);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and handle file
  const handleFile = useCallback(
    (selectedFile: File) => {
      setUploadError("");

      // Validate file size
      if (selectedFile.size > maxSize * 1024 * 1024) {
        const errorMsg = `La taille du fichier doit être inférieure à ${maxSize}MB`;
        setUploadError(errorMsg);
        return;
      }

      // Validate file type
      const fileExt = "." + selectedFile.name.split(".").pop()?.toLowerCase();
      if (!acceptedFiles.includes(fileExt)) {
        const errorMsg = `Types de fichiers acceptés: ${acceptedFiles.join(", ")}`;
        setUploadError(errorMsg);
        return;
      }

      setFile(selectedFile);
      onChange?.(selectedFile);
    },
    [maxSize, acceptedFiles, onChange],
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (disabled) return;

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [disabled, handleFile],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        setDragActive(true);
      }
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  // Handle file removal
  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setFile(null);
      setUploadError("");
      onChange?.(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onChange],
  );

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  // Format file size for display
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(0)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Get file extension for display
  const getFileExtension = useCallback((filename: string): string => {
    return filename.split(".").pop()?.toUpperCase() || "FILE";
  }, []);

  const hasError = error || !!uploadError;
  const displayHelperText = uploadError || helperText;

  return (
    <Box sx={{ width: "100%" }}>
      {/* Label */}
      <Typography
        variant="subtitle2"
        component="label"
        sx={{
          mb: 1,
          display: "block",
          color: theme.palette.text.primary,
          fontWeight: theme.typography.fontWeightMedium,
        }}
      >
        {label}
      </Typography>

      {/* Empty State - Drop Zone */}
      {!file ? (
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={handleClick}
          sx={{
            border: 1.5,
            borderStyle: "dashed",
            borderColor: hasError
              ? theme.palette.error.main
              : dragActive
                ? theme.palette.primary.main
                : theme.palette.divider,
            borderRadius: 4,
            backgroundColor: dragActive
              ? alpha(theme.palette.primary.main, 0.04)
              : theme.palette.background.default,
            minHeight: 170,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
            cursor: disabled ? "not-allowed" : "pointer",
            opacity: disabled ? 0.6 : 1,
            transition: theme.transitions.create(
              ["border-color", "background-color"],
              { duration: theme.transitions.duration.short },
            ),
            ...(!disabled && {
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.02),
              },
            }),
          }}
        >
          <Box component="img" src={UploadIcon} />

          <Typography
            variant="body2"
            sx={{
              fontWeight: theme.typography.fontWeightMedium,
              color: theme.palette.text.primary,
            }}
          >
            Glissez-déposez vos documents
          </Typography>

          <Button
            variant="outlined"
            disabled={disabled}
            sx={{
              borderRadius: 2.5,
              textTransform: "none",
              px: 5,
              pointerEvents: "none", // Prevent button click, let parent handle it
              borderColor: theme.palette.grey[300],
              color: theme.palette.common.black,
            }}
          >
            Sélectionner un fichier
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            hidden
            disabled={disabled}
            accept={acceptedFiles.join(",")}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
          />
        </Box>
      ) : (
        /* Uploaded State - File Display */
        <Box
          sx={{
            borderRadius: 3,
            backgroundColor: theme.palette.background.default,
            border: 2,
            borderColor: theme.palette.primary.main,
            px: 2,
            py: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: theme.transitions.create("background-color"),
            "&:hover": {
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
            },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flex: 1,
              minWidth: 0, // Allow text truncation
            }}
          >
            {/* File Extension Badge */}
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1,
                backgroundColor: alpha(theme.palette.primary.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: theme.typography.fontWeightBold,
                  color: theme.palette.primary.main,
                }}
              >
                {getFileExtension(file.name)}
              </Typography>
            </Box>

            {/* File Info */}
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: theme.typography.fontWeightMedium,
                  color: theme.palette.text.primary,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {file.name}
              </Typography>

              <Typography
                variant="caption"
                sx={{
                  color: theme.palette.text.secondary,
                }}
              >
                {formatFileSize(file.size)}
              </Typography>
            </Box>
          </Box>

          {/* Remove Button */}
          <IconButton
            onClick={handleRemove}
            size="small"
            disabled={disabled}
            sx={{
              color: theme.palette.text.secondary,
              transition: theme.transitions.create(["color", "transform"]),
              "&:hover": {
                color: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                transform: "scale(1.1)",
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Helper Text / Error Message */}
      {displayHelperText && (
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            display: "block",
            color: hasError
              ? theme.palette.error.main
              : theme.palette.text.secondary,
          }}
        >
          {displayHelperText}
        </Typography>
      )}
    </Box>
  );
}
