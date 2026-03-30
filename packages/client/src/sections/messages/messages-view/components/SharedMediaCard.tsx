import { useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

import CustomButton from "../../../../components/common/CustomButton";
import type { SharedMediaFile } from "../data/types";

type SharedMediaCardProps = {
  file: SharedMediaFile;
  onView: (file: SharedMediaFile) => void;
  onImageError?: () => void;
};

export default function SharedMediaCard({
  file,
  onView,
  onImageError,
}: SharedMediaCardProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const canDownload = !!file.previewUrl && file.previewUrl !== "#";

  // If the image URL failed to load, render nothing (parent will remove this card)
  if (imgFailed) return null;

  const handleDownload = async () => {
    if (!canDownload || !file.previewUrl) return;
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

  const renderPreview = () => {
    // ── Image ──────────────────────────────────────────────────────────
    if (file.type === "image") {
      if (file.previewUrl && !imgFailed) {
        return (
          <Box
            component="img"
            src={file.previewUrl}
            alt={file.name}
            onError={() => {
              setImgFailed(true);
              onImageError?.();
            }}
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        );
      }
      return <ImageOutlinedIcon sx={{ fontSize: 26, color: "#64748B" }} />;
    }

    // ── PDF — iframe thumbnail ─────────────────────────────────────────
    // Approach: absolutely-positioned iframe, 3× the container size, scaled
    // back down 0.333× from the top-left so it fills the box exactly.
    //
    // Key detail: add #view=FitH so the PDF viewer scales the page to FILL
    // the iframe WIDTH (not height). Without this, Chrome PDF viewer defaults
    // to "fit page" (fits height), leaving gray space on the right.
    //
    // +20px on both dimensions: after scale(0.333) this adds ~7px of clip
    // margin, hiding the PDF viewer's scrollbar edge from the visible area.
    if (file.type === "pdf") {
      if (file.previewUrl) {
        return (
          <Box
            component="iframe"
            src={`${file.previewUrl}#toolbar=0&navpanes=0&view=FitH`}
            title={file.name}
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "calc(300% + 20px)",
              height: "calc(300% + 20px)",
              border: "none",
              pointerEvents: "none",
              transform: "scale(0.333)",
              transformOrigin: "0 0",
              backgroundColor: "#fff",
            }}
          />
        );
      }
      return (
        <PictureAsPdfOutlinedIcon sx={{ fontSize: 26, color: "#F04438" }} />
      );
    }

    // ── Doc ────────────────────────────────────────────────────────────
    if (file.type === "doc") {
      return (
        <DescriptionOutlinedIcon sx={{ fontSize: 26, color: "#2563EB" }} />
      );
    }

    // ── Xls ────────────────────────────────────────────────────────────
    if (file.type === "xls") {
      return <TableChartOutlinedIcon sx={{ fontSize: 26, color: "#16A34A" }} />;
    }

    // ── Generic file fallback ──────────────────────────────────────────
    return (
      <InsertDriveFileOutlinedIcon sx={{ fontSize: 26, color: "#64748B" }} />
    );
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        minWidth: 0,
        height: 182,
        p: 0.75,
        borderRadius: "14px",
        border: "1px solid #ECECEC",
        backgroundColor: "#FFFFFF",
        display: "flex",
        flexDirection: "column",
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: 96,
          borderRadius: "10px",
          overflow: "hidden",
          backgroundColor: "#F8F9FB",
          border: "1px solid #F1F1F1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          mb: 0.7,
          position: "relative",
        }}
      >
        {renderPreview()}
      </Box>

      <Box
        sx={{
          minWidth: 0,
          flexShrink: 0,
          mb: 0.7,
        }}
      >
        <Typography
          noWrap
          title={file.name}
          sx={{
            fontSize: 11.5,
            fontWeight: 500,
            color: "#1F2937",
            lineHeight: 1.2,
          }}
        >
          {file.name}
        </Typography>

        <Typography
          noWrap
          sx={{
            mt: 0.2,
            fontSize: 10,
            color: "#98A2B3",
            lineHeight: 1.2,
          }}
        >
          {file.uploadedAt}
        </Typography>
      </Box>

      <Box
        sx={{
          mt: "auto",
          display: "flex",
          alignItems: "center",
          gap: 0.55,
          flexShrink: 0,
        }}
      >
        <CustomButton
          fullWidth
          variant="outlined"
          color="secondary"
          onClick={handleDownload}
          startIcon={<DownloadOutlinedIcon sx={{ fontSize: 11 }} />}
          sx={{
            flex: 1,
            height: 24,
            minHeight: 24,
            minWidth: 0,
            px: 0.75,
            borderRadius: "8px",
            fontSize: 9,
            fontWeight: 500,
            borderColor: "#E4E7EC",
            color: "#344054",
            backgroundColor: "#FFFFFF",
            boxShadow: "none",
          }}
        >
          Télécharger
        </CustomButton>

        <CustomButton
          fullWidth
          variant="contained"
          color="primary"
          startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 11 }} />}
          onClick={() => onView(file)}
          sx={{
            flex: 1,
            height: 24,
            minHeight: 24,
            minWidth: 0,
            px: 0.75,
            borderRadius: "8px",
            fontSize: 9,
            fontWeight: 500,
            boxShadow: "none",
          }}
        >
          Voir
        </CustomButton>
      </Box>
    </Paper>
  );
}
