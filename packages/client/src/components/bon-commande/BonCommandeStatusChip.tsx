import { Chip , alpha } from "@mui/material";
import type { BonCommandeStatus } from "src/types/bon-commande";

const STATUS_MAP: Record<BonCommandeStatus, { label: string; color: string }> =
  {
    brouillon: { label: "Brouillon", color: "#6B7280" },
    confirme: { label: "Confirmé", color: "#10B981" },
    annule: { label: "Annulé", color: "#ff5757" },
  };

export default function BonCommandeStatusChip({
  status,
}: {
  status: BonCommandeStatus;
}) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.brouillon;
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
