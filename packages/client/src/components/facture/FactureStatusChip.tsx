import { Chip, alpha } from "@mui/material";
import type { FactureStatus } from "src/types/facture";

interface Config {
  label: string;
  color: string;
}

const statusConfig: Record<FactureStatus, Config> = {
  draft: { label: "Brouillon", color: "#6B7280" },
  sent: { label: "Envoyée", color: "#3B82F6" },
  overdue: { label: "En retard", color: "#EF4444" },
  paid: { label: "Envoyée", color: "#3B82F6" }, // legacy: was sent then paid
  partial: { label: "Envoyée", color: "#3B82F6" }, // legacy: was sent then partial
  cancelled: { label: "Annulée", color: "#6B7280" },
};

interface Props {
  status: FactureStatus;
}

export default function FactureStatusChip({ status }: Props) {
  const cfg = statusConfig[status] ?? statusConfig.draft;
  return (
    <Chip
      label={cfg.label}
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: 11,
        color: cfg.color,
        bgcolor: alpha(cfg.color, 0.12),
        border: "none",
      }}
    />
  );
}
