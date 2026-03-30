import { useState } from "react";
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  IconButton,
  alpha,
} from "@mui/material";
import { FileText, Upload, Plus, X, Volume2, Download } from "lucide-react";
import { FileCard } from "./file-card";
import CustomButton from "src/components/common/CustomButton";
import FileUpload from "src/components/common/FileUpload";
import { useUpdateTaskMutation } from "src/lib/services/tasksApi";
import type { Task } from "../types";

interface DocumentsContentProps {
  task: Task;
  onUpdate?: () => void;
}

export function DocumentsContent({ task, onUpdate }: DocumentsContentProps) {
  const theme = useTheme();
  const [fileSlots, setFileSlots] = useState<Array<File | null>>([null]);
  const [updateTask, { isLoading: isUploading, error: uploadError }] =
    useUpdateTaskMutation();

  const API_BASE = import.meta.env.VITE_API_URL ?? "";

  const getFileType = (
    fileName: string,
  ): "pdf" | "xls" | "docx" | "png" | "jpg" | "audio" | "other" => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "xls" || ext === "xlsx") return "xls";
    if (ext === "doc" || ext === "docx") return "docx";
    if (ext === "png") return "png";
    if (ext === "jpg" || ext === "jpeg") return "jpg";
    if (["mp3", "wav", "m4a", "ogg", "webm"].includes(ext || ""))
      return "audio";
    return "other";
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newSlots = [...fileSlots];
    newSlots[index] = file;
    setFileSlots(newSlots);
  };

  const handleAddFileSlot = () => {
    setFileSlots([...fileSlots, null]);
  };

  const handleRemoveFileSlot = (index: number) => {
    if (fileSlots.length === 1) {
      setFileSlots([null]);
    } else {
      setFileSlots(fileSlots.filter((_, i) => i !== index));
    }
  };

  const handleUpload = async () => {
    const filesToUpload = fileSlots.filter((f): f is File => f !== null);
    if (filesToUpload.length === 0) return;

    try {
      const formData = new FormData();
      filesToUpload.forEach((file) => {
        formData.append("attachments", file);
      });

      await updateTask({ id: task.id, data: formData }).unwrap();
      setFileSlots([null]);
      if (onUpdate) onUpdate();
    } catch (error) {
      // Failed to upload files
    }
  };

  const handleDownload = async (filePath: string) => {
    try {
      const token = localStorage.getItem("token");
      const fileName = filePath.split("/").pop();

      const response = await fetch(
        `${API_BASE}/documents/download-file?filePath=${encodeURIComponent(filePath)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );

      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      // Download error
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 3, sm: 4 },
      }}
    >
      {uploadError && (
        <Alert severity="error">
          Erreur lors du téléchargement des fichiers
        </Alert>
      )}

      {/* Documents de la tâche */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mb: 2,
          }}
        >
          <FileText size={20} color={theme.palette.text.secondary} />
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: 16,
              color: theme.palette.text.primary,
            }}
          >
            Documents ({task.attachments?.length || 0})
          </Typography>
        </Box>
        {task.attachments && task.attachments.length > 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {task.attachments.map((filePath, index) => {
              const fileName = filePath.split("/").pop() || filePath;
              const fileType = getFileType(fileName);
              const fileExtension = fileName.split(".").pop()?.toLowerCase();
              const attachmentUrl = task.attachmentUrls?.[index] || filePath;

              // Audio files get special treatment
              if (fileType === "audio") {
                return (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                      borderRadius: 2,
                      border: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        mb: 1.5,
                      }}
                    >
                      <Box
                        sx={{
                          width: 36,
                          height: 36,
                          bgcolor: theme.palette.primary.main,
                          borderRadius: 1,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Volume2 size={20} color="white" />
                      </Box>
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          sx={{ fontSize: 13 }}
                        >
                          Message vocal
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontSize: 11 }}
                        >
                          {fileName}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const link = document.createElement("a");
                          link.href = attachmentUrl;
                          link.download = fileName;
                          link.target = "_blank";
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        sx={{
                          width: 32,
                          height: 32,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          color: theme.palette.text.secondary,
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        <Download size={14} />
                      </IconButton>
                    </Box>
                    <audio
                      key={`task-audio-${index}`}
                      controls
                      style={{ width: "100%", height: 40 }}
                      preload="metadata"
                      src={attachmentUrl}
                    >
                      Votre navigateur ne supporte pas la lecture audio.
                    </audio>
                  </Box>
                );
              }

              // Regular files
              return (
                <FileCard
                  key={index}
                  file={{
                    id: String(index),
                    name: fileName,
                    type: fileType as
                      | "pdf"
                      | "xls"
                      | "docx"
                      | "png"
                      | "jpg"
                      | "other",
                    thumbnail: "",
                  }}
                  onDownload={() => handleDownload(filePath)}
                />
              );
            })}
          </Box>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: "center", py: 4 }}
          >
            Aucun document attaché
          </Typography>
        )}
      </Box>

      {/* Upload Zone */}
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: 16,
            color: theme.palette.text.primary,
            mb: 2,
          }}
        >
          Ajouter des documents
        </Typography>

        {fileSlots.map((file, index) => (
          <Box key={index} sx={{ mb: 2, position: "relative" }}>
            <FileUpload
              label={index === 0 ? "Documents" : `Document ${index + 1}`}
              value={file}
              onChange={(newFile) => handleFileChange(index, newFile)}
              acceptedFiles={[
                ".pdf",
                ".doc",
                ".docx",
                ".xls",
                ".xlsx",
                ".jpg",
                ".jpeg",
                ".png",
              ]}
              maxSize={50}
            />
            {fileSlots.length > 1 && (
              <IconButton
                size="small"
                onClick={() => handleRemoveFileSlot(index)}
                sx={{
                  position: "absolute",
                  top: 0,
                  right: 0,
                  color: theme.palette.error.main,
                }}
              >
                <X size={18} />
              </IconButton>
            )}
          </Box>
        ))}

        <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
          <CustomButton
            variant="outlined"
            onClick={handleAddFileSlot}
            startIcon={<Plus size={16} />}
            sx={{ flex: 1 }}
          >
            Ajouter un fichier
          </CustomButton>
          <CustomButton
            variant="contained"
            onClick={handleUpload}
            disabled={isUploading || !fileSlots.some((f) => f !== null)}
            startIcon={
              isUploading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <Upload size={16} />
              )
            }
            sx={{ flex: 1 }}
          >
            {isUploading ? "Téléchargement..." : "Télécharger"}
          </CustomButton>
        </Box>
      </Box>
    </Box>
  );
}
