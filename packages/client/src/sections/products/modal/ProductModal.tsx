import { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  useTheme,
  IconButton,
  alpha,
  useMediaQuery,
} from "@mui/material";
import { useForm } from "react-hook-form";
import { X, Save } from "lucide-react";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import { useAlert } from "src/contexts/AlertContext";
import {
  useCreateProductMutation,
  useUpdateProductMutation,
  type Product,
} from "src/lib/services/productsApi";

interface FormValues {
  name: string;
  unitPrice: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
}

export default function ProductModal({ open, onClose, product }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showAlert } = useAlert();
  const isEditMode = !!product;

  const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
  const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();
  const isLoading = isCreating || isUpdating;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty },
  } = useForm<FormValues>({
    mode: "onChange",
    defaultValues: { name: "", unitPrice: 0 },
  });

  useEffect(() => {
    if (open && product) {
      reset({ name: product.name, unitPrice: product.unitPrice });
    } else if (open && !product) {
      reset({ name: "", unitPrice: 0 });
    }
  }, [open, product, reset]);

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  const onSubmit = async (data: FormValues) => {
    try {
      if (isEditMode && product) {
        await updateProduct({ id: product.id, data }).unwrap();
        showAlert("Produit mis à jour avec succès", "success");
      } else {
        await createProduct(data).unwrap();
        showAlert("Produit créé avec succès", "success");
      }
      handleClose();
    } catch {
      showAlert(
        isEditMode
          ? "Erreur lors de la mise à jour du produit"
          : "Erreur lors de la création du produit",
        "error",
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : 3, overflow: "hidden" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 3 },
          py: 2.5,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.paper",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(14,165,233,0.08) 100%)",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {isEditMode ? "Modifier le produit" : "Nouveau produit"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode
              ? "Modifiez les informations du produit"
              : "Ajoutez un produit à votre catalogue"}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={isLoading}
          size="small"
          sx={{
            color: "text.secondary",
            bgcolor: alpha(theme.palette.grey[500], 0.08),
            "&:hover": { bgcolor: alpha(theme.palette.grey[500], 0.16) },
          }}
        >
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2.5, sm: 3 } }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          <CustomInput
            label="Nom du produit"
            placeholder="Ex: Ordinateur portable Dell XPS 15"
            {...register("name", { required: "Le nom est requis" })}
            error={!!errors.name}
            helperText={errors.name?.message}
            required
            fullWidth
          />

          <CustomInput
            label="Prix unitaire (DT)"
            type="number"
            placeholder="0.00"
            {...register("unitPrice", {
              required: "Le prix est requis",
              valueAsNumber: true,
              min: { value: 0, message: "Le prix doit être positif" },
            })}
            error={!!errors.unitPrice}
            helperText={errors.unitPrice?.message}
            required
            fullWidth
            inputProps={{ step: "0.01", min: "0" }}
          />

          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 1.5,
              pt: 1,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            }}
          >
            <CustomButton
              variant="text"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </CustomButton>
            <CustomButton
              type="submit"
              variant="contained"
              disabled={isLoading || !isValid || (!isDirty && isEditMode)}
              startIcon={isLoading ? undefined : <Save size={18} />}
            >
              {isLoading
                ? isEditMode
                  ? "Enregistrement..."
                  : "Création..."
                : isEditMode
                  ? "Enregistrer"
                  : "Créer"}
            </CustomButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
