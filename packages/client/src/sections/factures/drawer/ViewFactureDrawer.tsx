import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { Download, X } from "lucide-react";

import type { Facture } from "src/types/facture";
import CustomButton from "src/components/common/CustomButton";

interface Props {
  open: boolean;
  onClose: () => void;
  facture: Facture | null;
  onDownloadPdf: (facture: Facture) => void;
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    draft: { label: "Brouillon", color: "#6B7280" },
    sent: { label: "Envoyée", color: "#6B7280" },
    paid: { label: "Payée", color: "#10B981" },
    partial: { label: "Partiel", color: "#F59E0B" },
    overdue: { label: "En retard", color: "#EF4444" },
    cancelled: { label: "Annulée", color: "#6B7280" },
  };
  return configs[status] || configs.draft;
};

export default function ViewFactureDrawer({
  open,
  onClose,
  facture,
  onDownloadPdf,
}: Props) {
  const theme = useTheme();

  if (!facture) return null;

  const statusConfig = getStatusConfig(facture.status);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme2) => theme2.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "95%", sm: 520 },
            height: "calc(100% - 32px)",
            top: "16px",
            right: { xs: "13px", sm: "16px" },
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: theme.palette.common.white,
          borderBottom: `1px solid ${theme.palette.divider}`,
          animation: open
            ? "slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
          "@keyframes slideDown": {
            "0%": { opacity: 0, transform: "translateY(-20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1.5,
          }}
        >
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{ flex: 1, pr: 2, fontSize: { xs: "1rem", sm: "1.125rem" } }}
          >
            {facture.number}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              "&:hover": {
                bgcolor: alpha(theme.palette.grey[500], 0.16),
                color: "text.primary",
              },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>

        {/* Status Badge */}
        <Chip
          label={statusConfig.label}
          sx={{
            bgcolor: alpha(statusConfig.color, 0.1),
            color: statusConfig.color,
            fontWeight: 600,
            fontSize: 11,
            height: 22,
            "& .MuiChip-label": { px: 1.25 },
          }}
        />
      </Box>

      {/* Content */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          overflowY: "auto",
          flex: 1,
        }}
      >
        {/* Info Grid */}
        <Box
          sx={{
            mb: 2,
            p: 1.5,
            bgcolor: theme.palette.common.white,
            borderRadius: 2,
            animation: open
              ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both"
              : "none",
            "@keyframes fadeInUp": {
              "0%": { opacity: 0, transform: "translateY(20px)" },
              "100%": { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {/* Created Date */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.5, display: "block", fontSize: 10 }}
              >
                DATE DE CRÉATION
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ fontSize: 13 }}
              >
                {new Date(facture.createdAt).toLocaleDateString("fr-FR")}
              </Typography>
            </Box>

            {/* Due Date */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.5, display: "block", fontSize: 10 }}
              >
                DATE D&apos;ÉCHÉANCE
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ fontSize: 13 }}
              >
                {new Date(facture.dueDate).toLocaleDateString("fr-FR")}
              </Typography>
            </Box>

            {/* TVA Rate */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.5, display: "block", fontSize: 10 }}
              >
                TAUX TVA
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {facture.tvaRate ?? facture.vatRate}%
              </Typography>
            </Box>

            {/* Discount */}
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.5, display: "block", fontSize: 10 }}
              >
                REMISE
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 13 }}>
                {facture.discountType === "percentage"
                  ? `${facture.discountValue}%`
                  : facture.discountValue !== null
                    ? formatAmount(facture.discountValue)
                    : "0.00 DT"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Notes */}
        {facture.notes && (
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              bgcolor: theme.palette.common.white,
              borderRadius: 2,
              animation: open
                ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both"
                : "none",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{ mb: 0.5, display: "block", fontSize: 10 }}
            >
              NOTES
            </Typography>
            <Typography
              variant="body2"
              sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}
            >
              {facture.notes}
            </Typography>
          </Box>
        )}

        {/* Product Lines */}
        <Box
          sx={{
            mb: 2,
            animation: open
              ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both"
              : "none",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ mb: 1, display: "block", fontSize: 10 }}
          >
            LIGNES DE PRODUIT ({facture.lines.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {facture.lines.map((line) => (
              <Box
                key={line.id}
                sx={{
                  p: 1.5,
                  bgcolor: theme.palette.common.white,
                  borderRadius: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {line.description}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Typography variant="caption" color="text.secondary">
                    Qté: {line.quantity} × {formatAmount(line.unitPrice)}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {formatAmount(line.quantity * line.unitPrice)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Financial Summary */}
        <Box
          sx={{
            p: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            animation: open
              ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both"
              : "none",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Montant HT
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatAmount(facture.amountHT ?? facture.subtotal ?? 0)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              TVA ({facture.tvaRate ?? facture.vatRate}%)
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatAmount(facture.amountTVA ?? facture.vatAmount ?? 0)}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box
            sx={{ display: "flex", justifyContent: "space-between", mb: 1.5 }}
          >
            <Typography variant="subtitle1" fontWeight={700}>
              Total TTC
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="primary.main"
            >
              {formatAmount(facture.amountTTC ?? facture.total ?? 0)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="body2" color="text.secondary">
              Montant restant
            </Typography>
            <Typography
              variant="body2"
              fontWeight={700}
              color={
                (facture.amountRemaining ?? facture.remainingAmount ?? 0) > 0
                  ? "error.main"
                  : "success.main"
              }
            >
              {formatAmount(
                facture.amountRemaining ?? facture.remainingAmount ?? 0,
              )}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 1.5 },
          bgcolor: theme.palette.common.white,
          borderTop: `1px solid ${theme.palette.divider}`,
          animation: open
            ? "slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both"
            : "none",
          "@keyframes slideUp": {
            "0%": { opacity: 0, transform: "translateY(20px)" },
            "100%": { opacity: 1, transform: "translateY(0)" },
          },
        }}
      >
        <CustomButton
          variant="contained"
          startIcon={<Download size={18} />}
          onClick={() => onDownloadPdf(facture)}
          fullWidth
          size="large"
          sx={{
            fontSize: 14,
            fontWeight: 600,
            bgcolor: "#10B981",
            "&:hover": {
              bgcolor: "#059669",
            },
          }}
        >
          Télécharger PDF
        </CustomButton>
      </Box>
    </Drawer>
  );
}
