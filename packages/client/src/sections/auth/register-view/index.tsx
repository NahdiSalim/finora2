import { useState } from "react";
import type { Resolver } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  useRegisterAccountantMutation,
  useRegisterMutation,
} from "src/lib/services/authApi";
import { useRouter } from "src/routes/hooks";
import { useAlert } from "src/contexts/AlertContext";

import { Box, Typography, Link, MenuItem, Checkbox } from "@mui/material";

import DotSpinner from "src/components/common/DotSpinner";
import PhoneInput from "src/components/common/PhoneInput";
import PasswordField from "src/components/common/PasswordField";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import RadioCard from "src/components/common/RadioCard";
import FileUpload from "src/components/common/FileUpload";

import {
  registerValidationSchema,
  type RegisterFormData,
} from "src/validations/Auth/auth-validation";
import CustomSelect from "src/components/common/CustomSelect";

export function RegisterView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [registerAccountant, { isLoading: isAccountantLoading }] =
    useRegisterAccountantMutation();

  const {
    register,
    handleSubmit,
    watch,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(
      registerValidationSchema,
    ) as unknown as Resolver<RegisterFormData>,
    defaultValues: {
      email: "",
      phoneNumber: "",
      password: "",
      firmName: "",
      sector: "Finance",
      patentFile: undefined,
      rneFile: undefined,
      role: "CLIENT",
      agreeToTerms: false,
    },
  });

  const role = watch("role");
  const agree = watch("agreeToTerms");

  const accountantSteps = ["Informations", "Cabinet", "Mot de passe"];

  const onSubmit = async (data: RegisterFormData) => {
    try {
      if (role === "COMPTABLE") {
        const formData = new FormData();

        // Champs string (sécurisés)
        if (data.email) {
          formData.append("email", data.email);
        }

        if (data.phoneNumber) {
          formData.append("phone", data.phoneNumber);
        }

        if (data.firmName) {
          formData.append("firmName", data.firmName);
        }

        if (data.password) {
          formData.append("password", data.password);
        }

        // Fichiers
        if (data.patentFile instanceof File) {
          formData.append("patentFile", data.patentFile);
        }

        if (data.rneFile instanceof File) {
          formData.append("rneFile", data.rneFile);
        }

        await registerAccountant(formData).unwrap();

        showAlert("Compte créé. En attente de validation.", "success");

        router.push("/sign-in");
      } else {
        await registerUser(data).unwrap();
        router.push(`/check-email?email=${data.email}`);
      }
    } catch (error) {
      showAlert("Erreur lors de l'inscription", "error");
    }
  };
  const [activeStep, setActiveStep] = useState(0);

  const steps = ["Informations", "Documents", "Mot de passe"];
  const AccountantStepper = () => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
      {steps.map((_, index) => (
        <Box
          key={index}
          sx={{
            flex: 1,
            height: 4,
            borderRadius: 2,
            backgroundColor: index <= activeStep ? "#F97316" : "#E5E7EB",
            transition: "all .3s",
          }}
        />
      ))}
    </Box>
  );
  if (isLoading || isAccountantLoading) {
    return (
      <DotSpinner
        size={64}
        style={{ display: "block", margin: "100px auto" }}
      />
    );
  }
  return (
    <Box
      sx={{
        height: { xs: "80%", md: "90vh" },
        display: "flex",
        overflowY: { xs: "auto", md: "auto" },
        alignItems: "center",
        justifyContent: "center",
        mt: { xs: 4, md: 0 },
        pt: { xs: 46, md: 18 },
      }}
    >
      <Box
        component="form"
        onSubmit={handleSubmit(onSubmit)}
        sx={{ width: "100%", maxWidth: 500, px: 3 }}
      >
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          S&apos;inscrire
        </Typography>
        <Typography
          sx={{
            fontSize: 16,
            color: "#9CA3AF",
            textAlign: "left",
            pb: 2,
          }}
        >
          Inscrivez-vous pour profiter des fonctionnalités de FINORA{" "}
        </Typography>
        {role === "CLIENT" || activeStep === 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              S&apos;inscrire en tant que
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
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
        ) : null}

        {/* Stepper uniquement pour COMPTABLE */}
        {role === "COMPTABLE" && <AccountantStepper />}

        {/* ROLE Selection */}
        {role === "CLIENT" && (
          <>
            <CustomInput {...register("email")} label="Email" fullWidth />
            <Controller
              name="phoneNumber"
              control={control}
              render={({ field }) => (
                <PhoneInput {...field} label="Téléphone" fullWidth />
              )}
            />
            <Controller
              name="password"
              control={control}
              render={({ field }) => <PasswordField {...field} mode="create" />}
            />
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
            <CustomButton fullWidth type="submit" sx={{ mt: 3 }}>
              S&apos;inscrire
            </CustomButton>
          </>
        )}

        {/* COMPTABLE FLOW */}
        {role === "COMPTABLE" && (
          <>
            {activeStep === 0 && (
              <>
                <CustomInput
                  {...register("email")}
                  label="Email"
                  fullWidth
                  sx={{ mb: 2 }}
                />
                <Controller
                  name="phoneNumber"
                  control={control}
                  render={({ field }) => (
                    <PhoneInput {...field} label="Téléphone" fullWidth />
                  )}
                />
                <CustomButton
                  fullWidth
                  sx={{ mt: 3 }}
                  onClick={() => setActiveStep(1)}
                >
                  Suivant
                </CustomButton>
              </>
            )}

            {activeStep === 1 && (
              <>
                <CustomInput
                  {...register("firmName")}
                  label="Nom du cabinet"
                  placeholder="Nom du cabinet"
                  fullWidth
                  error={!!errors.firmName}
                  helperText={errors.firmName?.message}
                  sx={{ mb: 1 }}
                />

                {/* Secteur d'activité */}
                <Controller
                  name="sector"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Secteur d'activité"
                      required
                      sx={{ mb: 1 }}
                      error={!!errors.sector}
                      helperText={errors.sector?.message}
                    >
                      <MenuItem value="">Sélectionner un secteur</MenuItem>
                      <MenuItem value="finance">Finance</MenuItem>
                      <MenuItem value="audit">Audit</MenuItem>
                      <MenuItem value="comptabilite">Comptabilité</MenuItem>
                      <MenuItem value="conseil">Conseil</MenuItem>
                    </CustomSelect>
                  )}
                />
                <Box sx={{ mb: 1 }}>
                  <Controller
                    name="patentFile"
                    control={control}
                    render={({ field }) => (
                      <FileUpload
                        label="Patente"
                        value={field.value}
                        onChange={field.onChange}
                        error={!!errors.patentFile}
                        helperText={errors.patentFile?.message}
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="rneFile"
                  control={control}
                  render={({ field }) => (
                    <FileUpload
                      label="RNE"
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />

                <CustomButton
                  fullWidth
                  sx={{ mt: 2, height: 48, borderRadius: 2 }}
                  onClick={() => setActiveStep(2)}
                >
                  Suivant
                </CustomButton>
              </>
            )}
            {activeStep === 2 && (
              <>
                <Box sx={{ mb: 1 }}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <PasswordField
                        {...field}
                        mode="create"
                        error={!!errors.password}
                        helperText={errors.password?.message}
                      />
                    )}
                  />
                </Box>

                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field }) => (
                    <PasswordField
                      {...field}
                      error={!!errors.confirmPassword}
                      helperText={errors.confirmPassword?.message}
                      mode="login"
                      label="Confirmer Mot de passe"
                    />
                  )}
                />
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
                <CustomButton fullWidth type="submit" sx={{ mt: 2 }}>
                  S&apos;inscrire
                </CustomButton>
              </>
            )}
          </>
        )}
        <Typography variant="body2" sx={{ textAlign: "center", mt: 1 }}>
          Vous avez déjà un compte ?{" "}
          <Link
            onClick={() => router.push("/sign-in")}
            sx={{ cursor: "pointer" }}
          >
            Se connecter
          </Link>
        </Typography>
      </Box>
    </Box>
  );
}
