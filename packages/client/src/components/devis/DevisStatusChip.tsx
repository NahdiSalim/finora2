import { Chip } from "@mui/material";
import type { DevisStatus } from "src/types/devis";

const labelMap: Record<DevisStatus, string> = {
  en_attente: "En attente",
  accepte: "Accepté",
  refuse: "Refusé",
};

const colorMap: Record<DevisStatus, "warning" | "success" | "error"> = {
  en_attente: "warning",
  accepte: "success",
  refuse: "error",
};

interface Props {
  status: DevisStatus;
}

export default function DevisStatusChip({ status }: Props) {
  return (
    <Chip
      label={labelMap[status]}
      color={colorMap[status]}
      size="small"
      sx={{ fontWeight: 600 }}
    />
  );
}
