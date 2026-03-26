import Chip from "@mui/material/Chip";
import type { RequestUrgency } from "src/types/request";

const PRIORITY_MAP: Record<
  RequestUrgency,
  { label: string; bgColor: string; textColor: string }
> = {
  low: {
    label: "Low",
    bgColor: "#DBEAFE",
    textColor: "#1E40AF",
  },
  normal: {
    label: "Medium",
    bgColor: "#FEF3C7",
    textColor: "#D97706",
  },
  high: {
    label: "High",
    bgColor: "#FED7AA",
    textColor: "#EA580C",
  },
  urgent: {
    label: "Urgent !",
    bgColor: "#FEE2E2",
    textColor: "#DC2626",
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
        bgcolor: cfg.bgColor,
        color: cfg.textColor,
        fontWeight: 600,
        borderRadius: 2,
        fontSize: size === "small" ? 12 : 14,
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
