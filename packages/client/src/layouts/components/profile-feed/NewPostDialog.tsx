import React, { useRef } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { ImagePlus, Paperclip, X } from "lucide-react";

import CustomButton from "src/components/common/CustomButton";

export function NewPostDialog({
  open,
  onClose,
  notifyNetwork,
  onNotifyNetworkChange,
  description,
  onDescriptionChange,
  newImages,
  onRemoveImage,
  onAddFiles,
  accept,
  isCreating,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  notifyNetwork: boolean;
  onNotifyNetworkChange: (next: boolean) => void;
  description: string;
  onDescriptionChange: (next: string) => void;
  newImages: File[];
  onRemoveImage: (index: number) => void;
  onAddFiles: (files: FileList | null) => void;
  accept: string;
  isCreating: boolean;
  onCreate: () => void;
}) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 0,
        },
      }}
    >
      <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Nouveau post
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Publiez une actualité ou partagez des documents avec votre réseau.
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3, pt: 2 }}>
        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.06),
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            mb: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="subtitle2" fontWeight={700}>
                Notifier le réseau
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Activez pour notifier vos abonnés.
              </Typography>
            </Box>
            <Switch
              checked={notifyNetwork}
              onChange={(e) => onNotifyNetworkChange(e.target.checked)}
              color="primary"
            />
          </Box>
        </Box>

        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ mb: 1, display: "block" }}
        >
          Ajouter une description
        </Typography>
        <TextField
          multiline
          rows={4}
          fullWidth
          placeholder="Partagez ce que vous avez en tête..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          variant="outlined"
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: 2,
              backgroundColor: theme.palette.grey[50],
            },
          }}
        />

        {newImages.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Fichiers joints
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {newImages.map((file, index) => (
                <Box
                  key={`${file.name}-${index}`}
                  sx={{
                    position: "relative",
                    width: 100,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  {file.type.startsWith("image/") ? (
                    <Box
                      component="img"
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      sx={{ width: "100%", height: 80, objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: 80,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: theme.palette.grey[100],
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        {file.name.split(".").pop()?.toUpperCase() ?? "Fichier"}
                      </Typography>
                    </Box>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onRemoveImage(index)}
                    sx={{
                      position: "absolute",
                      top: 4,
                      right: 4,
                      bgcolor: "rgba(255,255,255,0.9)",
                      color: "error.main",
                      width: 24,
                      height: 24,
                      "&:hover": { bgcolor: "error.lighter" },
                    }}
                  >
                    <X size={14} />
                  </IconButton>
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      px: 1,
                      py: 0.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {file.name}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>
        )}

        <input
          ref={fileInputRef}
          type="file"
          hidden
          multiple
          accept={accept}
          onChange={(e) => {
            onAddFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1}>
            <IconButton
              size="small"
              sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Ajouter une image"
            >
              <ImagePlus size={20} />
            </IconButton>
            <IconButton
              size="small"
              sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Ajouter une pièce jointe"
            >
              <Paperclip size={20} />
            </IconButton>
          </Stack>
          <CustomButton
            variant="contained"
            color="primary"
            onClick={onCreate}
            disabled={!description.trim() || isCreating}
          >
            {isCreating ? "Création..." : "Créer"}
          </CustomButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
