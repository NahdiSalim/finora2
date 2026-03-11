import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { File as FileIcon, FileText, X } from "lucide-react";
import { useEffect, useState } from "react";
import CustomButton from "src/components/common/CustomButton";
import ImageIcon from "src/components/common/imageIcon";
import PdfIcon from "src/components/common/pdfIcon";
import XlsIcon from "src/components/common/xlsIcon";
import type { FileType } from "src/components/common/File";
import { useDownloadDocumentMutation } from "src/lib/services/documentsApi";

const previewFileTypeIcons: Record<FileType, React.ReactNode> = {
  pdf: <PdfIcon />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <XlsIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  other: <FileIcon size={24} color="#6B7280" />,
};

export interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentId: number;
  fileName: string;
  fileType: FileType;
  mimeType?: string | null;
  onDownloadDocument: (id: number, displayName?: string) => void;
}

export function DocumentPreviewModal({
  open,
  onClose,
  documentId,
  fileName,
  fileType,
  mimeType,
  onDownloadDocument,
}: DocumentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloadDocument] = useDownloadDocumentMutation();
  const theme = useTheme();

  useEffect(() => {
    if (!open || !documentId) {
      setBlobUrl(null);
      return undefined;
    }
    let revoked = false;
    downloadDocument(documentId)
      .unwrap()
      .then(({ blob }) => {
        if (!revoked) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null);
      });
    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when open/documentId change
  }, [open, documentId]);

  const isPdf = fileType === "pdf";
  const isImage =
    fileType === "jpg" ||
    fileType === "png" ||
    (mimeType && mimeType.toLowerCase().startsWith("image/"));
  const canPreview = isPdf || isImage;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: "1.125rem",
          py: 1,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Aperçu du document
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 400,
            maxHeight: "90vh",
            bgcolor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
          }}
        >
          {!blobUrl && (
            <Typography color="text.secondary">
              Chargement de l&apos;aperçu…
            </Typography>
          )}
          {blobUrl && isPdf && (
            <embed
              src={blobUrl}
              type="application/pdf"
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "white",
              }}
              title={fileName}
            />
          )}
          {blobUrl && isImage && (
            <Box
              component="img"
              src={blobUrl}
              alt={fileName}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          )}
          {blobUrl && !canPreview && (
            <Typography color="text.secondary">
              Aperçu non disponible pour ce type de fichier.
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ flexShrink: 0 }}>{previewFileTypeIcons[fileType]}</Box>
          <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
            {fileName}
          </Typography>
          <CustomButton
            variant="outlined"
            size="small"
            onClick={() => onDownloadDocument(documentId, fileName)}
          >
            Télécharger
          </CustomButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
