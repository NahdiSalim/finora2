import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
} from "@mui/material";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";

import CustomInput from "src/components/common/CustomInput";
import PasswordField from "src/components/common/PasswordField";
import { useCreateClientMutation } from "src/lib/services/clientApi";
import { useAlert } from "src/contexts/AlertContext";

import {
  clientValidationSchema,
  type ClientFormData,
} from "src/validations/client/client-validation";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function ClientModal({ open, onClose }: Props) {
  const { showAlert } = useAlert();
  const [createClient, { isLoading }] = useCreateClientMutation();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    reset,
  } = useForm<ClientFormData>({
    resolver: yupResolver(clientValidationSchema),
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Client</DialogTitle>

      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
        >
          <CustomInput
            {...register("firstName")}
            label="First Name"
            error={!!errors.firstName}
            helperText={errors.firstName?.message}
          />

          <CustomInput
            {...register("lastName")}
            label="Last Name"
            error={!!errors.lastName}
            helperText={errors.lastName?.message}
          />

          <CustomInput
            {...register("email")}
            label="Email"
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <CustomInput
            {...register("phone")}
            label="Phone"
            error={!!errors.phone}
            helperText={errors.phone?.message}
          />

          <CustomInput
            {...register("companyName")}
            label="Company Name"
            error={!!errors.companyName}
            helperText={errors.companyName?.message}
          />

          <CustomInput {...register("siret")} label="SIRET" />
          <CustomInput {...register("vatNumber")} label="VAT Number" />
          <CustomInput {...register("legalForm")} label="Legal Form" />
          <CustomInput {...register("address")} label="Address" />
          <CustomInput {...register("city")} label="City" />
          <CustomInput {...register("postalCode")} label="Postal Code" />

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

          <DialogActions sx={{ px: 0 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isLoading}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
