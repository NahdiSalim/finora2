import { useForm } from "react-hook-form";
import { useState, useCallback } from "react";
import { yupResolver } from "@hookform/resolvers/yup";

import CheckCircle from "@mui/icons-material/CheckCircle";
import { Box, Grid, Button, Typography } from "@mui/material";
import DotSpinner from "src/components/common/DotSpinner";

import { useRouter } from "src/routes/hooks";

import {
  newPasswordValidationSchema,
  type NewPasswordFormData,
} from "src/validations/Auth/auth-validation";

import { useAlert } from "src/contexts/AlertContext";
import { useResetPasswordMutation } from "src/lib/services/authApi";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";

export function ResetPasswordView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const [resetPassword, { isLoading }] = useResetPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<NewPasswordFormData>({
    resolver: yupResolver(newPasswordValidationSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: NewPasswordFormData) => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const token = urlParams.get("token");

      if (!token) {
        showAlert(
          "Token manquant. Veuillez utiliser le lien reçu par email.",
          "error",
        );
        return;
      }

      await resetPassword({
        token,
        password: data.password,
        confirmepassword: data.confirmPassword,
      }).unwrap();
      setPasswordUpdated(true);
    } catch (error: unknown) {
      const message =
        (typeof error === "object" &&
          error !== null &&
          "data" in error &&
          (error as { data?: { message?: string } })?.data?.message) ||
        "Échec de la réinitialisation. Veuillez réessayer.";

      showAlert(message, "error");
    }
  };

  const handleBackToSignIn = useCallback(() => {
    router.push("/sign-in");
  }, [router]);

  if (passwordUpdated) {
    return (
      <Grid container spacing={3} sx={{ maxWidth: "434px", width: "100%" }}>
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              gap: 1.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                bgcolor: "success.lighter",
                color: "success.main",
              }}
            >
              <CheckCircle sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Mot de passe mis à jour!
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                textAlign: "center",
              }}
            >
              Votre mot de passe a été modifié avec succès. Vous pouvez
              maintenant vous connecter avec votre nouveau mot de passe.
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Button
            fullWidth
            color="primary"
            variant="contained"
            onClick={handleBackToSignIn}
          >
            Retour à la connexion
          </Button>
        </Grid>
      </Grid>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3} sx={{ maxWidth: "434px", width: "100%" }}>
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              gap: 1.5,
              display: "flex",
              flexDirection: "column",
              alignItems: "left",
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 600 }}>
              Nouveau mot de passe
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: "text.secondary",
                textAlign: "left",
              }}
            >
              Définissez un nouveau mot de passe pour accéder à votre compte
              .{" "}
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <CustomInput
            {...register("password")}
            fullWidth
            label="Nouveau mot de passe"
            isPassword
            error={!!errors.password}
            helperText={errors.password?.message}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <CustomInput
            {...register("confirmPassword")}
            fullWidth
            label="Confirmer le mot de passe"
            isPassword
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <CustomButton
            fullWidth
            type="submit"
            color="primary"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <DotSpinner size={20} />}
          >
            {isLoading
              ? "Mise à jour en cours…"
              : "Mettre à jour le mot de passe"}
          </CustomButton>
        </Grid>
      </Grid>
    </form>
  );
}
