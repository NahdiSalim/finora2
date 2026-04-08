import { Chip } from "@mui/material";
import type { FactureStatus } from "src/types/facture";

const labelMap: Record<FactureStatus, string> = {
  brouillon: "Brouillon",
  payee: "Payée",
  partiel: "Partiel",
  en_retard: "En retard",
};

const colorMap: Record<
  FactureStatus,
  "default" | "success" | "warning" | "error"
> = {
  brouillon: "default",
  payee: "success",
  partiel: "warning",
  en_retard: "error",
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
