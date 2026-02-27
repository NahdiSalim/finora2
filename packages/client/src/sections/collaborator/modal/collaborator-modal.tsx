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
  collaboratorValidationSchema,
  type CollaboratorFormData,
} from "src/validations/collaborators/collaborator-validation";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import PasswordField from "src/components/common/PasswordField";
import { useCreateCollaboratorMutation } from "src/lib/services/collaboratorsApi";
import { useAlert } from "src/contexts/AlertContext";
import {
  X,
  Save,
  User,
  Briefcase,
  Lock,
  Mail,
  ChevronRight,
} from "lucide-react";

/* ---------------- SCHEMA ---------------- */

interface Props {
  open: boolean;
  onClose: () => void;
}

// Custom transition component

export default function CollaboratorModal({ open, onClose }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { showAlert } = useAlert();

  const [createCollaborator, { isLoading }] = useCreateCollaboratorMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty, isValid },
  } = useForm<CollaboratorFormData>({
    resolver: yupResolver(collaboratorValidationSchema),
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      position: "",
      department: "",
    },
  });

  const onSubmit: SubmitHandler<CollaboratorFormData> = async (data) => {
    try {
      await createCollaborator(data).unwrap();
      showAlert("Collaborateur créé avec succès", "success");
      reset();
      onClose();
    } catch {
      showAlert("Erreur lors de la création du collaborateur", "error");
    }
  };

  const sections = [
    {
      id: "personal",
      title: "Informations personnelles",
      icon: <User size={18} />,
      description: "Nom et prénom du collaborateur",
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
            label="Nom"
            placeholder="Dupont"
            fullWidth
            required
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />
          <CustomInput
            {...register("firstName")}
            label="Prénom"
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
            placeholder="jean.dupont@example.com"
            fullWidth
            required
            error={!!errors.email}
            helperText={errors.email?.message}
          />
          <CustomInput
            {...register("phone")}
            label="Téléphone"
            placeholder="+216 XX XXX XXX"
            fullWidth
            required
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />
        </Box>
      ),
    },
    {
      id: "professional",
      title: "Profession",
      icon: <Briefcase size={18} />,
      description: "Poste et département",
      content: (
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            gap: 2,
          }}
        >
          <CustomInput
            {...register("position")}
            label="Poste"
            placeholder="Développeur full-stack"
            fullWidth
            error={!!errors.position}
            helperText={errors.position?.message}
          />
          <CustomInput
            {...register("department")}
            label="Département"
            placeholder="Technologies"
            fullWidth
            error={!!errors.department}
            helperText={errors.department?.message}
          />
        </Box>
      ),
    },
    {
      id: "security",
      title: "Sécurité",
      icon: <Lock size={18} />,
      description: "Mot de passe temporaire",
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
              helperText={errors.password?.message || "Minimum 8 caractères"}
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
      {/* Header with subtle gradient */}
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
            Nouveau collaborateur
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            Remplissez les informations pour créer un nouveau compte
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
              {/* Section header with icon */}
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
                    sx={{
                      fontWeight: 600,
                      color: "text.primary",
                    }}
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
              {isLoading ? "Création..." : "Créer"}
            </CustomButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
