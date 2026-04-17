import { Chip, alpha } from "@mui/material";

interface Props {
  amountPaid: number;
  amountRemaining: number;
}

export default function FacturePaymentChip({
  amountPaid,
  amountRemaining,
}: Props) {
  const paid = amountPaid ?? 0;
  const remaining = amountRemaining ?? 0;

  if (paid > 0 && remaining <= 0.01) {
    return (
      <Chip
        label="Payée"
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: 11,
          color: "#10B981",
          bgcolor: alpha("#10B981", 0.12),
          border: "none",
        }}
      />
    );
  }

  if (paid > 0 && remaining > 0.01) {
    return (
      <Chip
        label="Partiel"
        size="small"
        sx={{
          fontWeight: 600,
          fontSize: 11,
          color: "#F59E0B",
          bgcolor: alpha("#F59E0B", 0.12),
          border: "none",
        }}
      />
    );
  }

  return (
    <Chip
      label="Non payée"
      size="small"
      sx={{
        fontWeight: 600,
        fontSize: 11,
        color: "#9CA3AF",
        bgcolor: alpha("#9CA3AF", 0.08),
        border: "none",
      }}
    />
  );
}
