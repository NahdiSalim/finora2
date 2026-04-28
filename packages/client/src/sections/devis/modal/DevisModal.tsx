import { useMemo, useState, useEffect } from "react";
import { yupResolver } from "@hookform/resolvers/yup";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import {
  alpha,
  Autocomplete,
  Box,
  Dialog,
  DialogContent,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Plus, Trash2, X } from "lucide-react";

import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import ProductSearchSelect from "src/components/common/ProductSearchSelect";
import type { DevisFormValues, DevisLine } from "src/types/devis";
import { devisValidationSchema } from "src/validations/devis/devis-validation";
import { useCreateDevisMutation } from "src/lib/services/devisApi";
import {
  useGetSuppliersQuery,
  type Supplier,
} from "src/lib/services/suppliersApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate?: () => void;
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

function computeAmounts(values: DevisFormValues) {
  const subtotal = values.lines.reduce(
    (acc, line) => acc + (line.quantity || 0) * (line.unitPrice || 0),
    0,
  );
  const amountHT = subtotal;
  const amountTVA = (amountHT * (values.tvaRate || 0)) / 100;
  const amountTTC = amountHT + amountTVA;
  return { amountHT, amountTVA, amountTTC };
}

const createLine = (): DevisLine => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  description: "",
  quantity: 1,
  unitPrice: 0,
});

const defaultValues: DevisFormValues = {
  number: "",
  status: "en_attente",
  tvaRate: 19,
  validUntil: "",
  lines: [createLine()],
  notes: "",
  supplierId: undefined,
};

export default function DevisModal({ open, onClose, onCreate }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [createDevis, { isLoading: isCreating }] = useCreateDevisMutation();

  // Supplier search state
  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(supplierSearch), 500);
    return () => clearTimeout(timer);
  }, [supplierSearch]);

  const { data: suppliersData, isLoading: isLoadingSuppliers } =
    useGetSuppliersQuery(
      { page: 1, limit: 50, search: debouncedSearch || undefined },
      { skip: !open },
    );

  const allSuppliers = useMemo(() => {
    const list = suppliersData?.data || [];
    if (!selectedSupplier) return list;
    const ids = new Set([selectedSupplier.id]);
    return [selectedSupplier, ...list.filter((s) => !ids.has(s.id))];
  }, [suppliersData, selectedSupplier]);

  const {
    control,
    register,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<DevisFormValues>({
    resolver: yupResolver(devisValidationSchema) as never,
    mode: "onChange",
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const values = watch();
  const amounts = useMemo(() => computeAmounts(values), [values]);

  const closeAndReset = () => {
    reset({ ...defaultValues, lines: [createLine()] });
    setSelectedSupplier(null);
    setSupplierSearch("");
    onClose();
  };

  const onSubmit = async (formValues: DevisFormValues) => {
    try {
      await createDevis(formValues).unwrap();
      onCreate?.();
      closeAndReset();
    } catch {
      // error handled globally
    }
  };

  return (
    <Dialog
      open={open}
      onClose={closeAndReset}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: { borderRadius: isMobile ? 0 : 3, overflow: "hidden" },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2, md: 3 },
          py: 2,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          background:
            "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(14,165,233,0.08) 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            Nouveau devis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Créez un devis professionnel et personnalisé
          </Typography>
        </Box>
        <IconButton onClick={closeAndReset} sx={{ color: "text.secondary" }}>
          <X size={20} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
        >
          {/* Devis number */}
          <CustomInput
            label="Numéro de devis"
            placeholder="Ex: DEV-2026-001"
            {...register("number")}
            error={!!errors.number}
            helperText={errors.number?.message}
            required
          />

          {/* Supplier autocomplete */}
          <Controller
            name="supplierId"
            control={control}
            render={({ field: { onChange } }) => (
              <Autocomplete
                freeSolo={false}
                options={allSuppliers}
                value={selectedSupplier}
                onChange={(_, newValue) => {
                  setSelectedSupplier(newValue);
                  onChange(newValue?.id);
                }}
                onInputChange={(_, val) => setSupplierSearch(val)}
                inputValue={supplierSearch}
                getOptionLabel={(o) => `${o.name} - ${o.company}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                loading={isLoadingSuppliers}
                filterOptions={(x) => x}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Fournisseur (Destinataire)"
                    placeholder="Rechercher un fournisseur..."
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {isLoadingSuppliers && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ mr: 1 }}
                            >
                              Chargement...
                            </Typography>
                          )}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  const { key, ...rest } = props;
                  return (
                    <Box component="li" key={key} {...rest}>
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Typography variant="body2" fontWeight={600}>
                          {option.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.company} • {option.email}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
              />
            )}
          />

          {/* Main info grid */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
              alignItems: "flex-start",
            }}
          >
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label="Statut"
                  error={!!errors.status}
                  helperText={errors.status?.message}
                >
                  <MenuItem value="en_attente">En attente</MenuItem>
                  <MenuItem value="accepte">Accepté</MenuItem>
                  <MenuItem value="refuse">Refusé</MenuItem>
                </CustomSelect>
              )}
            />

            <CustomInput
              label="Valide jusqu'au"
              type="date"
              {...register("validUntil")}
              error={!!errors.validUntil}
              helperText={errors.validUntil?.message}
              InputLabelProps={{ shrink: true }}
            />

            <CustomInput
              label="TVA (%)"
              type="number"
              {...register("tvaRate", { valueAsNumber: true })}
              error={!!errors.tvaRate}
              helperText={errors.tvaRate?.message}
            />
          </Box>

          {/* Product lines */}
          <Box
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              borderRadius: 3,
              p: 2,
              backgroundColor: alpha(theme.palette.background.default, 0.4),
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="subtitle1" fontWeight={700}>
                Lignes de produit
              </Typography>
              <CustomButton
                type="button"
                variant="soft"
                size="small"
                startIcon={<Plus size={16} />}
                onClick={() => append(createLine())}
              >
                Ajouter une ligne
              </CustomButton>
            </Stack>
            <Box sx={{ mb: 1.5 }}>
              <ProductSearchSelect
                open={open}
                onSelect={(product) => {
                  append({
                    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                    description: product.name,
                    quantity: 1,
                    unitPrice: product.unitPrice,
                  });
                }}
              />
            </Box>

            <Stack spacing={1.5}>
              {fields.map((field, index) => (
                <Box
                  key={field.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "2fr 1fr 1.5fr auto",
                    },
                    gap: 1.5,
                    alignItems: "flex-start",
                    p: { xs: 1.5, sm: 0 },
                    border: {
                      xs: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                      sm: "none",
                    },
                    borderRadius: { xs: 2, sm: 0 },
                  }}
                >
                  <CustomInput
                    label="Description"
                    {...register(`lines.${index}.description`)}
                    error={!!errors.lines?.[index]?.description}
                    helperText={errors.lines?.[index]?.description?.message}
                  />
                  <CustomInput
                    label="Qté"
                    type="number"
                    {...register(`lines.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                    error={!!errors.lines?.[index]?.quantity}
                    helperText={errors.lines?.[index]?.quantity?.message}
                  />
                  <CustomInput
                    label="Prix unit."
                    type="number"
                    {...register(`lines.${index}.unitPrice`, {
                      valueAsNumber: true,
                    })}
                    error={!!errors.lines?.[index]?.unitPrice}
                    helperText={errors.lines?.[index]?.unitPrice?.message}
                  />
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      mt: { xs: 0, sm: "28px" },
                    }}
                  >
                    <IconButton
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                      sx={{
                        border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                        color: "error.main",
                        borderRadius: 2,
                        width: 40,
                        height: 40,
                        "&:hover": {
                          backgroundColor: alpha(
                            theme.palette.error.main,
                            0.08,
                          ),
                        },
                        "&:disabled": {
                          borderColor: alpha(
                            theme.palette.action.disabled,
                            0.2,
                          ),
                        },
                      }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>

          <CustomInput
            label="Notes"
            placeholder="Ajoutez une note ou des conditions spécifiques..."
            {...register("notes")}
            error={!!errors.notes}
            helperText={errors.notes?.message}
            multiline
            rows={3}
          />

          {/* Totals summary */}
          <Box
            sx={{
              borderRadius: 3,
              p: 2,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              background:
                "linear-gradient(135deg, rgba(59,130,246,0.05) 0%, rgba(14,165,233,0.05) 100%)",
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
              gap: 1.5,
              textAlign: { xs: "center", sm: "left" },
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                textTransform="uppercase"
                fontWeight={600}
              >
                Montant HT
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatAmount(amounts.amountHT)}
              </Typography>
            </Box>
            <Box
              sx={{
                borderLeft: {
                  sm: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                },
                pl: { sm: 1.5 },
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                textTransform="uppercase"
                fontWeight={600}
              >
                Montant TVA
              </Typography>
              <Typography variant="h6" fontWeight={700}>
                {formatAmount(amounts.amountTVA)}
              </Typography>
            </Box>
            <Box
              sx={{
                borderLeft: {
                  sm: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                },
                pl: { sm: 1.5 },
              }}
            >
              <Typography
                variant="caption"
                color="primary.main"
                textTransform="uppercase"
                fontWeight={600}
              >
                Montant TTC
              </Typography>
              <Typography
                variant="subtitle1"
                fontWeight={800}
                color="primary.main"
              >
                {formatAmount(amounts.amountTTC)}
              </Typography>
            </Box>
          </Box>

          <Stack
            direction={{ xs: "column-reverse", sm: "row" }}
            justifyContent="flex-end"
            gap={1.5}
          >
            <CustomButton type="button" variant="text" onClick={closeAndReset}>
              Annuler
            </CustomButton>
            <CustomButton
              type="submit"
              disabled={!isValid || isSubmitting || isCreating}
              loading={isCreating || isSubmitting}
            >
              Créer le devis
            </CustomButton>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
