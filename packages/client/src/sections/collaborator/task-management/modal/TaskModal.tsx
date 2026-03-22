import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  useTheme,
  IconButton,
  alpha,
  useMediaQuery,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { X, Plus } from "lucide-react";

import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import FileUpload from "src/components/common/FileUpload";
import { useCreateTaskMutation } from "src/lib/services/tasksApi";
import { useGetCollaboratorsQuery } from "src/lib/services/collaboratorsApi";
import { useGetClientsQuery } from "src/lib/services/clientApi";
import type { KanbanColumn } from "../types";

interface TaskModalProps {
  open: boolean;
  onClose: () => void;
  columnId?: KanbanColumn["id"];
  onTaskCreated?: () => void;
}

interface TaskFormData {
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  type: "accounting" | "review" | "meeting" | "document" | "other";
  assigneeIds: number[];
  clientId: string;
  dueDate: string;
}

export default function TaskModal({
  open,
  onClose,
  columnId,
  onTaskCreated,
}: TaskModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [fileSlots, setFileSlots] = useState<Array<File | null>>([null]);
  const [submitError, setSubmitError] = useState<string>("");

  const [createTask, { isLoading: isCreating }] = useCreateTaskMutation();
  const { data: collaboratorsData } = useGetCollaboratorsQuery({
    page: 1,
    limit: 100,
  });
  const { data: clientsData } = useGetClientsQuery({ page: 1, limit: 100 });

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isValid },
  } = useForm<TaskFormData>({
    mode: "onChange",
    defaultValues: {
      title: "",
      description: "",
      priority: "medium",
      type: "other",
      assigneeIds: [],
      clientId: "",
      dueDate: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        priority: "medium",
        type: "other",
        assigneeIds: [],
        clientId: "",
        dueDate: "",
      });
      setFileSlots([null]);
      setSubmitError("");
    }
  }, [open, reset]);

  const onSubmit: SubmitHandler<TaskFormData> = async (data) => {
    try {
      setSubmitError("");

      if (!data.assigneeIds || data.assigneeIds.length === 0) {
        setSubmitError("Veuillez sélectionner au moins un collaborateur");
        return;
      }

      const formData = new FormData();
      formData.append("title", data.title);
      if (data.description) formData.append("description", data.description);
      formData.append("priority", data.priority);
      formData.append("type", data.type);
      formData.append("assigneeIds", JSON.stringify(data.assigneeIds));
      if (data.clientId) formData.append("clientId", data.clientId);
      if (data.dueDate)
        formData.append("dueDate", new Date(data.dueDate).toISOString());

      const filesToUpload = fileSlots.filter((f): f is File => f !== null);
      filesToUpload.forEach((file) => {
        formData.append("attachments", file);
      });

      await createTask(formData).unwrap();

      reset();
      setFileSlots([null]);
      onClose();
      if (onTaskCreated) {
        onTaskCreated();
      }
    } catch (error: any) {
      console.error("Failed to create task:", error);
      setSubmitError(
        error?.data?.message || "Erreur lors de la création de la tâche",
      );
    }
  };

  const handleClose = () => {
    reset();
    setFileSlots([null]);
    setSubmitError("");
    onClose();
  };

  const handleFileChange = (index: number, file: File | null) => {
    const newSlots = [...fileSlots];
    newSlots[index] = file;
    setFileSlots(newSlots);
  };

  const handleAddFileSlot = () => {
    setFileSlots([...fileSlots, null]);
  };

  const handleRemoveFileSlot = (index: number) => {
    if (fileSlots.length === 1) {
      setFileSlots([null]);
    } else {
      setFileSlots(fileSlots.filter((_, i) => i !== index));
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      keepMounted={false}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.grey[900], 0.5),
          backdropFilter: "blur(4px)",
        },
      }}
      sx={{
        zIndex: theme.zIndex.modal,
        "& .MuiDialog-paper": {
          margin: { xs: 0, sm: 2, md: 4 },
          maxHeight: {
            xs: "100%",
            sm: "calc(100% - 32px)",
            md: "calc(100% - 64px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: "white",
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2, sm: 2.5 },
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          bgcolor: "white",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={700}
            sx={{
              fontSize: { xs: "1.25rem", sm: "1.5rem" },
              lineHeight: 1.4,
              color: theme.palette.text.primary,
              mb: 0.5,
            }}
          >
            Créer une nouvelle tâche
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              fontSize: { xs: "0.875rem", sm: "0.9375rem" },
              lineHeight: 1.5,
            }}
          >
            Assignez une tâche à un collaborateur
          </Typography>
        </Box>

        <IconButton
          onClick={handleClose}
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
      <DialogContent sx={{ p: { xs: 2.5, sm: 4 }, bgcolor: "white" }}>
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{ display: "flex", flexDirection: "column", gap: 3 }}
        >
          {/* Error Message */}
          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError("")}>
              {submitError}
            </Alert>
          )}

          {/* Titre - Full Width */}
          <CustomInput
            {...register("title", { required: "Titre est requis" })}
            label="Titre"
            placeholder="Ex: Préparation bilan 2025"
            fullWidth
            required
            error={!!errors.title}
            helperText={errors.title?.message}
          />

          {/* Description - Full Width */}
          <CustomInput
            {...register("description")}
            label="Description"
            placeholder="Description de la tâche..."
            fullWidth
            multiline
            rows={4}
            error={!!errors.description}
            helperText={errors.description?.message}
          />

          {/* Two-Column Grid Row 1: Priorité | Type */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="priority"
                control={control}
                rules={{ required: "Priorité est requise" }}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label="Priorité"
                    required
                    error={!!errors.priority}
                    helperText={errors.priority?.message}
                  >
                    <MenuItem value="low">Basse</MenuItem>
                    <MenuItem value="medium">Normale</MenuItem>
                    <MenuItem value="high">Haute</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </CustomSelect>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="type"
                control={control}
                rules={{ required: "Type est requis" }}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label="Type"
                    required
                    error={!!errors.type}
                    helperText={errors.type?.message}
                  >
                    <MenuItem value="accounting">Comptabilité</MenuItem>
                    <MenuItem value="review">Révision</MenuItem>
                    <MenuItem value="meeting">Réunion</MenuItem>
                    <MenuItem value="document">Document</MenuItem>
                    <MenuItem value="other">Autre</MenuItem>
                  </CustomSelect>
                )}
              />
            </Grid>
          </Grid>

          {/* Collaborateurs (Multiple Selection) */}
          <Controller
            name="assigneeIds"
            control={control}
            rules={{ required: "Au moins un collaborateur est requis" }}
            render={({ field }) => (
              <CustomSelect
                {...field}
                label="Assigner à"
                required
                multiple
                error={!!errors.assigneeIds}
                helperText={errors.assigneeIds?.message}
                displayEmpty
                renderValue={(selected) => {
                  if (!selected || (selected as number[]).length === 0) {
                    return (
                      <Typography color="text.secondary" fontSize={14}>
                        Sélectionner un ou plusieurs collaborateurs
                      </Typography>
                    );
                  }
                  return (
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                      {(selected as number[]).map((value) => {
                        const collab = collaboratorsData?.data.find(
                          (c) => Number(c.id) === value,
                        );
                        return (
                          <Chip
                            key={value}
                            label={
                              collab
                                ? `${collab.firstName} ${collab.lastName}`
                                : value
                            }
                            size="small"
                          />
                        );
                      })}
                    </Box>
                  );
                }}
              >
                {collaboratorsData?.data.map((collab) => (
                  <MenuItem key={collab.id} value={Number(collab.id)}>
                    {collab.firstName} {collab.lastName} ({collab.email})
                  </MenuItem>
                ))}
              </CustomSelect>
            )}
          />

          {/* Two-Column Grid Row 2: Client | Date d'échéance */}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label="Client (optionnel)"
                    error={!!errors.clientId}
                    helperText={errors.clientId?.message}
                  >
                    <MenuItem value="">Aucun</MenuItem>
                    {clientsData?.data.map((client) => {
                      let displayName = client.fullName || "";

                      if (
                        !displayName &&
                        client.ownerFirstName &&
                        client.ownerLastName
                      ) {
                        displayName = `${client.ownerFirstName} ${client.ownerLastName}`;
                      }

                      if (!displayName && client.company) {
                        displayName =
                          typeof client.company === "string"
                            ? client.company
                            : client.company.name;
                      }

                      if (!displayName) {
                        displayName = client.email || `Client ${client.id}`;
                      }

                      return (
                        <MenuItem key={client.id} value={client.id}>
                          {displayName}
                        </MenuItem>
                      );
                    })}
                  </CustomSelect>
                )}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                {...register("dueDate")}
                label="Date d'échéance"
                type="date"
                fullWidth
                error={!!errors.dueDate}
                helperText={errors.dueDate?.message}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>

          {/* File Upload */}
          <Box>
            {fileSlots.map((file, index) => (
              <Box key={index} sx={{ mb: 2, position: "relative" }}>
                <FileUpload
                  label={
                    index === 0
                      ? "Pièces jointes (optionnel)"
                      : `Fichier ${index + 1}`
                  }
                  value={file}
                  onChange={(newFile) => handleFileChange(index, newFile)}
                  acceptedFiles={[
                    ".pdf",
                    ".doc",
                    ".docx",
                    ".xls",
                    ".xlsx",
                    ".jpg",
                    ".jpeg",
                    ".png",
                  ]}
                  maxSize={50}
                />
                {fileSlots.length > 1 && (
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveFileSlot(index)}
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      color: theme.palette.error.main,
                    }}
                  >
                    <X size={18} />
                  </IconButton>
                )}
              </Box>
            ))}

            <CustomButton
              variant="outlined"
              onClick={handleAddFileSlot}
              startIcon={<Plus size={16} />}
              fullWidth
            >
              Ajouter un fichier
            </CustomButton>
          </Box>

          {/* Footer actions */}
          <Box
            sx={{
              mt: 2,
              pt: 3,
              display: "flex",
              flexDirection: { xs: "column-reverse", sm: "row" },
              justifyContent: "flex-end",
              alignItems: "center",
              gap: 2,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
            }}
          >
            <CustomButton
              variant="outlined"
              onClick={handleClose}
              fullWidth={isMobile}
              sx={{
                minWidth: { sm: 120 },
                borderColor: theme.palette.grey[300],
                color: theme.palette.text.primary,
                "&:hover": {
                  borderColor: theme.palette.grey[400],
                  bgcolor: theme.palette.grey[50],
                },
              }}
            >
              Annuler
            </CustomButton>

            <CustomButton
              type="submit"
              variant="contained"
              disabled={!isValid || isCreating}
              fullWidth={isMobile}
              sx={{
                minWidth: { sm: 120 },
                bgcolor: theme.palette.primary.main,
                "&:hover": {
                  bgcolor: theme.palette.primary.dark,
                },
              }}
            >
              {isCreating ? (
                <CircularProgress size={20} color="inherit" />
              ) : (
                "Créer"
              )}
            </CustomButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
