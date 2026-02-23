import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRegisterMutation } from "src/lib/services/authApi";
import { useRouter } from "src/routes/hooks";
import { useAlert } from "src/contexts/AlertContext";

import { Box, Typography, Checkbox, Link } from "@mui/material";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

import DotSpinner from "src/components/common/DotSpinner";
import PhoneInput from "src/components/common/PhoneInput";
import PasswordField from "src/components/common/PasswordField";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import RadioCard from "src/components/common/RadioCard";

import {
  registerValidationSchema,
  type RegisterFormData,
} from "src/validations/Auth/auth-validation";

export function RegisterView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [registerUser, { isLoading }] = useRegisterMutation();

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
      showAlert("Erreur lors de l&apos;inscription", "error");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        py: 3,
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{
          width: "100%",
          maxWidth: 500,
          px: 3,
        }}
      >
        {/* Header */}
        <Box sx={{ mb: 2.5 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              mb: 0.5,
            }}
          >
            S&apos;inscrire
          </Typography>

          <Typography
            variant="body2"
            sx={{
              color: "text.secondary",
            }}
          >
            Inscrivez-vous pour profiter des fonctionnalités de FINORA
          </Typography>
        </Box>

        {/* ROLE Selection */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            sx={{
              mb: 1,
              fontWeight: 500,
            }}
          >
            S&apos;inscrire en tant que
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 1.5,
            }}
          >
            {[
              { value: "CLIENT", label: "Une entreprise" },
              { value: "COMPTABLE", label: "Cabinet de comptabilité" },
            ].map((option) => (
              <RadioCard
                key={option.value}
                value={option.value}
                label={option.label}
                selectedValue={role}
                onSelect={setValue}
              />
            ))}
          </Box>
        </Box>

        {/* Form Fields */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {/* Email */}
          <CustomInput
            {...register("email")}
            label="Adresse email professionnelle"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
            required
            placeholder="ex: john@domain.com"
          />

          {/* Phone */}
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

          {/* Password */}
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

        {/* Terms and Conditions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            mt: 2,
          }}
        >
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

          <Typography variant="body2">
            J&apos;accepte{" "}
            <Link
              href="/terms"
              sx={{
                color: "#2563EB",
                textDecoration: "none",
                "&:hover": {
                  textDecoration: "underline",
                },
              }}
            >
              les termes et conditions
            </Link>
          </Typography>
        </Box>

        {/* Submit Button */}
        <CustomButton
          fullWidth
          type="submit"
          disabled={isLoading}
          variant="contained"
          sx={{ mt: 2.5 }}
          endIcon={isLoading ? <DotSpinner size={20} /> : <ArrowForwardIcon />}
        >
          {isLoading ? "Inscription..." : "S&apos;inscrire"}
        </CustomButton>

        {/* Login Link */}
        <Typography
          variant="body2"
          sx={{
            textAlign: "center",
            mt: 2,
          }}
        >
          Vous avez déjà un compte ?{" "}
          <Link
            onClick={() => router.push("/sign-in")}
            sx={{
              color: "#2563EB",
              cursor: "pointer",
              textDecoration: "none",
              "&:hover": {
                textDecoration: "underline",
              },
            }}
          >
            Se connecter
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
