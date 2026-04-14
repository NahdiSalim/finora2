import { Chip } from "@mui/material";
import type { FactureStatus } from "src/types/facture";

const labelMap: Record<FactureStatus, string> = {
  draft: "Brouillon",
  sent: "Envoyée",
  paid: "Payée",
  partial: "Partiel",
  overdue: "En retard",
  cancelled: "Annulée",
};

const colorMap: Record<
  FactureStatus,
  "default" | "success" | "warning" | "error"
> = {
  draft: "default",
  sent: "default",
  paid: "success",
  partial: "warning",
  overdue: "error",
  cancelled: "default",
};

interface Props {
  status: FactureStatus;
}

export default function FactureStatusChip({ status }: Props) {
  return (
    <Chip
      label={labelMap[status]}
      color={colorMap[status]}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
}
