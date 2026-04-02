import Chip from "@mui/material/Chip";
import { alpha } from "@mui/material";
import type { RequestStatus } from "src/types/request";

const STATUS_MAP: Record<RequestStatus, { label: string; color: string }> = {
  pending: {
    label: "En attente",
    color: "#ff7d0d", // Warm amber/orange from theme warning
  },
  in_progress: {
    label: "En cours",
    color: "#8B5CF6", // Vibrant violet/indigo
  },
  resolved: {
    label: "Terminé",
    color: "#10B981", // Emerald green (success)
  },
  rejected: {
    label: "Rejeté",
    color: "#ff5757", // Coral red from theme error
  },
  cancelled: {
    label: "Annulé",
    color: "#6B7280", // Neutral gray
  },
};

export default function RequestStatusChip({
  status,
  size = "medium",
}: {
  status: RequestStatus;
  size?: "small" | "medium";
}) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.pending;

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
