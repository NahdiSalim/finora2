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
} from "@mui/material";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  X,
  Save,
  User,
  Building2,
  Lock,
  Mail,
  MapPin,
  ChevronRight,
} from "lucide-react";

import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import PasswordField from "src/components/common/PasswordField";
import { useCreateClientMutation } from "src/lib/services/clientApi";
import { useAlert } from "src/contexts/AlertContext";
import {
  clientValidationSchema,
  type ClientFormData,
} from "src/validations/client/client-validation";
import PhoneInput from "src/components/common/PhoneInput";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ClientModal({ open, onClose }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showAlert } = useAlert();
  const [createClient, { isLoading }] = useCreateClientMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<ClientFormData>({
    resolver: yupResolver(clientValidationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      companyName: "",
      password: "",
      siret: "",
      vatNumber: "",
      legalForm: "",
      address: "",
      city: "",
      postalCode: "",
    },
  });

  const onSubmit: SubmitHandler<ClientFormData> = async (data) => {
    try {
      await createClient(data).unwrap();
      showAlert("Client created successfully", "success");
      reset();
      onClose();
    } catch {
      showAlert("Error creating client", "error");
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    onClose();
  };

  const sections = [
    {
      id: "personal",
      title: "Personal Information",
      icon: <User size={18} />,
      description: "Client's first and last name",
      content: (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <CustomInput
            {...register("lastName")}
            label="Last Name"
            placeholder="Dupont"
            fullWidth
            required
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
          <CustomInput
            {...register("firstName")}
            label="First Name"
            placeholder="Jean"
            fullWidth
            required
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />
        </Box>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      icon: <Mail size={18} />,
      description: "Email and phone number",
      content: (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <CustomInput
            {...register("email")}
            size="small"
            label="Email"
            placeholder="jean.dupont@example.com"
            fullWidth
            required
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                {...field}
                defaultCountry="TN"
                label="Phone"
                placeholder="votre numéro de téléphone"
                error={!!errors.phone}
                helperText={errors.phone?.message}
                required
                fullWidth
              />
            )}
          />
        </Box>
      ),
    },
    {
      id: "company",
      title: "Company",
      icon: <Building2 size={18} />,
      description: "Legal and business information",
      content: (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <CustomInput
              {...register("companyName")}
              label="Company Name"
              placeholder="Acme Corp"
              fullWidth
              required
              error={!!errors.companyName}
              helperText={errors.companyName?.message}
            />
            <CustomInput
              {...register("legalForm")}
              label="Legal Form"
              placeholder="SAS, SARL..."
              fullWidth
              error={!!errors.legalForm}
              helperText={errors.legalForm?.message}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <CustomInput
              {...register("siret")}
              label="SIRET"
              placeholder="000 000 000 00000"
              fullWidth
              error={!!errors.siret}
              helperText={errors.siret?.message}
            />
            <CustomInput
              {...register("vatNumber")}
              label="VAT Number"
              placeholder="FR00000000000"
              fullWidth
              error={!!errors.vatNumber}
              helperText={errors.vatNumber?.message}
            />
          </Box>
        </Box>
      ),
    },
    {
      id: "address",
      title: "Address",
      icon: <MapPin size={18} />,
      description: "Location details",
      content: (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <CustomInput
            {...register("address")}
            label="Address"
            placeholder="12 rue de la Paix"
            fullWidth
            error={!!errors.address}
            helperText={errors.address?.message}
          />
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 2,
            }}
          >
            <CustomInput
              {...register("city")}
              label="City"
              placeholder="Paris"
              fullWidth
              error={!!errors.city}
              helperText={errors.city?.message}
            />
            <CustomInput
              {...register("postalCode")}
              label="Postal Code"
              placeholder="75001"
              fullWidth
              error={!!errors.postalCode}
              helperText={errors.postalCode?.message}
            />
          </Box>
        </Box>
      ),
    },
    {
      id: "security",
      title: "Security",
      icon: <Lock size={18} />,
      description: "Temporary password",
      content: (
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <PasswordField
              {...field}
              mode="create"
              required
              error={!!errors.password}
              helperText={errors.password?.message || "Minimum 8 characters"}
            />
          )}
        />
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
      slots={{ transition: Slide }}
      slotProps={{ transition: { direction: isMobile ? "up" : "down" } }}
      PaperProps={{
        sx: (t) => ({
          borderRadius: isMobile ? 0 : 3,
          bgcolor: t.palette.grey[100],
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
            New Client
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            remplissez les informations du client pour créer un nouveau client
            dans le système
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
          sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}
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
                  }}
                >
                  {section.icon}
                </Box>

                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>
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
              Cancel
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
                        inset: 0,
                        background: `linear-gradient(90deg, transparent, ${alpha("#fff", 0.2)}, transparent)`,
                        animation: "shimmer 1.5s infinite",
                      }
                    : {},
                "@keyframes shimmer": {
                  "0%": { transform: "translateX(-100%)" },
                  "100%": { transform: "translateX(100%)" },
                },
              }}
            >
              {isLoading ? "Creating..." : "Create"}
            </CustomButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
