import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

import type { SharedMediaFile } from "../data/types";

type SharedMediaPreviewModalProps = {
  open: boolean;
  file: SharedMediaFile | null;
  onClose: () => void;
};

export default function SharedMediaPreviewModal({
  open,
  file,
  onClose,
}: SharedMediaPreviewModalProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const validUrl =
    !!file?.previewUrl &&
    file.previewUrl.trim() !== "" &&
    file.previewUrl !== "#";

  useEffect(() => {
    setImageFailed(false);
  }, [file]);

  const handleDownload = async () => {
    if (!file?.previewUrl || file.previewUrl === "#") {
      return;
    }

    try {
      const response = await fetch(file.previewUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(file.previewUrl, "_blank", "noopener,noreferrer");
    }
  };

  const renderFallbackPreview = () => {
    if (!file) return null;

    if (file.type === "pdf") {
      return (
        <>
          <PictureAsPdfOutlinedIcon
            sx={{
              fontSize: 72,
              color: "#E53935",
            }}
          />
          <Typography
            sx={{
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Aperçu du fichier PDF
          </Typography>
        </>
      );
    }

    if (file.type === "xls") {
      return (
        <>
          <TableChartOutlinedIcon
            sx={{
              fontSize: 72,
              color: "#16A34A",
            }}
          />
          <Typography
            sx={{
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Aperçu du fichier Excel
          </Typography>
        </>
      );
    }

    if (file.type === "doc") {
      return (
        <>
          <DescriptionOutlinedIcon
            sx={{
              fontSize: 72,
              color: "#2563EB",
            }}
          />
          <Typography
            sx={{
              fontSize: 14,
              color: "#6B7280",
            }}
          >
            Aperçu du document
          </Typography>
        </>
      );
    }

    return (
      <>
        <ImageOutlinedIcon
          sx={{
            fontSize: 72,
            color: "#64748B",
          }}
        />
        <Typography
          sx={{
            fontSize: 14,
            color: "#6B7280",
          }}
        >
          Aperçu de l’image
        </Typography>
      </>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "20px",
          overflow: "hidden",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 3,
            py: 2.5,
            borderBottom: "1px solid #F1F1F1",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.3,
              }}
              noWrap
            >
              {file?.name || "Prévisualisation du fichier"}
            </Typography>

            {file && (
              <Typography
                sx={{
                  mt: 0.5,
                  fontSize: 13,
                  color: "#8A8A8A",
                }}
              >
                {file.size} • {file.uploadedAt}
              </Typography>
            )}
          </Box>

          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box
          sx={{
            p: 3,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Box
            sx={{
              minHeight: 340,
              borderRadius: "16px",
              backgroundColor: "#F8FAFC",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1.5,
              overflow: "hidden",
            }}
          >
            {file?.type === "image" && validUrl && !imageFailed ? (
              <Box
                component="img"
                src={file.previewUrl}
                alt={file.name || "Aperçu du fichier"}
                onError={() => setImageFailed(true)}
                sx={{
                  width: "100%",
                  maxHeight: 420,
                  objectFit: "contain",
                  display: "block",
                }}
              />
            ) : file?.type === "pdf" && validUrl ? (
              <Box
                component="iframe"
                src={file.previewUrl}
                title={file.name}
                sx={{
                  width: "100%",
                  height: 420,
                  border: "none",
                  display: "block",
                  borderRadius: "8px",
                }}
              />
            ) : (
              renderFallbackPreview()
            )}
          </Box>

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Button
              variant="outlined"
              startIcon={<DownloadOutlinedIcon />}
              onClick={handleDownload}
              disabled={!file?.previewUrl || file.previewUrl === "#"}
              sx={{
                textTransform: "none",
                borderRadius: "10px",
              }}
            >
              Télécharger
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
