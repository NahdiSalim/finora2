import { Chip, alpha } from "@mui/material";
import type { DevisStatus } from "src/types/devis";

const STATUS_MAP: Record<DevisStatus, { label: string; color: string }> = {
  en_attente: { label: "En attente", color: "#ff7d0d" },
  accepte: { label: "Accepté", color: "#10B981" },
  refuse: { label: "Refusé", color: "#ff5757" },
  facture: { label: "Facturé", color: "#6366F1" },
};

export default function DevisStatusChip({ status }: { status: DevisStatus }) {
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
