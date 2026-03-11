import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import { X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";

export interface RenameFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (newName: string) => void | Promise<void>;
  initialName: string;
  isLoading?: boolean;
  /** Default: "Renommer le dossier" */
  title?: string;
  /** Default: "Saisissez le nouveau nom du dossier." */
  description?: string;
  /** Default: "Nom du dossier" / "Saisir le nom du dossier" */
  inputLabel?: string;
  inputPlaceholder?: string;
}

export function RenameFolderModal({
  open,
  onClose,
  onSubmit,
  initialName,
  isLoading = false,
  title: titleProp,
  description,
  inputLabel,
  inputPlaceholder,
}: RenameFolderModalProps) {
  const title = titleProp ?? "Renommer le dossier";
  const desc = description ?? "Saisissez le nouveau nom du dossier.";
  const label = inputLabel ?? "Nom du dossier";
  const placeholder = inputPlaceholder ?? "Saisir le nom du dossier";
  const [name, setName] = useState(initialName);

  useEffect(() => {
    if (open) setName(initialName);
  }, [open, initialName]);

  const handleClose = () => {
    if (!isLoading) {
      setName(initialName);
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === initialName) return;
    await onSubmit(trimmed);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 0, overflow: "hidden" } }}
    >
      <DialogTitle
        sx={{ fontWeight: 600, fontSize: "1.25rem", pb: 0, pt: 2, px: 2 }}
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
            onClick={handleClose}
            disabled={isLoading}
            sx={{ color: "text.secondary" }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 2, pb: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {desc}
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <CustomInput
              label={label}
              placeholder={placeholder}
              value={name}
              onChange={(e) => setName(e.target.value)}
              fullWidth
              required
            />
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                pt: 1,
              }}
            >
              <CustomButton
                type="button"
                variant="outlined"
                onClick={handleClose}
                disabled={isLoading}
              >
                Annuler
              </CustomButton>
              <CustomButton
                type="submit"
                variant="contained"
                disabled={
                  !name.trim() || name.trim() === initialName || isLoading
                }
              >
                Enregistrer
              </CustomButton>
            </Box>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
