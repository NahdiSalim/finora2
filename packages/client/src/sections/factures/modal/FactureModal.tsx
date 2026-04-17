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
import type { FactureFormValues, FactureLine } from "src/types/facture";
import { factureValidationSchema } from "src/validations/facture/facture-validation";
import { useCreateInvoiceMutation } from "src/lib/services/invoicesApi";
import {
  useGetSuppliersQuery,
  type Supplier,
} from "src/lib/services/suppliersApi";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

function computeAmounts(values: FactureFormValues) {
  const subtotal = values.lines.reduce(
    (acc, line) => acc + (line.quantity || 0) * (line.unitPrice || 0),
    0,
  );
  const discount =
    values.discountType === "percentage"
      ? (subtotal * (values.discountValue || 0)) / 100
      : values.discountValue || 0;
  const amountHT = Math.max(subtotal - discount, 0);
  const amountTVA = (amountHT * (values.vatRate || 0)) / 100;
  const amountTTC = amountHT + amountTVA;
  const amountPaid =
    values.paymentStatus === "paid"
      ? amountTTC
      : values.paymentStatus === "partial"
        ? values.amountPaid || 0
        : 0;
  const amountRemaining = amountTTC - amountPaid;
  return { amountHT, amountTVA, amountTTC, amountPaid, amountRemaining };
}

const createLine = (): FactureLine => ({
  description: "",
  quantity: 1,
  unitPrice: 0,
});

const defaultValues: FactureFormValues = {
  invoiceNumber: "",
  status: "draft",
  vatRate: 19,
  dueDate: "",
  discountType: "percentage",
  discountValue: 0,
  lines: [createLine()],
  notes: "",
  supplierId: undefined,
  paymentStatus: "unpaid",
  amountPaid: 0,
};

export default function FactureModal({ open, onClose, onCreate }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [createInvoice, { isLoading: isCreating }] = useCreateInvoiceMutation();

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
  } = useForm<FactureFormValues>({
    resolver: yupResolver(factureValidationSchema) as never,
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

  const onSubmit = async (formValues: FactureFormValues) => {
    try {
      // Status stays exactly as chosen — never overridden by payment
      const finalStatus: string = formValues.status;
      // Recompute amounts from submitted values to avoid stale closure
      const submittedAmounts = computeAmounts(formValues);
      let finalAmountPaid = 0;

      if (formValues.paymentStatus === "paid") {
        finalAmountPaid = submittedAmounts.amountTTC;
      } else if (formValues.paymentStatus === "partial") {
        finalAmountPaid = formValues.amountPaid || 0;
      }

      await createInvoice({
        invoiceNumber: formValues.invoiceNumber,
        status: finalStatus,
        dueDate: formValues.dueDate,
        vatRate: formValues.vatRate,
        discountType: formValues.discountType,
        discountValue: formValues.discountValue || undefined,
        notes: formValues.notes || undefined,
        supplierId: formValues.supplierId!,
        amountPaid: finalAmountPaid,
        lines: formValues.lines.map(({ description, quantity, unitPrice }) => ({
          description,
          quantity,
          unitPrice,
        })),
      }).unwrap();
      onCreate();
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
            Nouvelle facture
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Créez une facture claire et professionnelle
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
          {/* Numéro de facture */}
          <CustomInput
            label="Numéro de facture"
            placeholder="Ex: FAC-2026-001"
            {...register("invoiceNumber")}
            error={!!errors.invoiceNumber}
            helperText={errors.invoiceNumber?.message}
            required
          />

          {/* Fournisseur */}
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
                    error={!!errors.supplierId}
                    helperText={errors.supplierId?.message}
                    required
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

          {/* Statut + Date d'échéance */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
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
                  required
                >
                  <MenuItem value="draft">Brouillon</MenuItem>
                  <MenuItem value="sent">Envoyée</MenuItem>
                  <MenuItem value="overdue">En retard</MenuItem>
                </CustomSelect>
              )}
            />

            <CustomInput
              label="Date d'échéance"
              type="date"
              {...register("dueDate")}
              error={!!errors.dueDate}
              helperText={errors.dueDate?.message}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Box>

          {/* TVA + Type de remise + Valeur de remise */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <CustomInput
              label="TVA (%)"
              type="number"
              {...register("vatRate", { valueAsNumber: true })}
              error={!!errors.vatRate}
              helperText={errors.vatRate?.message}
            />

            <Controller
              name="discountType"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label="Type de remise"
                  error={!!errors.discountType}
                  helperText={errors.discountType?.message}
                >
                  <MenuItem value="percentage">Pourcentage (%)</MenuItem>
                  <MenuItem value="fixed">Montant fixe (DT)</MenuItem>
                </CustomSelect>
              )}
            />

            <CustomInput
              label="Valeur de remise"
              type="number"
              {...register("discountValue", { valueAsNumber: true })}
              error={!!errors.discountValue}
              helperText={errors.discountValue?.message}
            />
          </Box>

          {/* Statut de paiement */}
          <Box
            sx={{
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              borderRadius: 2,
              p: 2,
              backgroundColor: alpha(theme.palette.primary.main, 0.03),
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="subtitle2" fontWeight={600}>
              Statut de paiement
            </Typography>

            <Controller
              name="paymentStatus"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label="Paiement"
                  error={!!errors.paymentStatus}
                  helperText={errors.paymentStatus?.message}
                >
                  <MenuItem value="unpaid">Non payée</MenuItem>
                  <MenuItem value="paid">Payée</MenuItem>
                  <MenuItem value="partial">Partiel</MenuItem>
                </CustomSelect>
              )}
            />

            {values.paymentStatus === "partial" && (
              <CustomInput
                label="Montant payé (DT)"
                type="number"
                {...register("amountPaid", { valueAsNumber: true })}
                error={!!errors.amountPaid}
                helperText={
                  errors.amountPaid?.message ||
                  `Montant restant: ${formatAmount(amounts.amountRemaining)}`
                }
                placeholder="0.00"
              />
            )}
          </Box>

          {/* Lignes de produit */}
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

          {/* Notes */}
          <CustomInput
            label="Notes"
            placeholder="Ajoutez une note ou des conditions spécifiques..."
            {...register("notes")}
            error={!!errors.notes}
            helperText={errors.notes?.message}
            multiline
            rows={3}
          />

          {/* Totaux */}
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
              Créer la facture
            </CustomButton>
          </Stack>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
