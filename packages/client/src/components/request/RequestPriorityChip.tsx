import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material";
import type { RequestUrgency } from "src/types/request";

const PRIORITY_MAP: Record<RequestUrgency, { label: string; color: string }> = {
  low: {
    label: "Low",
    color: "#1d61e7", // Primary blue from theme
  },
  normal: {
    label: "Medium",
    color: "#F59E0B", // Medium amber/yellow
  },
  high: {
    label: "High",
    color: "#ff7d0d", // Muted gold/orange from theme warning
  },
  urgent: {
    label: "Urgent !",
    color: "#ff5757", // Coral red from theme error
  },
};

export default function RequestPriorityChip({
  urgency,
  size = "medium",
}: {
  urgency: RequestUrgency;
  size?: "small" | "medium";
}) {
  const cfg = PRIORITY_MAP[urgency] ?? PRIORITY_MAP.normal;

  return (
    <Chip
      size={size}
      label={cfg.label}
      sx={{
        bgcolor: alpha(cfg.color, 0.08),
        color: cfg.color,
        fontWeight: 600,
        borderRadius: 2.5,
        fontSize: size === "small" ? 12 : 14,
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        px: 1.5,
        py: 0.5,
        height: "auto",
        "& .MuiChip-label": {
          px: 1,
          py: 0.5,
        },
      }}
    />
  );
}
