import { useEffect, useState } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

import type { SharedMediaFile } from "../data/types";
import SpreadsheetTable from "./SpreadsheetTable";
import { useSpreadsheetPreview } from "../hooks/useSpreadsheetPreview";
import { useDocxPreview } from "../hooks/useDocxPreview";

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

  const isCSV = file?.type === "xls" && /\.csv$/i.test(file?.name ?? "");
  const isXlsx =
    file?.type === "xls" && /\.(xls|xlsx)$/i.test(file?.name ?? "") && !isCSV;
  const isDocx = file?.type === "doc" && /\.docx$/i.test(file?.name ?? "");
  const isLegacyDoc =
    file?.type === "doc" && /\.doc$/i.test(file?.name ?? "") && !isDocx;

  // XLS/XLSX — SheetJS (full rows for modal)
  const xlsxState = useSpreadsheetPreview(
    isXlsx && validUrl ? file?.previewUrl : undefined,
    isXlsx && validUrl,
    50,
    20,
    false,
  );

  // CSV — PapaParse (full rows for modal)
  const csvState = useSpreadsheetPreview(
    isCSV && validUrl ? file?.previewUrl : undefined,
    isCSV && validUrl,
    50,
    10,
    true,
  );

  // DOCX — mammoth
  const docxState = useDocxPreview(
    isDocx && validUrl ? file?.previewUrl : undefined,
    isDocx && validUrl,
  );

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

  // Honest "cannot preview" fallback for binary formats and truly broken files
  const renderNotPreviewable = (
    icon: React.ReactNode,
    title: string,
    message: string,
  ) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        px: 4,
        py: 5,
        gap: 1.5,
      }}
    >
      {icon}
      <Typography sx={{ fontSize: 15, fontWeight: 600, color: "#111827" }}>
        {title}
      </Typography>
      <Typography
        sx={{ fontSize: 13, color: "#6B7280", maxWidth: 380, lineHeight: 1.6 }}
      >
        {message}
      </Typography>
    </Box>
  );

  const renderPreviewArea = () => {
    if (!file) return null;

    // ── Image ────────────────────────────────────────────────────────────
    if (file.type === "image" && validUrl && !imageFailed) {
      return (
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
      );
    }

    if (file.type === "image") {
      return renderNotPreviewable(
        <ImageOutlinedIcon sx={{ fontSize: 56, color: "#64748B" }} />,
        "Image non disponible",
        "L'image ne peut pas être chargée. Elle est peut-être inaccessible ou le lien a expiré.",
      );
    }

    // ── PDF ──────────────────────────────────────────────────────────────
    if (file.type === "pdf" && validUrl) {
      return (
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
      );
    }

    if (file.type === "pdf") {
      return renderNotPreviewable(
        <PictureAsPdfOutlinedIcon sx={{ fontSize: 56, color: "#E53935" }} />,
        "PDF non disponible",
        "Le fichier PDF ne peut pas être chargé. Il est peut-être inaccessible ou le lien a expiré.",
      );
    }

    // ── CSV (PapaParse — real content preview) ───────────────────────────
    if (isCSV && validUrl) {
      if (csvState.status === "loading" || csvState.status === "idle") {
        return <CircularProgress size={28} sx={{ color: "#16A34A" }} />;
      }
      if (
        csvState.status === "ready" &&
        (csvState.headers.length > 0 || csvState.rows.length > 0)
      ) {
        return (
          <Box
            sx={{
              width: "100%",
              maxHeight: 420,
              overflowY: "auto",
              overflowX: "auto",
              borderRadius: "8px",
              border: "1px solid #D1FAE5",
            }}
          >
            <SpreadsheetTable
              headers={csvState.headers}
              rows={csvState.rows}
              variant="full"
            />
          </Box>
        );
      }
    }

    // ── XLS/XLSX — real SheetJS preview ──────────────────────────────────
    if (isXlsx && validUrl) {
      if (xlsxState.status === "loading" || xlsxState.status === "idle") {
        return <CircularProgress size={28} sx={{ color: "#16A34A" }} />;
      }
      if (xlsxState.status === "ready" && xlsxState.rows.length > 0) {
        return (
          <Box
            sx={{
              width: "100%",
              maxHeight: 420,
              overflowY: "auto",
              overflowX: "auto",
              borderRadius: "8px",
              border: "1px solid #D1FAE5",
            }}
          >
            <SpreadsheetTable
              headers={xlsxState.headers}
              rows={xlsxState.rows}
              variant="full"
            />
          </Box>
        );
      }
      return renderNotPreviewable(
        <TableChartOutlinedIcon sx={{ fontSize: 56, color: "#16A34A" }} />,
        "Fichier Excel vide ou illisible",
        "Le fichier n'a pas pu être analysé.",
      );
    }

    // ── XLS/XLSX (binary — cannot preview without SheetJS) ────────────────
    if (file.type === "xls") {
      return renderNotPreviewable(
        <TableChartOutlinedIcon sx={{ fontSize: 56, color: "#16A34A" }} />,
        "Prévisualisation non disponible",
        "Les fichiers Excel (XLS/XLSX) ne peuvent pas être prévisualisés directement dans le navigateur. Téléchargez le fichier pour l'ouvrir dans votre application de tableur.",
      );
    }

    // ── DOCX — real mammoth preview ───────────────────────────────────────
    if (isDocx && validUrl) {
      if (docxState.status === "loading" || docxState.status === "idle") {
        return <CircularProgress size={28} sx={{ color: "#2563EB" }} />;
      }
      if (docxState.status === "ready" && docxState.html) {
        return (
          <Box
            sx={{
              width: "100%",
              maxHeight: 420,
              overflowY: "auto",
              borderRadius: "8px",
              border: "1px solid #DBEAFE",
              backgroundColor: "#fff",
              p: 2,
              fontSize: 13,
              lineHeight: 1.7,
              color: "#1F2937",
              "& h1,& h2,& h3": { fontWeight: 700, mb: 0.5 },
              "& p": { mb: 0.5 },
              "& table": { borderCollapse: "collapse", width: "100%" },
              "& td,& th": { border: "1px solid #D1D5DB", px: 1, py: 0.5 },
            }}
            dangerouslySetInnerHTML={{ __html: docxState.html }}
          />
        );
      }
      return renderNotPreviewable(
        <DescriptionOutlinedIcon sx={{ fontSize: 56, color: "#2563EB" }} />,
        "Conversion échouée",
        "Le fichier DOCX n'a pas pu être converti. Il est peut-être corrompu ou protégé.",
      );
    }

    // ── Legacy .doc — honest fallback (mammoth cannot parse binary .doc) ──
    if (isLegacyDoc) {
      return renderNotPreviewable(
        <DescriptionOutlinedIcon sx={{ fontSize: 56, color: "#2563EB" }} />,
        "Format .doc non supporté",
        "Les fichiers .doc (Word 97-2003) ne peuvent pas être prévisualisés dans le navigateur. Téléchargez le fichier et ouvrez-le dans Microsoft Word ou LibreOffice.",
      );
    }

    // ── DOC/DOCX (binary — cannot preview without mammoth or backend) ─────
    if (file.type === "doc") {
      return renderNotPreviewable(
        <DescriptionOutlinedIcon sx={{ fontSize: 56, color: "#2563EB" }} />,
        "Prévisualisation non disponible",
        "Les documents Word (DOC/DOCX) ne peuvent pas être prévisualisés directement dans le navigateur. Téléchargez le fichier pour l'ouvrir dans votre traitement de texte.",
      );
    }

    // ── Generic fallback ─────────────────────────────────────────────────
    return renderNotPreviewable(
      <ImageOutlinedIcon sx={{ fontSize: 56, color: "#64748B" }} />,
      "Prévisualisation non disponible",
      "Ce type de fichier ne peut pas être prévisualisé dans le navigateur.",
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
            {renderPreviewArea()}
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
