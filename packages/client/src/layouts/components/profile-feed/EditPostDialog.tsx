import React, { useRef } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { ImagePlus, Paperclip, Trash2, X } from "lucide-react";

import CustomButton from "src/components/common/CustomButton";

import type { PostAttachment } from "./types";

export function EditPostDialog({
  open,
  onClose,
  editDescription,
  onEditDescriptionChange,
  editAttachments,
  onRemoveAttachment,
  newImages,
  onRemoveNewImage,
  onAddFiles,
  accept,
  isDeleting,
  isUpdating,
  onDelete,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  editDescription: string;
  onEditDescriptionChange: (next: string) => void;
  editAttachments: PostAttachment[];
  onRemoveAttachment: (id: string) => void;
  newImages: File[];
  onRemoveNewImage: (index: number) => void;
  onAddFiles: (files: FileList | null) => void;
  accept: string;
  isDeleting: boolean;
  isUpdating: boolean;
  onDelete: () => void;
  onSave: () => void;
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
              Modifier le post
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Modifiez votre publication pour mettre à jour son contenu.
            </Typography>
          </Box>
          <IconButton size="small" onClick={onClose} aria-label="Fermer">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ px: 3, pb: 3, pt: 2 }}>
        <Typography
          variant="subtitle2"
          fontWeight={600}
          sx={{ mb: 1, display: "block" }}
        >
          Modifier la description
        </Typography>
        <Box sx={{ position: "relative" }}>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Modifier la description..."
            value={editDescription}
            onChange={(e) => onEditDescriptionChange(e.target.value)}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: theme.palette.grey[50],
              },
            }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 12,
              right: 12,
              width: 28,
              height: 28,
              borderRadius: "50%",
              bgcolor: "success.main",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 11,
              fontWeight: 700,
            }}
          >
            AI
          </Box>
        </Box>

        {(editAttachments.length > 0 || newImages.length > 0) && (
          <Box sx={{ mt: 2 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 1 }}
            >
              Fichiers joints
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {editAttachments.map((att) => (
                <Box
                  key={att.id}
                  sx={{
                    position: "relative",
                    width: 100,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: 1,
                    borderColor: "divider",
                  }}
                >
                  {att.type === "image" ? (
                    <Box
                      component="img"
                      src={att.url}
                      alt={att.name}
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
                        .xlc
                      </Typography>
                    </Box>
                  )}
                  <IconButton
                    size="small"
                    onClick={() => onRemoveAttachment(att.id)}
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
                    {att.name}
                  </Typography>
                </Box>
              ))}

              {newImages.map((file, index) => (
                <Box
                  key={`new-${file.name}-${index}`}
                  sx={{
                    position: "relative",
                    width: 100,
                    borderRadius: 2,
                    overflow: "hidden",
                    border: 1,
                    borderColor: "primary.main",
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
                    onClick={() => onRemoveNewImage(index)}
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

          <Stack direction="row" spacing={1}>
            <CustomButton
              variant="contained"
              color="error"
              startIcon={<Trash2 size={18} />}
              onClick={onDelete}
              disabled={isDeleting}
            >
              {isDeleting ? "Suppression..." : "Supprimer"}
            </CustomButton>
            <CustomButton
              variant="contained"
              color="primary"
              onClick={onSave}
              disabled={isUpdating}
            >
              {isUpdating ? "Enregistrement..." : "Enregistrer"}
            </CustomButton>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
