import { Chip , alpha } from "@mui/material";
import type { BonLivraisonStatus } from "src/types/bon-livraison";

const STATUS_MAP: Record<BonLivraisonStatus, { label: string; color: string }> =
  {
    en_attente: { label: "En attente", color: "#ff7d0d" },
    livre: { label: "Livré", color: "#10B981" },
    annule: { label: "Annulé", color: "#ff5757" },
  };

export default function BonLivraisonStatusChip({
  status,
}: {
  status: BonLivraisonStatus;
}) {
  const cfg = STATUS_MAP[status] ?? STATUS_MAP.en_attente;
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
