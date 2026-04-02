import React from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
} from "@mui/material";
import { X } from "lucide-react";
import { useTheme } from "@mui/material/styles";
import AddFolder from "src/assets/Animations/SavedFolder.json";
import Lottie from "lottie-react";

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
            px: 3,
            py: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            gap: 1,
          }}
        >
          <Lottie
            animationData={AddFolder}
            loop
            style={{ width: 130, height: 130 }}
          />
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
