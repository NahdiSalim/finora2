import { Chip, alpha } from "@mui/material";
import type { FactureStatus } from "src/types/facture";

const STATUS_MAP: Record<FactureStatus, { label: string; color: string }> = {
  draft: { label: "Brouillon", color: "#6B7280" },
  review: { label: "En révision", color: "#F59E0B" },
  sent: { label: "Envoyée", color: "#6366F1" },
  paid: { label: "Payée", color: "#10B981" },
  partial: { label: "Partielle", color: "#ff7d0d" },
  overdue: { label: "En retard", color: "#ff5757" },
  cancelled: { label: "Annulée", color: "#6B7280" },
};

export default function FactureStatusChip({
  status,
}: {
  status: FactureStatus;
}) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.draft;
  return (
    <Chip
      size="small"
      label={cfg.label}
      sx={{
        bgcolor: alpha(cfg.color, 0.08),
        color: cfg.color,
        fontWeight: 600,
        borderRadius: 2.5,
        fontSize: 12,
        border: `1px solid ${alpha(cfg.color, 0.25)}`,
        px: 1.5,
        py: 0.5,
        height: "auto",
        "& .MuiChip-label": { px: 1, py: 0.5 },
      }}
    />
  );
}
