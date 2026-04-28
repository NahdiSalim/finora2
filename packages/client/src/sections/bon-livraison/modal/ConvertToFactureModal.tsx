import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import { FileText } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import type { BonLivraison } from "src/types/bon-livraison";

interface Props {
  open: boolean;
  bonLivraison: BonLivraison | null;
  isLoading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export default function ConvertToFactureModal({
  open,
  bonLivraison,
  isLoading,
  onConfirm,
  onClose,
}: Props) {
  const theme = useTheme();
  if (!bonLivraison) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, overflow: "hidden" } }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.info.main, 0.08)} 100%)`,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            color: "primary.main",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText size={18} />
        </Box>
        <Typography variant="h6" fontWeight={700} fontSize="1rem">
          Créer une facture
        </Typography>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5 }}>
        <Typography variant="body2" color="text.secondary" lineHeight={1.7}>
          Le bon de livraison{" "}
          <Typography component="span" fontWeight={700} color="text.primary">
            #{bonLivraison.number}
          </Typography>{" "}
          sera converti en facture brouillon avec les mêmes lignes et le même
          fournisseur. Un numéro sera attribué automatiquement.
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <CustomButton variant="text" onClick={onClose} disabled={isLoading}>
          Annuler
        </CustomButton>
        <CustomButton
          variant="contained"
          onClick={onConfirm}
          loading={isLoading}
          disabled={isLoading}
        >
          Créer
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
