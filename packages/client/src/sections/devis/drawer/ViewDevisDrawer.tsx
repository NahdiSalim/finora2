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

import type { Devis } from "src/types/devis";
import CustomButton from "src/components/common/CustomButton";

interface Props {
  open: boolean;
  onClose: () => void;
  devis: Devis | null;
  onDownloadPdf: (devis: Devis) => void;
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const getStatusConfig = (status: string) => {
  const configs: Record<string, { label: string; color: string }> = {
    en_attente: { label: "En attente", color: "#F59E0B" },
    accepte: { label: "Accepté", color: "#10B981" },
    refuse: { label: "Refusé", color: "#EF4444" },
  };
  return configs[status] || configs.en_attente;
};

export default function ViewDevisDrawer({
  open,
  onClose,
  devis,
  onDownloadPdf,
}: Props) {
  const theme = useTheme();

  if (!devis) return null;

  const statusConfig = getStatusConfig(devis.status);

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
            {devis.number}
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

      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          overflowY: "auto",
          flex: 1,
        }}
      >
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
                {new Date(devis.createdAt).toLocaleDateString("fr-FR")}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                fontWeight={600}
                sx={{ mb: 0.5, display: "block", fontSize: 10 }}
              >
                VALIDE JUSQU&apos;AU
              </Typography>
              <Typography
                variant="body2"
                fontWeight={500}
                sx={{ fontSize: 13 }}
              >
                {new Date(devis.validUntil).toLocaleDateString("fr-FR")}
              </Typography>
            </Box>

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
                {devis.tvaRate}%
              </Typography>
            </Box>
          </Box>
        </Box>

        {devis.notes && (
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
              {devis.notes}
            </Typography>
          </Box>
        )}

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
            LIGNES DE PRODUIT ({devis.lines.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {devis.lines.map((line) => (
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
              {formatAmount(devis.amountHT)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              TVA ({devis.tvaRate}%)
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {formatAmount(devis.amountTVA)}
            </Typography>
          </Box>
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            <Typography variant="subtitle1" fontWeight={700}>
              Total TTC
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={700}
              color="primary.main"
            >
              {formatAmount(devis.amountTTC)}
            </Typography>
          </Box>
        </Box>
      </Box>

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
          onClick={() => onDownloadPdf(devis)}
          fullWidth
          size="large"
          sx={{
            fontSize: 14,
            fontWeight: 600,
            bgcolor: "#3B82F6",
            "&:hover": {
              bgcolor: "#2563EB",
            },
          }}
        >
          Télécharger PDF
        </CustomButton>
      </Box>
    </Drawer>
  );
}
