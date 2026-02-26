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
import {
  collaboratorValidationSchema,
  type CollaboratorFormData,
} from "src/validations/collaborators/collaborator-validation";
import CustomInput from "src/components/common/CustomInput";
import PasswordField from "src/components/common/PasswordField";
import { useCreateCollaboratorMutation } from "src/lib/services/collaboratorsApi";
import { useAlert } from "src/contexts/AlertContext";

/* ---------------- SCHEMA ---------------- */

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CollaboratorModal({ open, onClose }: Props) {
  const { showAlert } = useAlert();
  const [createCollaborator, { isLoading }] = useCreateCollaboratorMutation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CollaboratorFormData>({
    resolver: yupResolver(collaboratorValidationSchema),
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
      showAlert("Collaborator created successfully", "success");
      reset();
      onClose();
    } catch {
      showAlert("Error creating collaborator", "error");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Create Collaborator</DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <CustomInput {...register("firstName")} label="First Name" />
          <CustomInput {...register("lastName")} label="Last Name" />
          <CustomInput {...register("email")} label="Email" />
          <CustomInput {...register("phone")} label="Phone" />
          <CustomInput {...register("position")} label="Position" />
          <CustomInput {...register("department")} label="Department" />

          <Controller
            name="password"
            control={control}
            render={({ field }) => <PasswordField {...field} mode="create" />}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit(onSubmit)}
          disabled={isLoading}
        >
          Create
        </Button>
      </DialogActions>
    </Dialog>
  );
}
