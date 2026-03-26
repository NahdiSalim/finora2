import Chip from "@mui/material/Chip";
import type { RequestStatus } from "src/types/request";

const STATUS_MAP: Record<
  RequestStatus,
  { label: string; bgColor: string; textColor: string }
> = {
  pending: {
    label: "Pending",
    bgColor: "#FEF3C7",
    textColor: "#D97706",
  },
  in_progress: {
    label: "In progress",
    bgColor: "#E9D5FF",
    textColor: "#7C3AED",
  },
  resolved: {
    label: "Completed",
    bgColor: "#D1FAE5",
    textColor: "#059669",
  },
  rejected: {
    label: "Rejected",
    bgColor: "#FEE2E2",
    textColor: "#DC2626",
  },
  cancelled: {
    label: "Cancelled",
    bgColor: "#F3F4F6",
    textColor: "#6B7280",
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
