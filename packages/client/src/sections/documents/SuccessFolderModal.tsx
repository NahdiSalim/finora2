import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { X, Folder } from "lucide-react";
import { useTheme } from "@mui/material/styles";

export interface SuccessFolderModalProps {
  open: boolean;
  onClose: () => void;
}

export function SuccessFolderModal({ open, onClose }: SuccessFolderModalProps) {
  const theme = useTheme();

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
          textAlign: "center",
        },
      }}
    >
      <DialogContent sx={{ py: 4, px: 3, position: "relative" }}>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            position: "absolute",
            right: 12,
            top: 12,
            color: "text.secondary",
          }}
        >
          <X size={20} />
        </IconButton>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <Box
            sx={{
              width: 80,
              height: 80,
              borderRadius: 2,
              bgcolor: theme.palette.primary.main,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Folder size={48} strokeWidth={1.5} />
          </Box>
        </Box>
        <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
          Dossier créé avec succès !
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Vous pouvez maintenant y organiser vos documents.
        </Typography>
      </DialogContent>
    </Dialog>
  );
}
