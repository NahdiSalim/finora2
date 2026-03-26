import { useState, useEffect, useMemo } from "react";
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  alpha,
  useTheme,
  useMediaQuery,
  Chip,
  MenuItem,
  Menu,
  Divider,
} from "@mui/material";
import { X, Download, Edit, Trash2, Save, UserPlus, Send } from "lucide-react";
import type { Request, RequestType } from "src/types/request";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import FileUpload from "src/components/common/FileUpload";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import dayjs from "dayjs";
import { useAlert } from "src/contexts/AlertContext";
import {
  useDeleteRequestMutation,
  useUpdateRequestMutation,
  useGetUsersByRoleQuery,
  useRespondToRequestMutation,
} from "src/lib/services/requestApi";
import { tasksApi } from "src/lib/services/tasksApi";
import { useForm, Controller } from "react-hook-form";
import { useAppSelector, useAppDispatch } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  requestValidationSchema,
  type RequestFormData,
} from "src/validations/request/request-validation";

type Props = {
  open: boolean;
  onClose: () => void;
  request: Request | null;
  pageContext?: "my_requests" | "client_requests"; // To determine what assignment options to show
};

export default function ViewRequestDrawer({
  open,
  onClose,
  request,
  pageContext = "client_requests",
}: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.down("md"));
  const { showAlert } = useAlert();
  const dispatch = useAppDispatch();
  const [deleteRequest, { isLoading: isDeleting }] = useDeleteRequestMutation();
  const [updateRequest, { isLoading: isUpdating }] = useUpdateRequestMutation();
  const [respondToRequest, { isLoading: isResponding }] =
    useRespondToRequestMutation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [assignedUserId, setAssignedUserId] = useState<number | null>(null);
  const [localRequest, setLocalRequest] = useState<Request | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [assignMenuAnchorEl, setAssignMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const isAssignMenuOpen = Boolean(assignMenuAnchorEl);
  const [showResponseView, setShowResponseView] = useState(false);
  const [responseNote, setResponseNote] = useState("");
  const [responseFiles, setResponseFiles] = useState<File[]>([]);

  // Get current user and check role
  const { user } = useAppSelector((state) => state.auth);
  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const userRoleUpper = userRole?.toUpperCase();
  // Handle both ACCOUNTANT and comptable (backend fallback)
  const isAccountant =
    userRoleUpper === ROLE_CODES.ACCOUNTANT ||
    userRoleUpper === "COMPTABLE" ||
    userRoleUpper === ROLE_CODES.ADMINISTRATOR ||
    userRoleUpper === "ADMINISTRATEUR" ||
    userRoleUpper === ROLE_CODES.COLLABORATOR ||
    userRoleUpper === "COLLABORATEUR";

  // Fetch users for assignment (accountants and collaborators)
  const { data: usersData } = useGetUsersByRoleQuery(
    ["ACCOUNTANT", "COLLABORATOR"],
    {
      skip: !isAccountant,
    },
  );

  // Combine usersData with current user for assignment dropdown
  const assignableUsers = useMemo(() => {
    if (!isAccountant || !user) return [];

    const users = usersData?.data || [];

    // Filter based on page context
    if (pageContext === "my_requests") {
      // On "Mes demandes" page: only show collaborators (exclude current user)
      return users.filter((u) => u.id !== Number(user.id));
    }

    // On "Demandes des clients" page: show "me" + all collaborators
    const currentUserIncluded = users.some((u) => u.id === Number(user.id));

    // If current user is not in the list, add them
    if (!currentUserIncluded && user) {
      return [
        {
          id: Number(user.id),
          username: user.full_name || user.email,
          firstName: null,
          lastName: null,
          email: user.email,
          role:
            typeof user.role === "object"
              ? {
                  code: user.role.code || "ACCOUNTANT",
                  nameFr: "Comptable",
                  nameEn: "Accountant",
                }
              : {
                  code: "ACCOUNTANT",
                  nameFr: "Comptable",
                  nameEn: "Accountant",
                },
        },
        ...users,
      ];
    }

    return users;
  }, [usersData, user, isAccountant, pageContext]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<RequestFormData>({
    resolver: yupResolver(requestValidationSchema),
    mode: "onChange",
    defaultValues: {
      subject: "",
      type: "accounting",
      urgency: "normal",
      topic: "",
      description: "",
      desiredResponseDate: "",
      desiredResponseTime: "",
      attachments: [],
    },
  });

  // Sync local request with prop
  useEffect(() => {
    if (request) {
      setLocalRequest(request);
    }
  }, [request]);

  // Reset form when request changes or edit mode toggles
  useEffect(() => {
    if (localRequest && isEditMode) {
      reset({
        subject: localRequest.subject || "",
        type: localRequest.type || ("accounting" as RequestType),
        urgency: localRequest.urgency || "normal",
        topic: localRequest.topic || "",
        description: localRequest.description || "",
        desiredResponseDate: localRequest.desiredResponseDate
          ? dayjs(localRequest.desiredResponseDate).format("YYYY-MM-DD")
          : "",
        desiredResponseTime: localRequest.desiredResponseTime || "",
        attachments: [],
      });
      setAssignedUserId(localRequest.assignedToId || null);
    } else if (localRequest) {
      setAssignedUserId(localRequest.assignedToId || null);
    }
  }, [localRequest, isEditMode, reset]);

  // Reset edit mode when drawer closes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
      setLocalRequest(null);
      setShowResponseView(false);
      setResponseNote("");
      setResponseFiles([]);
    }
  }, [open]);

  if (!localRequest) return null;

  const handleDelete = async () => {
    if (!localRequest) return;

    try {
      await deleteRequest(localRequest.id).unwrap();
      showAlert("Demande supprimée avec succès", "success");
      setShowDeleteModal(false);
      onClose();
    } catch (error) {
      showAlert("Erreur lors de la suppression de la demande", "error");
    }
  };

  const handleEdit = () => {
    // Only clients can edit request details
    if (!isAccountant) {
      setIsEditMode(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    reset();
  };

  const handleUpdateAssignmentAndStatus = async () => {
    if (!localRequest) return;

    try {
      const formData = new FormData();

      // Only update assignment and status
      if (assignedUserId !== null) {
        formData.append("assignedToId", assignedUserId.toString());
      } else {
        formData.append("assignedToId", "");
      }

      const result = await updateRequest({
        id: localRequest.id,
        data: formData,
      }).unwrap();

      // Update local request with the response data
      if (result.data) {
        setLocalRequest(result.data);
      }

      showAlert("Demande mise à jour avec succès", "success");
    } catch (error) {
      showAlert("Erreur lors de la mise à jour de la demande", "error");
    }
  };

  const handleOpenAssignMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAssignMenuAnchorEl(event.currentTarget);
  };

  const handleCloseAssignMenu = () => {
    setAssignMenuAnchorEl(null);
  };

  const handleAssignUser = async (userId: number | null) => {
    if (!localRequest) return;

    setAssignedUserId(userId);
    handleCloseAssignMenu();

    try {
      const formData = new FormData();
      if (userId !== null) {
        formData.append("assignedToId", userId.toString());
      } else {
        formData.append("assignedToId", "");
      }

      const result = await updateRequest({
        id: localRequest.id,
        data: formData,
      }).unwrap();

      // If request was converted to task, invalidate tasks cache
      if (result.data?.convertedToTaskId) {
        dispatch(
          tasksApi.util.invalidateTags([
            { type: "Tasks", id: "MY_ASSIGNED_LIST" },
            { type: "Tasks", id: "MY_CREATED_LIST" },
          ]),
        );
      }

      if (result.data) {
        setLocalRequest(result.data);
      }

      const assigneeName =
        userId === Number(user?.id)
          ? "vous-même"
          : assignableUsers.find((u) => u.id === userId)?.username ||
            "l'utilisateur";

      // If converted to task, show different message
      if (result.data?.convertedToTaskId) {
        showAlert(
          `Demande convertie en tâche et assignée à ${assigneeName}`,
          "success",
        );
      } else {
        showAlert(
          userId
            ? `Demande assignée à ${assigneeName}`
            : "Demande non assignée",
          "success",
        );
      }
    } catch (error) {
      showAlert("Erreur lors de la mise à jour de l'assignation", "error");
      // Revert to previous value on error
      setAssignedUserId(localRequest.assignedToId || null);
    }
  };

  const onSubmit = async (data: RequestFormData) => {
    if (!localRequest) return;

    try {
      const formData = new FormData();

      formData.append("subject", data.subject);
      formData.append("type", data.type);
      formData.append("urgency", data.urgency);

      if (data.topic) formData.append("topic", data.topic);
      if (data.description) formData.append("description", data.description);
      if (data.desiredResponseDate)
        formData.append("desiredResponseDate", data.desiredResponseDate);
      if (data.desiredResponseTime)
        formData.append("desiredResponseTime", data.desiredResponseTime);

      // Add assignment (for accountants only)
      if (isAccountant) {
        if (assignedUserId !== null) {
          formData.append("assignedToId", assignedUserId.toString());
        } else {
          formData.append("assignedToId", "");
        }
      }

      // Add new attachments if any
      if (data.attachments && data.attachments.length > 0) {
        data.attachments.forEach((file) => {
          formData.append("attachments", file);
        });
      }

      const result = await updateRequest({
        id: localRequest.id,
        data: formData,
      }).unwrap();

      // If request was converted to task, invalidate tasks cache
      if (result.data?.convertedToTaskId) {
        dispatch(
          tasksApi.util.invalidateTags([
            { type: "Tasks", id: "MY_ASSIGNED_LIST" },
            { type: "Tasks", id: "MY_CREATED_LIST" },
          ]),
        );
      }

      // Update local request with the response data
      if (result.data) {
        setLocalRequest(result.data);
      }

      // Show appropriate message
      if (result.data?.convertedToTaskId) {
        const assigneeName =
          assignableUsers.find((u) => u.id === assignedUserId)?.username ||
          "le collaborateur";
        showAlert(
          `Demande convertie en tâche et assignée à ${assigneeName}`,
          "success",
        );
      } else {
        showAlert("Demande mise à jour avec succès", "success");
      }
      setIsEditMode(false);
    } catch (error) {
      showAlert("Erreur lors de la mise à jour de la demande", "error");
    }
  };

  const handleSubmitResponse = async () => {
    if (!localRequest) return;

    if (!responseNote && responseFiles.length === 0) {
      showAlert("Veuillez ajouter une note ou des fichiers", "warning");
      return;
    }

    try {
      const formData = new FormData();

      if (responseNote) {
        formData.append("response", responseNote);
      }

      if (responseFiles.length > 0) {
        responseFiles.forEach((file) => {
          formData.append("responseAttachments", file);
        });
      }

      const result = await respondToRequest({
        id: localRequest.id,
        data: formData,
      }).unwrap();

      if (result.data) {
        setLocalRequest(result.data);
      }

      showAlert("Réponse envoyée avec succès", "success");
      setResponseNote("");
      setResponseFiles([]);
      setShowResponseView(false);
    } catch (error) {
      showAlert("Erreur lors de l'envoi de la réponse", "error");
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return dayjs(dateString).format("DD/MM/YYYY, HH:mm");
  };

  const formatDateOnly = (dateString: string | null | undefined) => {
    if (!dateString) return "-";
    return dayjs(dateString).format("DD/MM/YYYY");
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      pending: { label: "En attente", color: "#F59E0B" },
      in_progress: { label: "En cours", color: "#8B5CF6" },
      resolved: { label: "Terminé", color: "#10B981" },
      rejected: { label: "Rejeté", color: "#EF4444" },
      cancelled: { label: "Annulé", color: "#6B7280" },
    };
    return configs[status] || configs.pending;
  };

  const getUrgencyConfig = (urgency: string) => {
    const configs: Record<string, { label: string; color: string }> = {
      urgent: { label: "Urgent", color: "#EF4444" },
      high: { label: "High", color: "#F97316" },
      normal: { label: "Normal", color: "#F59E0B" },
      low: { label: "Low", color: "#6366F1" },
    };
    return configs[urgency] || configs.normal;
  };

  const statusConfig = getStatusConfig(localRequest.status);
  const urgencyConfig = getUrgencyConfig(localRequest.urgency);

  const downloadAttachment = (url: string, filename: string) => {
    const link = document.createElement("a");
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";
    link.href = `${apiUrl}/${url}`;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const description = watch("description");
  const characterCount = description?.length || 0;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme2) => theme2.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "95%", sm: 520 },
            height: "calc(100% - 32px)",
            top: "16px",
            right: { xs: "13px", sm: "16px" },
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          bgcolor: theme.palette.common.white,
          borderBottom: `1px solid ${theme.palette.divider}`,
          animation: open
            ? "slideDown 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
            : "none",
          "@keyframes slideDown": {
            "0%": {
              opacity: 0,
              transform: "translateY(-20px)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1.5,
          }}
        >
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{ flex: 1, pr: 2, fontSize: { xs: "1rem", sm: "1.125rem" } }}
          >
            {isEditMode ? "Modifier la demande" : localRequest.subject}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              bgcolor: alpha(theme.palette.grey[500], 0.08),
              "&:hover": {
                bgcolor: alpha(theme.palette.grey[500], 0.16),
                color: "text.primary",
              },
            }}
          >
            <X size={18} />
          </IconButton>
        </Box>

        {/* Status and Priority Badges - Only in view mode */}
        {!isEditMode && (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip
              label={statusConfig.label}
              sx={{
                bgcolor: alpha(statusConfig.color, 0.1),
                color: statusConfig.color,
                fontWeight: 600,
                fontSize: 11,
                height: 22,
                "& .MuiChip-label": { px: 1.25 },
              }}
            />
            <Chip
              label={urgencyConfig.label}
              sx={{
                bgcolor: alpha(urgencyConfig.color, 0.1),
                color: urgencyConfig.color,
                fontWeight: 600,
                fontSize: 11,
                height: 22,
                "& .MuiChip-label": { px: 1.25 },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Content */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          overflowY: "auto",
          flex: 1,
          "@keyframes fadeInUp": {
            "0%": {
              opacity: 0,
              transform: "translateY(20px)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },
        }}
      >
        {!isEditMode && !showResponseView ? (
          // DETAILS TAB - VIEW MODE
          <>
            {/* Info Grid - Client, Date, and Type */}
            <Box
              sx={{
                mb: 2,
                p: 1.5,
                bgcolor: theme.palette.common.white,
                borderRadius: 2,
                animation: open
                  ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both"
                  : "none",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                  gap: 2,
                  mb: 2,
                }}
              >
                {/* Client */}
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                  >
                    CLIENT
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={500}
                    sx={{ fontSize: 13 }}
                  >
                    {localRequest.client?.firstName}{" "}
                    {localRequest.client?.lastName}
                  </Typography>
                  {localRequest.client?.email && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 11 }}
                    >
                      {localRequest.client.email}
                    </Typography>
                  )}
                </Box>

                {/* Date souhaitée */}
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                  >
                    DATE SOUHAITÉE
                  </Typography>
                  <Typography variant="body2" sx={{ fontSize: 13 }}>
                    {localRequest.desiredResponseDate
                      ? formatDateOnly(localRequest.desiredResponseDate)
                      : "-"}
                  </Typography>
                  {localRequest.desiredResponseTime && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 11 }}
                    >
                      {localRequest.desiredResponseTime}
                    </Typography>
                  )}
                </Box>
              </Box>

              {/* Type de demande */}
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                >
                  TYPE DE DEMANDE
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {localRequest.type === "accounting" && "Comptabilité"}
                  {localRequest.type === "tax" && "Fiscalité"}
                  {localRequest.type === "consultation" && "Consultation"}
                  {localRequest.type === "document" && "Document"}
                  {localRequest.type === "other" && "Autre"}
                </Typography>
              </Box>
            </Box>

            {/* Collaborator Assignment Info - Show for accountants */}
            {isAccountant && localRequest.convertedToTask?.assignee && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  animation: open
                    ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.15s both"
                    : "none",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                >
                  COLLABORATEUR ASSIGNÉ
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={500}
                  sx={{ fontSize: 13 }}
                >
                  {localRequest.convertedToTask.assignee.firstName}{" "}
                  {localRequest.convertedToTask.assignee.lastName}
                </Typography>
              </Box>
            )}

            {/* Accountant Info (if assigned) - Show for clients */}
            {!isAccountant &&
              (localRequest.assignedTo || localRequest.respondedAt) && (
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    bgcolor: theme.palette.common.white,
                    borderRadius: 2,
                    animation: open
                      ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both"
                      : "none",
                  }}
                >
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns:
                        localRequest.assignedTo && localRequest.respondedAt
                          ? { xs: "1fr", sm: "1fr 1fr" }
                          : "1fr",
                      gap: 2,
                    }}
                  >
                    {localRequest.assignedTo && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                        >
                          COMPTABLE
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {localRequest.assignedTo.firstName ||
                            localRequest.assignedTo.username}
                        </Typography>
                      </Box>
                    )}
                    {localRequest.convertedToTask?.assignee && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                        >
                          COLLABORATEUR ASSIGNÉ
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {localRequest.convertedToTask.assignee.firstName}{" "}
                          {localRequest.convertedToTask.assignee.lastName}
                        </Typography>
                      </Box>
                    )}
                    {localRequest.respondedAt && (
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          fontWeight={600}
                          sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                        >
                          DATE RÉPONSE
                        </Typography>
                        <Typography variant="body2" sx={{ fontSize: 13 }}>
                          {formatDate(localRequest.respondedAt)}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              )}

            {/* Sujet */}
            {localRequest.topic && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: theme.palette.common.white,
                  borderRadius: 2,
                  animation: open
                    ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.3s both"
                    : "none",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                >
                  SUJET
                </Typography>
                <Typography variant="body2" sx={{ fontSize: 13 }}>
                  {localRequest.topic}
                </Typography>
              </Box>
            )}

            {/* Description */}
            {localRequest.description && (
              <Box
                sx={{
                  mb: 2,
                  p: 1.5,
                  bgcolor: theme.palette.common.white,
                  borderRadius: 2,
                  animation: open
                    ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both"
                    : "none",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                >
                  DESCRIPTION
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.5 }}
                >
                  {localRequest.description}
                </Typography>
              </Box>
            )}

            {/* Pièces jointes */}
            {localRequest.attachments &&
              localRequest.attachments.length > 0 && (
                <Box
                  sx={{
                    mb: 2,
                    animation: open
                      ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.6s both"
                      : "none",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    fontWeight={600}
                    sx={{ mb: 1, display: "block", fontSize: 10 }}
                  >
                    PIÈCES JOINTES
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                  >
                    {localRequest.attachments.map((attachment, index) => {
                      const filename =
                        attachment.split("/").pop() || `file-${index + 1}`;
                      const fileExtension = filename
                        .split(".")
                        .pop()
                        ?.toLowerCase();
                      const isPDF = fileExtension === "pdf";

                      return (
                        <Box
                          key={index}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            p: 1,
                            bgcolor: theme.palette.common.white,
                            borderRadius: 1.5,
                            border: `1px solid ${theme.palette.divider}`,
                          }}
                        >
                          {/* File Icon */}
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: "#EF4444",
                              borderRadius: 1,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            <Typography
                              variant="caption"
                              fontWeight={700}
                              color="white"
                              sx={{ fontSize: 9 }}
                            >
                              {isPDF
                                ? "PDF"
                                : fileExtension?.toUpperCase() || "FILE"}
                            </Typography>
                          </Box>

                          {/* File Info */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                fontSize: 12,
                              }}
                            >
                              {filename}
                            </Typography>
                          </Box>

                          {/* Download Button */}
                          <IconButton
                            size="small"
                            onClick={() =>
                              downloadAttachment(attachment, filename)
                            }
                            sx={{
                              width: 28,
                              height: 28,
                              border: `1px solid ${theme.palette.divider}`,
                              borderRadius: 1,
                              color: theme.palette.text.secondary,
                              "&:hover": {
                                bgcolor: alpha(
                                  theme.palette.primary.main,
                                  0.08,
                                ),
                                borderColor: theme.palette.primary.main,
                                color: theme.palette.primary.main,
                              },
                            }}
                          >
                            <Download size={14} />
                          </IconButton>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

            {/* Documents ajoutés par le comptable - Show if accountant has responded */}
            {localRequest.respondedAt && (
              <Box
                sx={{
                  mb: 2,
                  animation: open
                    ? "fadeInUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) 0.7s both"
                    : "none",
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight={600}
                  sx={{ mb: 1, display: "block", fontSize: 10 }}
                >
                  DOCUMENTS AJOUTÉS PAR LE COMPTABLE
                </Typography>
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: alpha(theme.palette.success.main, 0.08),
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                  }}
                >
                  {/* Response Note */}
                  {localRequest.response && (
                    <Box sx={{ mb: 2 }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        sx={{ mb: 0.5, display: "block", fontSize: 10 }}
                      >
                        NOTE
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          fontSize: 13,
                          lineHeight: 1.5,
                        }}
                      >
                        {localRequest.response}
                      </Typography>
                    </Box>
                  )}

                  {/* Response Timestamp */}
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", mb: 1, fontSize: 11 }}
                  >
                    Ajouté le {formatDate(localRequest.respondedAt)}
                  </Typography>

                  {/* Response Files */}
                  {localRequest.responseAttachments &&
                    localRequest.responseAttachments.length > 0 && (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                        }}
                      >
                        {localRequest.responseAttachments.map(
                          (attachment, index) => {
                            const filename =
                              attachment.split("/").pop() ||
                              `file-${index + 1}`;
                            const fileExtension = filename
                              .split(".")
                              .pop()
                              ?.toLowerCase();
                            const isPDF = fileExtension === "pdf";

                            return (
                              <Box
                                key={index}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                  p: 1,
                                  bgcolor: theme.palette.common.white,
                                  borderRadius: 1.5,
                                  border: `1px solid ${theme.palette.divider}`,
                                }}
                              >
                                {/* File Icon */}
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: "#10B981",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="white"
                                    sx={{ fontSize: 9 }}
                                  >
                                    {isPDF
                                      ? "PDF"
                                      : fileExtension?.toUpperCase() || "FILE"}
                                  </Typography>
                                </Box>

                                {/* File Info */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    fontWeight={500}
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                      fontSize: 12,
                                    }}
                                  >
                                    {filename}
                                  </Typography>
                                </Box>

                                {/* Download Button */}
                                <IconButton
                                  size="small"
                                  onClick={() =>
                                    downloadAttachment(attachment, filename)
                                  }
                                  sx={{
                                    width: 28,
                                    height: 28,
                                    border: `1px solid ${theme.palette.divider}`,
                                    borderRadius: 1,
                                    color: theme.palette.text.secondary,
                                    "&:hover": {
                                      bgcolor: alpha(
                                        theme.palette.success.main,
                                        0.08,
                                      ),
                                      borderColor: theme.palette.success.main,
                                      color: theme.palette.success.main,
                                    },
                                  }}
                                >
                                  <Download size={14} />
                                </IconButton>
                              </Box>
                            );
                          },
                        )}
                      </Box>
                    )}
                </Box>
              </Box>
            )}
          </>
        ) : !isEditMode && showResponseView ? (
          // RESPONSE VIEW - Accountant only
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              animation: "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          >
            {/* Back to Details Button */}
            <Box>
              <CustomButton
                variant="text"
                onClick={() => setShowResponseView(false)}
                startIcon={
                  <Box
                    sx={{
                      transform: "rotate(180deg)",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Send size={16} />
                  </Box>
                }
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.grey[500], 0.08),
                  },
                }}
              >
                Retour aux détails
              </CustomButton>
            </Box>

            {localRequest.respondedAt ? (
              // Already responded - Show disabled state
              <Box
                sx={{
                  p: 2,
                  bgcolor: alpha(theme.palette.info.main, 0.08),
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                  textAlign: "center",
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Vous avez déjà répondu à cette demande le{" "}
                  {formatDate(localRequest.respondedAt)}
                </Typography>
              </Box>
            ) : (
              <>
                {/* Response Note */}
                <Box>
                  <CustomInput
                    label="Note de réponse"
                    placeholder="Ajoutez votre réponse à la demande du client..."
                    fullWidth
                    multiline
                    rows={6}
                    value={responseNote}
                    onChange={(e) => setResponseNote(e.target.value)}
                  />
                </Box>

                {/* Response Files - Using FileUpload component */}
                <Box>
                  <FileUpload
                    label="Pièces jointes de réponse"
                    value={null}
                    onChange={(file) => {
                      if (file) {
                        setResponseFiles((prev) => [...prev, file]);
                      }
                    }}
                    helperText="Cliquez pour ajouter des fichiers (vous pouvez en ajouter plusieurs)"
                    maxSize={5}
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
                  />
                </Box>

                {/* Display selected files */}
                {responseFiles.length > 0 && (
                  <Box
                    sx={{
                      p: 1.5,
                      bgcolor: theme.palette.common.white,
                      borderRadius: 2,
                      border: `1px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight={600}
                      sx={{ mb: 1, display: "block", fontSize: 10 }}
                    >
                      FICHIERS SÉLECTIONNÉS ({responseFiles.length})
                    </Typography>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      {responseFiles.map((file, index) => {
                        const fileExtension = file.name
                          .split(".")
                          .pop()
                          ?.toLowerCase();
                        const isPDF = fileExtension === "pdf";
                        return (
                          <Box
                            key={index}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              p: 1,
                              bgcolor: alpha(theme.palette.grey[100], 0.5),
                              borderRadius: 1,
                            }}
                          >
                            {/* File Icon */}
                            <Box
                              sx={{
                                width: 28,
                                height: 28,
                                bgcolor: "#10B981",
                                borderRadius: 1,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                              }}
                            >
                              <Typography
                                variant="caption"
                                fontWeight={700}
                                color="white"
                                sx={{ fontSize: 8 }}
                              >
                                {isPDF
                                  ? "PDF"
                                  : fileExtension?.toUpperCase() || "FILE"}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              fontSize={12}
                              sx={{
                                flex: 1,
                                minWidth: 0,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {file.name}
                            </Typography>
                            <IconButton
                              size="small"
                              onClick={() =>
                                setResponseFiles((prev) =>
                                  prev.filter((_, i) => i !== index),
                                )
                              }
                              sx={{
                                color: "error.main",
                                width: 24,
                                height: 24,
                              }}
                            >
                              <X size={14} />
                            </IconButton>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                )}

                {/* Submit Response Button */}
                <CustomButton
                  variant="contained"
                  startIcon={<Send size={18} />}
                  onClick={handleSubmitResponse}
                  disabled={
                    isResponding ||
                    (!responseNote && responseFiles.length === 0)
                  }
                  fullWidth
                  loading={isResponding}
                  sx={{
                    bgcolor: "#10B981",
                    "&:hover": {
                      bgcolor: "#059669",
                    },
                  }}
                >
                  Envoyer la réponse
                </CustomButton>
              </>
            )}
          </Box>
        ) : (
          // EDIT MODE
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              animation: "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              "@keyframes fadeInUp": {
                "0%": {
                  opacity: 0,
                  transform: "translateY(20px)",
                },
                "100%": {
                  opacity: 1,
                  transform: "translateY(0)",
                },
              },
            }}
          >
            {/* Titre de la demande and Priorité Row */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
                animation:
                  "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.05s both",
              }}
            >
              {/* Titre de la demande */}
              <Box sx={{ flex: 2 }}>
                <CustomInput
                  {...register("subject")}
                  label="Titre de la demande"
                  placeholder="Saisir le Titre de la demande"
                  fullWidth
                  required
                  error={!!errors.subject}
                  helperText={errors.subject?.message}
                />
              </Box>

              {/* Priorité */}
              <Box sx={{ flex: 1 }}>
                <Controller
                  name="urgency"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Priorité"
                      required
                      error={!!errors.urgency}
                      helperText={errors.urgency?.message}
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </CustomSelect>
                  )}
                />
              </Box>
            </Box>

            {/* Type de demande */}
            <Box
              sx={{
                animation:
                  "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.05s both",
              }}
            >
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    {...field}
                    label="Type de demande"
                    required
                    error={!!errors.type}
                    helperText={errors.type?.message}
                    fullWidth
                  >
                    <MenuItem value="accounting">Comptabilité</MenuItem>
                    <MenuItem value="tax">Fiscalité</MenuItem>
                    <MenuItem value="consultation">Consultation</MenuItem>
                    <MenuItem value="document">Document</MenuItem>
                    <MenuItem value="other">Autre</MenuItem>
                  </CustomSelect>
                )}
              />
            </Box>

            {/* Assigné à (Only for accountants) */}
            {isAccountant && (
              <Box
                sx={{
                  animation:
                    "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both",
                }}
              >
                <CustomSelect
                  label="Assigné à"
                  value={assignedUserId || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAssignedUserId(value === "" ? null : Number(value));
                  }}
                  fullWidth
                >
                  <MenuItem value="">Non assigné</MenuItem>
                  {assignableUsers.map((assignableUser) => {
                    const isCurrentUser =
                      assignableUser.id === Number(user?.id);
                    const displayName =
                      assignableUser.firstName && assignableUser.lastName
                        ? `${assignableUser.firstName} ${assignableUser.lastName}`
                        : assignableUser.username;
                    const roleName =
                      typeof assignableUser.role === "object" &&
                      "nameFr" in assignableUser.role
                        ? assignableUser.role.nameFr
                        : "Comptable";
                    return (
                      <MenuItem
                        key={assignableUser.id}
                        value={assignableUser.id}
                      >
                        {isCurrentUser
                          ? `Moi (${displayName})`
                          : `${displayName} (${roleName})`}
                      </MenuItem>
                    );
                  })}
                </CustomSelect>
              </Box>
            )}

            {/* Sujet */}
            <Box
              sx={{
                animation:
                  "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.1s both",
              }}
            >
              <CustomInput
                {...register("topic")}
                label="Sujet"
                placeholder="Choisir votre sujet"
                fullWidth
                error={!!errors.topic}
                helperText={errors.topic?.message}
              />
            </Box>

            {/* Description */}
            <Box
              sx={{
                animation:
                  "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.15s both",
              }}
            >
              <CustomInput
                {...register("description")}
                label="Description"
                placeholder="Veuillez détailler votre demande"
                fullWidth
                multiline
                rows={4}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: "right",
                  mt: 0.5,
                  color: theme.palette.text.secondary,
                }}
              >
                Caractères: {characterCount}/5000
              </Typography>
            </Box>

            {/* Date & Time Row */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 1.5,
                animation:
                  "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both",
              }}
            >
              {/* Date de réponse souhaitée */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="desiredResponseDate"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      {...field}
                      label="Date"
                      type="date"
                      fullWidth
                      error={!!errors.desiredResponseDate}
                      helperText={errors.desiredResponseDate?.message}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  )}
                />
              </Box>

              {/* Heure de réponse souhaitée */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Controller
                  name="desiredResponseTime"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      {...field}
                      label="Heure"
                      type="time"
                      fullWidth
                      error={!!errors.desiredResponseTime}
                      helperText={errors.desiredResponseTime?.message}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Pièces jointes */}
            <Box
              sx={{
                animation:
                  "fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.25s both",
              }}
            >
              <Controller
                name="attachments"
                control={control}
                render={({ field }) => (
                  <FileUpload
                    label="Pièce jointe"
                    value={(field.value && field.value[0]) || null}
                    onChange={(file) => field.onChange(file ? [file] : [])}
                    existingFileUrl={
                      localRequest?.attachmentUrls?.[0] &&
                      !(field.value && field.value[0])
                        ? localRequest.attachmentUrls[0]
                        : null
                    }
                    existingFileName={
                      localRequest?.attachments?.[0] &&
                      !(field.value && field.value[0])
                        ? localRequest.attachments[0].split("/").pop() ||
                          undefined
                        : undefined
                    }
                    error={!!errors.attachments}
                    helperText={
                      errors.attachments?.message ||
                      "Ajouter une nouvelle pièce jointe (remplacera l'ancienne)"
                    }
                    maxSize={5}
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
                  />
                )}
              />
            </Box>
          </Box>
        )}
      </Box>

      {/* Footer Actions */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 1.5 },
          bgcolor: theme.palette.common.white,
          borderTop: `1px solid ${theme.palette.divider}`,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          animation: open
            ? "slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both"
            : "none",
          "@keyframes slideUp": {
            "0%": {
              opacity: 0,
              transform: "translateY(20px)",
            },
            "100%": {
              opacity: 1,
              transform: "translateY(0)",
            },
          },
        }}
      >
        {!isEditMode ? (
          <>
            {/* Accountant Actions */}
            {isAccountant && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  flexDirection: { xs: "column", sm: "row" },
                }}
              >
                <CustomButton
                  variant="contained"
                  color="primary"
                  startIcon={<UserPlus size={18} />}
                  onClick={handleOpenAssignMenu}
                  fullWidth
                  size="large"
                  sx={{
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {localRequest.convertedToTask?.assignee
                    ? `Assigné à ${localRequest.convertedToTask.assignee.firstName} ${localRequest.convertedToTask.assignee.lastName}`
                    : assignedUserId
                      ? assignedUserId === Number(user?.id)
                        ? "Assigné à moi"
                        : `Assigné à ${assignableUsers.find((u) => u.id === assignedUserId)?.username || "Utilisateur"}`
                      : "Assigner la demande"}
                </CustomButton>

                {/* Response Button - Only show if not yet responded */}
                {!localRequest.respondedAt && (
                  <CustomButton
                    variant="contained"
                    startIcon={<Send size={18} />}
                    onClick={() => setShowResponseView(true)}
                    fullWidth
                    size="large"
                    sx={{
                      fontSize: 14,
                      fontWeight: 600,
                      bgcolor: "#10B981",
                      "&:hover": {
                        bgcolor: "#059669",
                      },
                    }}
                  >
                    Répondre
                  </CustomButton>
                )}
              </Box>
            )}

            {/* Client Actions */}
            {!isAccountant && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1,
                }}
              >
                <CustomButton
                  variant="outlined"
                  startIcon={<Trash2 size={16} />}
                  onClick={() => setShowDeleteModal(true)}
                  disabled={localRequest.status === "resolved" || isDeleting}
                  fullWidth
                  sx={{
                    fontSize: 13,
                    py: 0.75,
                    borderColor: theme.palette.error.main,
                    color: theme.palette.error.main,
                    "&:hover": {
                      borderColor: theme.palette.error.dark,
                      bgcolor: alpha(theme.palette.error.main, 0.08),
                    },
                    "&:disabled": {
                      borderColor: theme.palette.grey[300],
                      color: theme.palette.grey[400],
                    },
                  }}
                >
                  Supprimer
                </CustomButton>
                <CustomButton
                  variant="contained"
                  startIcon={<Edit size={16} />}
                  onClick={handleEdit}
                  disabled={localRequest.status === "resolved"}
                  fullWidth
                  sx={{
                    fontSize: 13,
                    py: 0.75,
                    bgcolor: "#3B82F6",
                    "&:hover": {
                      bgcolor: "#2563EB",
                    },
                    "&:disabled": {
                      bgcolor: theme.palette.grey[300],
                      color: theme.palette.grey[500],
                    },
                  }}
                >
                  Modifier
                </CustomButton>
              </Box>
            )}
          </>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              gap: 1,
            }}
          >
            <CustomButton
              variant="text"
              onClick={handleCancelEdit}
              disabled={isUpdating}
              fullWidth
              sx={{
                fontSize: 13,
                py: 0.75,
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
              variant="contained"
              startIcon={isUpdating ? undefined : <Save size={16} />}
              onClick={handleSubmit(onSubmit)}
              disabled={isUpdating || !isDirty || !isValid}
              fullWidth
              sx={{
                fontSize: 13,
                py: 0.75,
                bgcolor: "#3B82F6",
                "&:hover": {
                  bgcolor: "#2563EB",
                },
              }}
            >
              {isUpdating ? "Mise à jour..." : "Enregistrer"}
            </CustomButton>
          </Box>
        )}
      </Box>

      {/* Assignment Menu */}
      <Menu
        anchorEl={assignMenuAnchorEl}
        open={isAssignMenuOpen}
        onClose={handleCloseAssignMenu}
        anchorOrigin={{
          vertical: "top",
          horizontal: "center",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        PaperProps={{
          sx: {
            width: { xs: "calc(100% - 48px)", sm: 320 },
            maxHeight: 400,
            mt: -1,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
            "& .MuiList-root": {
              py: 1,
            },
          },
        }}
      >
        {/* Show "Me" option only on client_requests page */}
        {pageContext === "client_requests" &&
          [
            <MenuItem
              key="me"
              onClick={() => handleAssignUser(Number(user?.id))}
              selected={assignedUserId === Number(user?.id)}
              sx={{
                py: 1.5,
                px: 2,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                },
                "&.Mui-selected": {
                  bgcolor: alpha(theme.palette.primary.main, 0.12),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.16),
                  },
                },
              }}
            >
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                <Typography variant="body2" fontWeight={600}>
                  Moi
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {user?.full_name || user?.email}
                </Typography>
              </Box>
            </MenuItem>,
            assignableUsers.length > 0 && (
              <Divider key="divider-me" sx={{ my: 0.5 }} />
            ),
          ].filter(Boolean)}

        {/* Show collaborators */}
        {assignableUsers.length > 0 ? (
          assignableUsers.map((assignableUser) => {
            // Skip current user in the list if we're on client_requests page (already shown above)
            if (
              pageContext === "client_requests" &&
              assignableUser.id === Number(user?.id)
            ) {
              return null;
            }

            const displayName =
              assignableUser.firstName && assignableUser.lastName
                ? `${assignableUser.firstName} ${assignableUser.lastName}`
                : assignableUser.username;
            const roleName =
              typeof assignableUser.role === "object" &&
              "nameFr" in assignableUser.role
                ? assignableUser.role.nameFr
                : "Comptable";

            return (
              <MenuItem
                key={assignableUser.id}
                onClick={() => handleAssignUser(assignableUser.id)}
                selected={assignedUserId === assignableUser.id}
                sx={{
                  py: 1.5,
                  px: 2,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                  "&.Mui-selected": {
                    bgcolor: alpha(theme.palette.primary.main, 0.12),
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.16),
                    },
                  },
                }}
              >
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}
                >
                  <Typography variant="body2" fontWeight={600}>
                    {displayName}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {roleName}
                  </Typography>
                </Box>
              </MenuItem>
            );
          })
        ) : (
          <MenuItem disabled sx={{ py: 1.5, px: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Aucun collaborateur disponible
            </Typography>
          </MenuItem>
        )}

        {/* Unassign option */}
        {(assignedUserId || localRequest.convertedToTask?.assignee) && [
          <Divider key="divider-unassign" sx={{ my: 0.5 }} />,
          <MenuItem
            key="unassign"
            onClick={() => handleAssignUser(null)}
            sx={{
              py: 1.5,
              px: 2,
              color: theme.palette.error.main,
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.08),
              },
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              Désassigner
            </Typography>
          </MenuItem>,
        ]}
      </Menu>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        isLoading={isDeleting}
      />
    </Drawer>
  );
}
