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
import { Pencil, X } from "lucide-react";
import type { BonCommande } from "src/types/bon-commande";
import CustomButton from "src/components/common/CustomButton";

const fmt = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + " DT";

const statusConfig: Record<string, { label: string; color: string }> = {
  brouillon: { label: "Brouillon", color: "#6B7280" },
  confirme: { label: "Confirmé", color: "#10B981" },
  annule: { label: "Annulé", color: "#EF4444" },
};

interface Props {
  open: boolean;
  onClose: () => void;
  bonCommande: BonCommande | null;
  onEdit?: (bc: BonCommande) => void;
}

export default function ViewBonCommandeDrawer({
  open,
  onClose,
  bonCommande,
  onEdit,
}: Props) {
  const theme = useTheme();
  if (!bonCommande) return null;
  const sc = statusConfig[bonCommande.status] ?? statusConfig.brouillon;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (t) => t.zIndex.modal + 10 }}
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
          bgcolor: "common.white",
          borderBottom: `1px solid ${theme.palette.divider}`,
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
          <Typography variant="h6" fontWeight={600} sx={{ flex: 1, pr: 2 }}>
            {bonCommande.number}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              "&:hover": { bgcolor: alpha(theme.palette.grey[500], 0.16) },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>
        <Chip
          label={sc.label}
          size="small"
          sx={{
            bgcolor: alpha(sc.color, 0.1),
            color: sc.color,
            fontWeight: 600,
            fontSize: 11,
            height: 22,
          }}
        />
      </Box>

      {/* Body */}
      <Box sx={{ p: { xs: 1.5, sm: 2 }, overflowY: "auto", flex: 1 }}>
        {/* Meta */}
        <Box sx={{ mb: 2, p: 1.5, bgcolor: "common.white", borderRadius: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
            }}
          >
            {[
              {
                label: "DATE DE CRÉATION",
                value: new Date(bonCommande.createdAt).toLocaleDateString(
                  "fr-FR",
                ),
              },
              {
                label: "VALIDE JUSQU'AU",
                value: new Date(bonCommande.validUntil).toLocaleDateString(
                  "fr-FR",
                ),
              },
              { label: "TAUX TVA", value: `${bonCommande.tvaRate}%` },
              ...(bonCommande.supplier
                ? [
                    {
                      label: "FOURNISSEUR",
                      value: `${bonCommande.supplier.name} — ${bonCommande.supplier.company}`,
                    },
                  ]
                : []),
            ].map(({ label, value }) => (
              <Box key={label}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                >
                  {label}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ fontSize: 13 }}
                >
                  {value}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Notes */}
        {bonCommande.notes && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "common.white", borderRadius: 2 }}>
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
              sx={{ whiteSpace: "pre-wrap", fontSize: 13 }}
            >
              {bonCommande.notes}
            </Typography>
          </Box>
        )}

        {/* Lines */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            fontWeight={600}
            sx={{ mb: 1, display: "block", fontSize: 10 }}
          >
            LIGNES DE PRODUIT ({bonCommande.lines.length})
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {bonCommande.lines.map((line) => (
              <Box
                key={line.id}
                sx={{
                  p: 1.5,
                  bgcolor: "common.white",
                  borderRadius: 1.5,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              >
                <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                  {line.description}
                </Typography>
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography variant="caption" color="text.secondary">
                    Qté: {line.quantity} × {fmt(line.unitPrice)}
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {fmt(line.quantity * line.unitPrice)}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Totals */}
        <Box
          sx={{
            p: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            borderRadius: 2,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          }}
        >
          {[
            { label: `Montant HT`, value: bonCommande.amountHT },
            {
              label: `TVA (${bonCommande.tvaRate}%)`,
              value: bonCommande.amountTVA,
            },
          ].map(({ label, value }) => (
            <Box
              key={label}
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {fmt(value)}
              </Typography>
            </Box>
          ))}
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
              {fmt(bonCommande.amountTTC)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Footer with Edit button */}
      {onEdit && (
        <Box
          sx={{
            p: { xs: 1.5, sm: 1.5 },
            bgcolor: "common.white",
            borderTop: `1px solid ${theme.palette.divider}`,
          }}
        >
          <CustomButton
            variant="contained"
            startIcon={<Pencil size={18} />}
            onClick={() => {
              onEdit(bonCommande);
              onClose();
            }}
            fullWidth
            size="large"
            sx={{ fontSize: 14, fontWeight: 600 }}
          >
            Modifier
          </CustomButton>
        </Box>
      )}
    </Drawer>
  );
}
