import { Chip, alpha } from "@mui/material";

interface Props {
  amountPaid: number;
  amountRemaining: number;
}

const PAID = { label: "Payée", color: "#10B981" };
const PARTIAL = { label: "Partiel", color: "#ff7d0d" };
const UNPAID = { label: "Non payée", color: "#6B7280" };

export default function FacturePaymentChip({
  amountPaid,
  amountRemaining,
}: Props) {
  const paid = amountPaid ?? 0;
  const remaining = amountRemaining ?? 0;

  const cfg =
    paid > 0 && remaining <= 0.01
      ? PAID
      : paid > 0 && remaining > 0.01
        ? PARTIAL
        : UNPAID;

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
