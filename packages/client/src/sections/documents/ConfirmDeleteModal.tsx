import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Box,
  IconButton,
} from "@mui/material";
import { X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";

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
      PaperProps={{ sx: { borderRadius: 3, p: 0, overflow: "hidden" } }}
    >
      <DialogTitle
        sx={{ fontWeight: 600, fontSize: "1.125rem", pb: 0, pt: 2, px: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {title}
          <IconButton
            size="small"
            onClick={onClose}
            disabled={isLoading}
            sx={{ color: "text.secondary" }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 2, pb: 1, pt: 1 }}>
        <DialogContentText sx={{ color: "text.secondary" }}>
          {message}
        </DialogContentText>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2, pt: 0 }}>
        <CustomButton variant="outlined" onClick={onClose} disabled={isLoading}>
          Annuler
        </CustomButton>
        <CustomButton
          variant="contained"
          color="error"
          onClick={handleConfirm}
          disabled={isLoading}
        >
          {confirmLabel}
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
