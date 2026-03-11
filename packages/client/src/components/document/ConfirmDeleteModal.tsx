import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  IconButton,
  Typography,
} from "@mui/material";
import { X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import trash from "../../../public/assets/trash.gif";

export interface ConfirmDeleteModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export function ConfirmDeleteModal({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Supprimer",
  isLoading = false,
}: ConfirmDeleteModalProps) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Keep modal open on error so user can retry or cancel
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 0,
          overflow: "hidden",
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
          backdropFilter: "blur(10px)",
          bgcolor: "rgba(255,255,255,0.95)",
        },
      }}
    >
      <DialogTitle sx={{ p: 3, pb: 1 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }} />

          <IconButton
            size="small"
            onClick={onClose}
            disabled={isLoading}
            sx={{
              color: "text.disabled",
              transition: "all 0.2s ease",
              "&:hover": {
                color: "text.primary",
                bgcolor: "grey.100",
              },
            }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, py: 2, textAlign: "center" }}>
        <img src={trash} alt="Loading animation" />
        <Typography variant="h6" fontWeight={600}>
          {title}
        </Typography>
        <DialogContentText
          sx={{
            color: "text.secondary",
            fontSize: "0.95rem",
            lineHeight: 1.6,
          }}
        >
          {message}
        </DialogContentText>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <CustomButton
          fullWidth
          variant="outlined"
          onClick={onClose}
          disabled={isLoading}
          sx={{
            py: 1.5,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            color: "text.secondary",
            borderColor: "divider",
            "&:hover": {
              borderColor: "text.primary",
              bgcolor: "transparent",
            },
          }}
        >
          Annuler
        </CustomButton>

        <CustomButton
          fullWidth
          variant="contained"
          onClick={handleConfirm}
          disabled={isLoading}
          sx={{
            py: 1.5,
            borderRadius: 2,
            textTransform: "none",
            fontWeight: 600,
            bgcolor: "error.main",
            boxShadow: "none",
            "&:hover": {
              bgcolor: "error.dark",
              boxShadow: "0 8px 16px -8px rgba(244, 67, 54, 0.4)",
            },
          }}
        >
          {isLoading ? "Chargement..." : confirmLabel}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
