import { useMemo, useState, useEffect } from "react";
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
import type {
  BonLivraison,
  BonLivraisonFormValues,
  BonLivraisonLine,
} from "src/types/bon-livraison";
import {
  useCreateBonLivraisonMutation,
  useUpdateBonLivraisonMutation,
} from "src/lib/services/bonLivraisonApi";
import {
  useGetSuppliersQuery,
  type Supplier,
} from "src/lib/services/suppliersApi";

const formatAmount = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + " DT";

const createLine = (): BonLivraisonLine => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  description: "",
  quantity: 1,
  unitPrice: 0,
});

const defaultValues: BonLivraisonFormValues = {
  number: "",
  status: "en_attente",
  tvaRate: 19,
  deliveryDate: "",
  lines: [createLine()],
  notes: "",
  supplierId: undefined,
};

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate?: () => void;
  initialData?: BonLivraison | null;
}

export default function BonLivraisonModal({
  open,
  onClose,
  onCreate,
  initialData,
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isEditMode = !!initialData;
  const [create, { isLoading: isCreating }] = useCreateBonLivraisonMutation();
  const [update, { isLoading: isUpdating }] = useUpdateBonLivraisonMutation();
  const isLoading = isCreating || isUpdating;

  const [supplierSearch, setSupplierSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(supplierSearch), 500);
    return () => clearTimeout(t);
  }, [supplierSearch]);

  const { data: suppliersData, isLoading: loadingSuppliers } =
    useGetSuppliersQuery(
      { page: 1, limit: 50, search: debouncedSearch || undefined },
      { skip: !open },
    );

  const allSuppliers = useMemo(() => {
    const list = suppliersData?.data || [];
    if (!selectedSupplier) return list;
    return [
      selectedSupplier,
      ...list.filter((s) => s.id !== selectedSupplier.id),
    ];
  }, [suppliersData, selectedSupplier]);

  const {
    control,
    register,
    reset,
    watch,
    handleSubmit,
    formState: { errors, isValid, isSubmitting },
  } = useForm<BonLivraisonFormValues>({ mode: "onChange", defaultValues });

  // Pre-fill form in edit mode
  useEffect(() => {
    if (open && initialData) {
      reset({
        number: initialData.number,
        status: initialData.status,
        tvaRate: initialData.tvaRate,
        deliveryDate: initialData.deliveryDate.slice(0, 10),
        lines:
          initialData.lines.length > 0 ? initialData.lines : [createLine()],
        notes: initialData.notes ?? "",
        supplierId: initialData.supplierId,
      });
      if (initialData.supplier) {
        setSelectedSupplier(initialData.supplier as Supplier);
        setSupplierSearch(
          `${initialData.supplier.name} - ${initialData.supplier.company}`,
        );
      }
    } else if (open && !initialData) {
      reset({ ...defaultValues, lines: [createLine()] });
      setSelectedSupplier(null);
      setSupplierSearch("");
    }
  }, [open, initialData, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const values = watch();

  const amounts = useMemo(() => {
    const ht = values.lines.reduce(
      (a, l) => a + (l.quantity || 0) * (l.unitPrice || 0),
      0,
    );
    const tva = (ht * (values.tvaRate || 0)) / 100;
    return { amountHT: ht, amountTVA: tva, amountTTC: ht + tva };
  }, [values]);

  const closeAndReset = () => {
    reset({ ...defaultValues, lines: [createLine()] });
    setSelectedSupplier(null);
    setSupplierSearch("");
    onClose();
  };

  const onSubmit = async (data: BonLivraisonFormValues) => {
    try {
      if (isEditMode && initialData) {
        await update({ id: initialData.id, data }).unwrap();
      } else {
        await create(data).unwrap();
      }
      onCreate?.();
      closeAndReset();
    } catch {
      /* handled globally */
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
            {isEditMode
              ? "Modifier le bon de livraison"
              : "Nouveau bon de livraison"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isEditMode
              ? "Modifiez les informations du bon de livraison"
              : "Créez un bon de livraison professionnel"}
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
          <CustomInput
            label="Numéro de BL"
            placeholder="Ex: BL-2026-001"
            {...register("number", { required: true })}
            error={!!errors.number}
            helperText={errors.number?.message}
            required
          />

          {/* Supplier */}
          <Controller
            name="supplierId"
            control={control}
            render={({ field: { onChange } }) => (
              <Autocomplete
                freeSolo={false}
                options={allSuppliers}
                value={selectedSupplier}
                onChange={(_, v) => {
                  setSelectedSupplier(v);
                  onChange(v?.id);
                }}
                onInputChange={(_, v) => setSupplierSearch(v)}
                inputValue={supplierSearch}
                getOptionLabel={(o) => `${o.name} - ${o.company}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                loading={loadingSuppliers}
                filterOptions={(x) => x}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Fournisseur (Destinataire)"
                    placeholder="Rechercher un fournisseur..."
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

          {/* Main fields */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" },
              gap: 2,
            }}
          >
            <Controller
              name="status"
              control={control}
              render={({ field }) => (
                <CustomSelect {...field} label="Statut">
                  <MenuItem value="en_attente">En attente</MenuItem>
                  <MenuItem value="livre">Livré</MenuItem>
                  <MenuItem value="annule">Annulé</MenuItem>
                </CustomSelect>
              )}
            />
            <CustomInput
              label="Date de livraison"
              type="date"
              {...register("deliveryDate", { required: true })}
              error={!!errors.deliveryDate}
              InputLabelProps={{ shrink: true }}
            />
            <CustomInput
              label="TVA (%)"
              type="number"
              {...register("tvaRate", { valueAsNumber: true })}
              error={!!errors.tvaRate}
            />
          </Box>

          {/* Lines */}
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
                  }}
                >
                  <CustomInput
                    label="Description"
                    {...register(`lines.${index}.description`)}
                  />
                  <CustomInput
                    label="Qté"
                    type="number"
                    {...register(`lines.${index}.quantity`, {
                      valueAsNumber: true,
                    })}
                  />
                  <CustomInput
                    label="Prix unit."
                    type="number"
                    {...register(`lines.${index}.unitPrice`, {
                      valueAsNumber: true,
                    })}
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
            placeholder="Notes ou conditions..."
            {...register("notes")}
            multiline
            rows={3}
          />

          {/* Totals */}
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
            }}
          >
            {[
              {
                label: "Montant HT",
                value: amounts.amountHT,
                color: "text.secondary",
              },
              {
                label: "Montant TVA",
                value: amounts.amountTVA,
                color: "text.secondary",
              },
              {
                label: "Montant TTC",
                value: amounts.amountTTC,
                color: "primary.main",
              },
            ].map(({ label, value, color }, i) => (
              <Box
                key={i}
                sx={{
                  borderLeft:
                    i > 0
                      ? { sm: `1px solid ${alpha(theme.palette.divider, 0.6)}` }
                      : undefined,
                  pl: i > 0 ? { sm: 1.5 } : undefined,
                }}
              >
                <Typography
                  variant="caption"
                  color={color}
                  textTransform="uppercase"
                  fontWeight={600}
                >
                  {label}
                </Typography>
                <Typography
                  variant={i === 2 ? "subtitle1" : "h6"}
                  fontWeight={i === 2 ? 800 : 700}
                  color={color}
                >
                  {formatAmount(value)}
                </Typography>
              </Box>
            ))}
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
              disabled={!isValid || isSubmitting || isLoading}
              loading={isLoading || isSubmitting}
            >
              {isEditMode
                ? "Enregistrer les modifications"
                : "Créer le bon de livraison"}
            </CustomButton>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
