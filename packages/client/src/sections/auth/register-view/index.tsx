import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRegisterMutation } from "src/lib/services/authApi";
import { useRouter } from "src/routes/hooks";
import { useAlert } from "src/contexts/AlertContext";

import { Box, Typography, Button, Checkbox, Radio, Link } from "@mui/material";

import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import DotSpinner from "src/components/common/DotSpinner";
import PhoneInput from "src/components/common/PhoneInput";

import {
  registerValidationSchema,
  type RegisterFormData,
} from "src/validations/Auth/auth-validation";
import PasswordField from "src/components/common/PasswordField";
import CustomInput from "src/components/common/CustomInput";

export function RegisterView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerValidationSchema),
    defaultValues: {
      email: "",
      phoneNumber: "",
      password: "",
      role: "CLIENT",
      agreeToTerms: false,
    },
  });

  const role = watch("role");
  const agree = watch("agreeToTerms");

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data).unwrap();
      router.push(`/check-email?email=${data.email}`);
    } catch {
      showAlert("Erreur lors de l'inscription", "error");
    }
  };

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        maxWidth: 470,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 1 }}>
        <Typography sx={{ fontSize: 28, fontWeight: 700 }}>
          S’inscrire
        </Typography>

        <Typography sx={{ fontSize: 14, color: "#6B7280", mt: 1 }}>
          Inscrivez-vous pour profiter des fonctionnalités de FINORA
        </Typography>
      </Box>

      {/* ROLE */}
      <Typography sx={{ mt: 2, mb: 1, fontSize: 14 }}>
        S’inscrire en tant que
      </Typography>

      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        {["CLIENT", "COMPTABLE"].map((value) => (
          <Box
            key={value}
            onClick={() => setValue("role", value as any)}
            sx={{
              flex: 1,
              height: 44,
              display: "flex",
              alignItems: "center",
              borderRadius: 2,
              border: "1px solid",
              borderColor: role === value ? "#2563EB" : "#E5E7EB",
              backgroundColor: role === value ? "#EFF6FF" : "#FFFFFF",
              px: 2,
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <Radio
              checked={role === value}
              size="small"
              sx={{
                color: "#D1D5DB",
                "&.Mui-checked": {
                  color: "#2563EB",
                },
              }}
            />
            <Typography sx={{ fontSize: 13 }}>
              {value === "CLIENT"
                ? "Une entreprise"
                : "Cabinet de comptabilité"}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        <CustomInput
          {...register("email")}
          label="Adresse email professionnelle"
          error={!!errors.email}
          helperText={errors.email?.message}
          fullWidth
          required
          placeholder="Entrer votre adresse email"
        />

        <Controller
          name="phoneNumber"
          control={control}
          render={({ field }) => (
            <PhoneInput
              {...field}
              defaultCountry="TN"
              label="Numéro de téléphone"
              placeholder="Entrer votre numéro"
              error={!!errors.phoneNumber}
              helperText={errors.phoneNumber?.message}
              required
              fullWidth
            />
          )}
        />

        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <PasswordField
              {...field}
              mode="create"
              error={!!errors.password}
              helperText={errors.password?.message}
              required
            />
          )}
        />
      </Box>
      {/* TERMS */}
      <Box sx={{ display: "flex", alignItems: "center", mt: 3 }}>
        <Checkbox
          checked={agree}
          onChange={() => setValue("agreeToTerms", !agree)}
          sx={{
            color: "#D1D5DB",
            "&.Mui-checked": {
              color: "#2563EB",
            },
          }}
        />

        <Typography sx={{ fontSize: 13 }}>
          J’accepte{" "}
          <span style={{ color: "#2563EB" }}>les termes et conditions</span>
        </Typography>
      </Box>

      {/* BUTTON */}
      <Button
        fullWidth
        type="submit"
        disabled={isLoading}
        variant="contained"
        sx={{
          mt: 3,
          height: 48,
          borderRadius: "12px",
          backgroundColor: "#1E63D5",
          textTransform: "none",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          "&:hover": {
            backgroundColor: "#1D4ED8",
          },
        }}
        endIcon={isLoading ? <DotSpinner size={20} /> : <ArrowForwardIcon />}
      >
        {isLoading ? "Inscription..." : "S’inscrire"}
      </Button>

      {/* LOGIN LINK */}
      <Typography
        sx={{
          textAlign: "center",
          mt: 3,
          fontSize: 13,
        }}
      >
        Vous avez déjà un compte ?{" "}
        <Link
          onClick={() => router.push("/sign-in")}
          sx={{
            color: "#2563EB",
            cursor: "pointer",
          }}
        >
          Se connecter
        </Link>
      </Typography>
    </Box>
  );
}
