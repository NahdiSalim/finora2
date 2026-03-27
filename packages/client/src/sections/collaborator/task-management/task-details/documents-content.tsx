import { useState } from "react";
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
  IconButton,
} from "@mui/material";
import { FileText, Upload, Plus, X } from "lucide-react";
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
  ): "pdf" | "xls" | "docx" | "png" | "jpg" | "other" => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return "pdf";
    if (ext === "xls" || ext === "xlsx") return "xls";
    if (ext === "doc" || ext === "docx") return "docx";
    if (ext === "png") return "png";
    if (ext === "jpg" || ext === "jpeg") return "jpg";
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
              display: "grid",
              gridTemplateColumns: {
                xs: "repeat(1, 1fr)",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: { xs: 1.5, sm: 2 },
            }}
          >
            {task.attachments.map((filePath, index) => {
              const fileName = filePath.split("/").pop() || filePath;
              return (
                <FileCard
                  key={index}
                  file={{
                    id: String(index),
                    name: fileName,
                    type: getFileType(fileName),
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
