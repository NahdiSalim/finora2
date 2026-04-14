import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  useTheme,
  IconButton,
  alpha,
  Slide,
  Paper,
  useMediaQuery,
  Avatar,
} from "@mui/material";
import type { SubmitHandler } from "react-hook-form";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  supplierValidationSchema,
  type SupplierFormData,
} from "src/validations/suppliers/supplier-validation";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import FileUpload from "src/components/common/FileUpload";
import { useCreateSupplierMutation } from "src/lib/services/suppliersApi";
import { useAlert } from "src/contexts/AlertContext";
import {
  X,
  Save,
  Building2,
  Mail,
  FileText,
  Image,
  ChevronRight,
} from "lucide-react";
import type { Supplier } from "src/lib/services/suppliersApi";

// ----------------------------------------------------------------

interface Props {
  open: boolean;
  onClose: () => void;
  supplier?: Supplier | null;
}

export default function SupplierModal({ open, onClose, supplier }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showAlert } = useAlert();

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [createSupplier, { isLoading }] = useCreateSupplierMutation();

  const isViewMode = !!supplier;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<SupplierFormData>({
    resolver: yupResolver(supplierValidationSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      company: "",
      email: "",
      phone: "",
      address: "",
      taxId: "",
    },
  });

  useEffect(() => {
    if (supplier) {
      reset({
        name: supplier.name,
        company: supplier.company,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address ?? "",
        taxId: supplier.taxId ?? "",
      });
      setLogoFile(null);
      setLogoPreview(supplier.logoUrl ?? null);
    } else {
      reset({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        taxId: "",
      });
      setLogoFile(null);
      setLogoPreview(null);
    }
  }, [supplier, reset]);

  // Extract before sections array so TypeScript doesn't narrow supplier to never
  const existingLogoUrl: string | undefined = supplier?.logoUrl ?? undefined;

  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
    } else {
      setLogoPreview(existingLogoUrl ?? null);
    }
  };

  const onSubmit: SubmitHandler<SupplierFormData> = async (data) => {
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("company", data.company);
      formData.append("email", data.email);
      formData.append("phone", data.phone);
      if (data.address) formData.append("address", data.address);
      if (data.taxId) formData.append("taxId", data.taxId);
      if (logoFile) formData.append("logo", logoFile);

      await createSupplier(formData).unwrap();
      showAlert("Fournisseur créé avec succès", "success");
      reset();
      setLogoFile(null);
      setLogoPreview(null);
      onClose();
    } catch {
      showAlert("Erreur lors de la création du fournisseur", "error");
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    setLogoFile(null);
    setLogoPreview(null);
    onClose();
  };

  const sections = [
    {
      id: "info",
      title: "Informations",
      icon: <Building2 size={18} />,
      description: "Nom et société du fournisseur",
      content: (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <CustomInput
            {...register("name")}
            label="Nom"
            placeholder="Dupont Matériaux"
            fullWidth
            required
            error={!!errors.name}
            helperText={errors.name?.message}
            InputProps={{ readOnly: isViewMode }}
          />
          <CustomInput
            {...register("company")}
            label="Société"
            placeholder="Dupont & Fils SARL"
            fullWidth
            required
            error={!!errors.company}
            helperText={errors.company?.message}
            InputProps={{ readOnly: isViewMode }}
          />
        </Box>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      icon: <Mail size={18} />,
      description: "Email et téléphone",
      content: (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <CustomInput
            {...register("email")}
            label="Email"
            placeholder="contact@dupont.com"
            fullWidth
            required
            error={!!errors.email}
            helperText={errors.email?.message}
            InputProps={{ readOnly: isViewMode }}
          />
          <CustomInput
            {...register("phone")}
            label="Téléphone"
            placeholder="+216 XX XXX XXX"
            fullWidth
            required
            error={!!errors.phone}
            helperText={errors.phone?.message}
            InputProps={{ readOnly: isViewMode }}
          />
        </Box>
      ),
    },
    {
      id: "legal",
      title: "Informations légales",
      icon: <FileText size={18} />,
      description: "Adresse et matricule fiscal",
      content: (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <CustomInput
            {...register("address")}
            label="Adresse"
            placeholder="12 Rue des Oliviers, Tunis"
            fullWidth
            error={!!errors.address}
            helperText={errors.address?.message}
            InputProps={{ readOnly: isViewMode }}
          />
          <CustomInput
            {...register("taxId")}
            label="Matricule fiscal"
            placeholder="1234567/A/M/000"
            fullWidth
            error={!!errors.taxId}
            helperText={errors.taxId?.message}
            InputProps={{ readOnly: isViewMode }}
          />
        </Box>
      ),
    },
    {
      id: "branding",
      title: "Branding",
      icon: <Image size={18} />,
      description: "Logo du fournisseur",
      content: (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {logoPreview && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Avatar
                src={logoPreview}
                variant="rounded"
                sx={{
                  width: 64,
                  height: 64,
                  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  borderRadius: 2,
                }}
              />
              <Typography variant="caption" color="text.secondary">
                Aperçu du logo
              </Typography>
            </Box>
          )}
          {!isViewMode && (
            <FileUpload
              label="Logo"
              value={logoFile}
              onChange={handleLogoChange}
              existingFileUrl={existingLogoUrl}
              existingFileName={existingLogoUrl ? "logo actuel" : undefined}
              acceptedFiles={[".jpg", ".jpeg", ".png", ".webp", ".svg"]}
              maxSize={2}
            />
          )}
        </Box>
      ),
    },
  ];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
      keepMounted={false}
      slots={{
        transition: Slide,
      }}
      slotProps={{
        transition: {
          direction: isMobile ? "up" : "down",
        },
      }}
      PaperProps={{
        sx: (themeP) => ({
          borderRadius: isMobile ? 0 : 3,
          bgcolor: themeP.palette.grey[100],
          overflow: "hidden",
        }),
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2, sm: 2.5 },
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.paper",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              fontSize: { xs: "1.125rem", sm: "1.25rem" },
              lineHeight: 1.4,
            }}
          >
            {isViewMode ? "Détails du fournisseur" : "Nouveau fournisseur"}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            {isViewMode
              ? "Consultez les informations du fournisseur"
              : "Remplissez les informations pour ajouter un fournisseur"}
          </Typography>
        </Box>

        <IconButton
          onClick={handleClose}
          disabled={isLoading}
          size="small"
          sx={{
            color: "text.secondary",
            bgcolor: alpha(theme.palette.grey[500], 0.08),
            "&:hover": {
              bgcolor: alpha(theme.palette.grey[500], 0.16),
              color: "text.primary",
            },
            transition: "all 0.2s",
          }}
        >
          <X size={20} />
        </IconButton>
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {sections.map((section, index) => (
            <Paper
              key={section.id}
              elevation={0}
              sx={{
                p: { xs: 2, sm: 2.5 },
                bgcolor: "background.paper",
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                transition: "all 0.2s ease-in-out",
                position: "relative",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 4px 4px ${alpha(theme.palette.grey[300], 0.12)}`,
                },
              }}
            >
              {/* Section header */}
              <Box
                sx={{
                  mb: 2.5,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                    transition: "all 0.2s",
                  }}
                >
                  {section.icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 600, color: "text.primary" }}
                  >
                    {section.title}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      display: "block",
                      lineHeight: 1.2,
                    }}
                  >
                    {section.description}
                  </Typography>
                </Box>

                {/* Progress indicator */}
                <Box
                  sx={{
                    display: { xs: "none", sm: "flex" },
                    alignItems: "center",
                    gap: 0.5,
                    color: "text.disabled",
                  }}
                >
                  <Typography variant="caption">
                    {index + 1}/{sections.length}
                  </Typography>
                  <ChevronRight size={14} />
                </Box>
              </Box>

              {/* Section content */}
              {section.content}
            </Paper>
          ))}

          {/* Footer actions */}
          <Box
            sx={{
              mt: 2,
              pt: 2.5,
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "row" },
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            }}
          >
            {isViewMode ? (
              <CustomButton
                variant="contained"
                onClick={handleClose}
                fullWidth={isMobile}
              >
                Fermer
              </CustomButton>
            ) : (
              <>
                <CustomButton
                  variant="text"
                  onClick={handleClose}
                  disabled={isLoading}
                  fullWidth={isMobile}
                  sx={{
                    color: "text.secondary",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.error.main, 0.04),
                      color: theme.palette.error.main,
                    },
                  }}
                >
                  Annuler
                </CustomButton>

                <CustomButton
                  type="submit"
                  variant="contained"
                  disabled={isLoading || !isDirty || !isValid}
                  startIcon={isLoading ? undefined : <Save size={18} />}
                  fullWidth={isMobile}
                  sx={{
                    minWidth: { sm: 140 },
                    position: "relative",
                    overflow: "hidden",
                    "&::after":
                      !isLoading && isDirty && isValid
                        ? {
                            content: '""',
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: `linear-gradient(90deg, transparent, ${alpha(
                              "#fff",
                              0.2,
                            )}, transparent)`,
                            animation: "shimmer 1.5s infinite",
                          }
                        : {},
                    "@keyframes shimmer": {
                      "0%": { transform: "translateX(-100%)" },
                      "100%": { transform: "translateX(100%)" },
                    },
                  }}
                >
                  {isLoading ? "Création..." : "Créer"}
                </CustomButton>
              </>
            )}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
