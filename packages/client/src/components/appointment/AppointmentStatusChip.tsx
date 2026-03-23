import Chip from "@mui/material/Chip";
import { alpha, useTheme } from "@mui/material/styles";
import type { AppointmentStatus } from "src/lib/services/appointmentsApi";

const MAP: Record<
  AppointmentStatus,
  { label: string; color: "success" | "warning" | "error" | "info" | "default" }
> = {
  pending: { label: "En attente", color: "warning" },
  confirmed: { label: "Approuvé", color: "success" },
  rescheduled: { label: "Replanifié", color: "info" },
  rejected: { label: "Refusé", color: "error" },
  cancelled: { label: "Annulé", color: "default" },
  completed: { label: "Terminé", color: "default" },
};

export default function AppointmentStatusChip({
  status,
  size = "small",
}: {
  status: AppointmentStatus;
  size?: "small" | "medium";
}) {
  const theme = useTheme();
  const cfg = MAP[status] ?? MAP.pending;
  const colorMain =
    cfg.color === "success"
      ? theme.palette.success.main
      : cfg.color === "warning"
        ? theme.palette.warning.main
        : cfg.color === "error"
          ? theme.palette.error.main
          : cfg.color === "info"
            ? theme.palette.info.main
            : theme.palette.grey[500];

  return (
    <Chip
      size={size}
      label={cfg.label}
      sx={{
        bgcolor: alpha(colorMain, 0.12),
        color: colorMain,
        fontWeight: 600,
      }}
    />
  );
}
