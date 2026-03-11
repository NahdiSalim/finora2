import React, { useState } from "react";
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

export interface CreateFolderModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void | Promise<void>;
  isLoading?: boolean;
}

export function CreateFolderModal({
  open,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateFolderModalProps) {
  const [name, setName] = useState("");

  const handleClose = () => {
    if (!isLoading) {
      setName("");
      onClose();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    await onSubmit(trimmed);
    setName("");
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
          Créer un nouveau dossier
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
          Créez un nouveau dossier pour organiser vos documents.
        </Typography>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <CustomInput
              label="Nom du dossier"
              placeholder="Saisir le nom du dossier"
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
                disabled={!name.trim() || isLoading}
              >
                Créer
              </CustomButton>
            </Box>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
