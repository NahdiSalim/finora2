import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";

import CustomButton from "../../../../components/common/CustomButton";
import type { SharedMediaFile } from "../data/types";

type SharedMediaCardProps = {
  file: SharedMediaFile;
  onView: (file: SharedMediaFile) => void;
};

export default function SharedMediaCard({
  file,
  onView,
}: SharedMediaCardProps) {
  const isImage = file.type === "image" && !!file.previewUrl;
  const canDownload = !!file.previewUrl && file.previewUrl !== "#";

  const handleDownload = () => {
    if (!canDownload || !file.previewUrl) return;

    const link = document.createElement("a");
    link.href = file.previewUrl;
    link.download = file.name;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderPreview = () => {
    if (isImage) {
      return (
        <Box
          component="img"
          src={file.previewUrl}
          alt={file.name}
          onError={(e) => {
            e.currentTarget.style.display = "none";
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

    if (file.type === "pdf") {
      return (
        <PictureAsPdfOutlinedIcon sx={{ fontSize: 26, color: "#F04438" }} />
      );
    }

    if (file.type === "doc") {
      return (
        <DescriptionOutlinedIcon sx={{ fontSize: 26, color: "#2563EB" }} />
      );
    }

    if (file.type === "xls") {
      return <TableChartOutlinedIcon sx={{ fontSize: 26, color: "#16A34A" }} />;
    }

    return <ImageOutlinedIcon sx={{ fontSize: 24, color: "#64748B" }} />;
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
          Added {file.uploadedAt}
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
          Download
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
          View
        </CustomButton>
      </Box>
    </Paper>
  );
}
