import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Navigate } from "react-router-dom";

import {
  Box,
  Link,
  Button,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import DotSpinner from "src/components/common/DotSpinner";

import { useRouter } from "src/routes/hooks";
import { RouterLink } from "src/routes/components";

import {
  signInValidationSchema,
  type SignInFormData,
} from "src/validations/Auth/auth-validation";

import { useAlert } from "src/contexts/AlertContext";
import { useAppSelector } from "src/hooks/use-redux";
import {
  useLoginInternalMutation,
  useVerifyUserQuery,
} from "src/lib/services/authApi";
import CustomInput from "src/components/common/CustomInput";
import PasswordField from "src/components/common/PasswordField";
import PhoneInput from "src/components/common/PhoneInput";

export function SignInView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [login, { isLoading }] = useLoginInternalMutation();

  const { isLoading: loadingVerif } = useVerifyUserQuery();
  const { isAuth } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: yupResolver(signInValidationSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      console.log("data", data);
      const result = await login(data).unwrap();
      console.log("result", result);
      localStorage.setItem("token", result.data.accessToken);
      localStorage.setItem("refresh_token", result.data.refreshToken);

      const firstRoute = "/";
      router.push(firstRoute);
    } catch (error: unknown) {
      const message =
        (typeof error === "object" &&
          error !== null &&
          "data" in error &&
          (error as { data?: { message?: string } })?.data?.message) ||
        "Échec de la connexion. Vérifiez vos identifiants.";

      showAlert(message, "error");
    }
  };

  if (loadingVerif) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <DotSpinner size={60} />
      </Box>
    );
  }

  if (isAuth) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        width: "100%",
        maxWidth: 434,
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: 28, fontWeight: 700, color: "#111827" }}>
          Se connecter
        </Typography>

        <Typography sx={{ fontSize: 14, color: "#6B7280", mt: 1 }}>
          Entrez vos informations pour vous connecter.
        </Typography>
      </Box>

      <CustomInput
        {...register("email")}
        label="Adresse email"
        error={!!errors.email}
        helperText={errors.email?.message}
        fullWidth
        required
        placeholder="Entrer votre adresse email"
      />

      <PasswordField mode="login" required />

      <PhoneInput
        label="Numéro de téléphone"
        required
        placeholder="Entrer votre numéro de téléphone"
        helperText="Nous ne partagerons jamais votre numéro"
      />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <FormControlLabel
          control={<Checkbox />}
          label={
            <Typography sx={{ fontSize: 13 }}>Se souvenir de moi</Typography>
          }
        />

        <Link
          component={RouterLink}
          href="/forgot-password"
          sx={{
            fontSize: 13,
            color: "#2563EB",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Mot de passe oublié ?
        </Link>
      </Box>

      <Button
        fullWidth
        type="submit"
        disabled={isLoading}
        variant="contained"
        sx={{
          height: 48,
          borderRadius: "12px",
          textTransform: "none",
          fontWeight: 600,
          fontSize: 15,
          boxShadow: "none",
          backgroundColor: "#2563EB",
          "&:hover": {
            backgroundColor: "#1D4ED8",
            boxShadow: "none",
          },
        }}
      >
        {isLoading ? "Connexion en cours…" : "Se connecter"}
      </Button>
    </Box>
  );
}
