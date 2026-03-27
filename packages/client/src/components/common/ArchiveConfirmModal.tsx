import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  useTheme,
  alpha,
  useMediaQuery,
} from "@mui/material";
import { Archive } from "lucide-react";
import CustomButton from "./CustomButton";

interface ArchiveConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  isLoading?: boolean;
}

export default function ArchiveConfirmModal({
  open,
  onClose,
  onConfirm,
  title = "Archiver cette tâche ?",
  message = "La tâche archivée sera masquée de la vue principale. Cette action peut être inversée.",
  isLoading = false,
}: ArchiveConfirmModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const handleConfirm = () => {
    onConfirm();
  };

  return (
    <Dialog
      open={open}
      onClose={isLoading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: theme.palette.common.white,
          boxShadow: theme.shadows[24],
          overflow: "hidden",
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.grey[900], 0.5),
          backdropFilter: "blur(4px)",
        },
      }}
    >
      <DialogContent
        sx={{
          p: { xs: 3, sm: 4 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* Archive Icon */}
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            bgcolor: alpha("#64748B", 0.1),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 3,
            animation: "scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
            "@keyframes scaleIn": {
              "0%": {
                transform: "scale(0)",
                opacity: 0,
              },
              "100%": {
                transform: "scale(1)",
                opacity: 1,
              },
            },
          }}
        >
          <Archive size={40} color="#64748B" strokeWidth={2} />
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          fontWeight={600}
          sx={{
            mb: 1.5,
            color: theme.palette.text.primary,
            fontSize: { xs: "1.125rem", sm: "1.25rem" },
            animation: "fadeInUp 0.3s ease-out 0.1s both",
            "@keyframes fadeInUp": {
              "0%": {
                opacity: 0,
                transform: "translateY(10px)",
              },
              "100%": {
                opacity: 1,
                transform: "translateY(0)",
              },
            },
          }}
        >
          {title}
        </Typography>

        {/* Message */}
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 4,
            fontSize: "0.875rem",
            lineHeight: 1.6,
            animation: "fadeInUp 0.3s ease-out 0.2s both",
          }}
        >
          {message}
        </Typography>

        {/* Action Buttons */}
        <Box
          sx={{
            display: "flex",
            gap: 2,
            width: "100%",
            flexDirection: { xs: "column", sm: "row" },
            animation: "fadeInUp 0.3s ease-out 0.3s both",
          }}
        >
          {/* Cancel Button */}
          <CustomButton
            variant="outlined"
            onClick={onClose}
            disabled={isLoading}
            fullWidth
            sx={{
              borderColor: theme.palette.grey[300],
              color: theme.palette.text.secondary,
              "&:hover": {
                borderColor: theme.palette.grey[400],
                bgcolor: alpha(theme.palette.grey[500], 0.04),
              },
            }}
          >
            Annuler
          </CustomButton>

          {/* Archive Button */}
          <CustomButton
            variant="contained"
            onClick={handleConfirm}
            disabled={isLoading}
            loading={isLoading}
            fullWidth
            sx={{
              bgcolor: "#64748B",
              color: theme.palette.common.white,
              "&:hover": {
                bgcolor: "#475569",
              },
              "&:active": {
                bgcolor: "#334155",
              },
            }}
          >
            Archiver
          </CustomButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
