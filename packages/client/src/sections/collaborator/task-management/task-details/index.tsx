import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Card, useTheme, CircularProgress, Alert } from "@mui/material";
import { Loader2, Check, Send, Archive } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import { useAppSelector } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";
import { SimpleTabs } from "./simple-tabs";
import { TaskDetailsContent } from "./task-details-content";
import { DocumentsContent } from "./documents-content";
import { EchangesContent } from "./echanges-content";
import {
  useGetTaskByIdQuery,
  useStartTaskMutation,
  useSubmitForReviewMutation,
  useCompleteTaskMutation,
  useArchiveTaskMutation,
} from "src/lib/services/tasksApi";

export default function TaskDetailsView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("details");
  const { user } = useAppSelector((state) => state.auth);

  const {
    data: taskData,
    isLoading,
    error,
    refetch,
  } = useGetTaskByIdQuery(Number(taskId), { skip: !taskId });
  const [startTask, { isLoading: isStarting }] = useStartTaskMutation();
  const [submitForReview, { isLoading: isSubmitting }] =
    useSubmitForReviewMutation();
  const [completeTask, { isLoading: isCompleting }] = useCompleteTaskMutation();
  const [archiveTask, { isLoading: isArchiving }] = useArchiveTaskMutation();

  const task = taskData?.data;

  const dashboardBase = useDashboardBase();
  const isCollaboratorView =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management");
  const tasksBase = isCollaboratorView
    ? "tasks"
    : "collaborators/task-management";

  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const userRoleUpper = userRole?.toUpperCase();
  const isCollaborator =
    userRoleUpper === ROLE_CODES.COLLABORATOR ||
    userRoleUpper === "COLLABORATEUR";
  const isAccountant =
    userRoleUpper === ROLE_CODES.ACCOUNTANT ||
    userRoleUpper === "COMPTABLE" ||
    userRoleUpper === ROLE_CODES.ADMINISTRATOR ||
    userRoleUpper === "ADMINISTRATEUR";

  const handleBack = () => {
    navigate(`${dashboardBase}/${tasksBase}`);
  };

  const handleStartTask = async () => {
    if (!task) return;
    try {
      await startTask(task.id).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to start task:", err);
    }
  };

  const handleSubmitForReview = async () => {
    if (!task) return;
    try {
      await submitForReview(task.id).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to submit task for review:", err);
    }
  };

  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      await completeTask(task.id).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
  };

  const handleArchiveTask = async () => {
    if (!task) return;
    try {
      await archiveTask(task.id).unwrap();
      handleBack();
    } catch (err) {
      console.error("Failed to archive task:", err);
    }
  };

  const getActionButton = () => {
    if (!task) return undefined;

    if (task.status === "todo") {
      return {
        label: "Marquer en cours",
        icon: <Loader2 size={18} />,
        onClick: handleStartTask,
        variant: "contained" as const,
        color: "warning" as const,
        disabled: isStarting,
        sx: {
          borderRadius: 1.5,
          bgcolor: "#F97316",
          "&:hover": {
            bgcolor: "#EA580C",
          },
        },
      };
    }

    if (task.status === "in_progress") {
      if (isCollaborator) {
        return {
          label: "Soumettre pour révision",
          icon: <Send size={18} />,
          onClick: handleSubmitForReview,
          variant: "contained" as const,
          color: "primary" as const,
          disabled: isSubmitting,
          sx: {
            borderRadius: 1.5,
            bgcolor: "#8B5CF6",
            "&:hover": {
              bgcolor: "#7C3AED",
            },
          },
        };
      }
    }

    if (task.status === "in_review" && isAccountant) {
      return {
        label: "Marquer comme terminé",
        icon: <Check size={18} />,
        onClick: handleCompleteTask,
        variant: "contained" as const,
        color: "success" as const,
        disabled: isCompleting,
        sx: {
          borderRadius: 1.5,
          bgcolor: "#10B981",
          "&:hover": {
            bgcolor: "#059669",
          },
        },
      };
    }

    if (task.status === "completed" && isAccountant) {
      return {
        label: "Archiver",
        icon: <Archive size={18} />,
        onClick: handleArchiveTask,
        variant: "contained" as const,
        color: "secondary" as const,
        disabled: isArchiving,
        sx: {
          borderRadius: 1.5,
          bgcolor: "#64748B",
          color: "white",
          "&:hover": {
            bgcolor: "#475569",
          },
        },
      };
    }

    return undefined;
  };

  if (isLoading) {
    return (
      <PageHeader
        title={`Tâche #${taskId}`}
        caption="Chargement..."
        backButton={handleBack}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 400,
          }}
        >
          <CircularProgress />
        </Box>
      </PageHeader>
    );
  }

  if (error || !task) {
    return (
      <PageHeader
        title={`Tâche #${taskId}`}
        caption="Erreur"
        backButton={handleBack}
      >
        <Alert severity="error">
          Erreur lors du chargement de la tâche. Veuillez réessayer.
        </Alert>
      </PageHeader>
    );
  }

  const actionButton = getActionButton();

  return (
    <PageHeader
      title={`Tâche #${task.id}`}
      caption="Détails de la tâche"
      backButton={handleBack}
      actions={actionButton ? [actionButton] : []}
    >
      {/* Two Column Layout */}
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1.5, sm: 2 },
          flexDirection: { xs: "column", lg: "row" },
          height: "100%",
          width: "100%",
        }}
      >
        {/* Left Column - Main Content */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", lg: "1 1 65%" },
            minWidth: 0,
          }}
        >
          <Card
            sx={{
              bgcolor: "white",
              borderRadius: 1.5,
              overflow: "hidden",
              border: `1px solid ${theme.palette.grey[200]}`,
              display: "flex",
              flexDirection: "column",
              minHeight: { xs: "auto", lg: "calc(100vh - 300px)" },
              height: "100%",
              width: "100%",
            }}
          >
            {/* Status Tabs */}
            <SimpleTabs
              tabs={[
                {
                  id: "details",
                  label: "Détails de la tâche",
                },
                {
                  id: "documents",
                  label: "Documents",
                },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />

            {/* Content */}
            <Box
              sx={{
                p: { xs: 2, sm: 3 },
                flex: 1,
                overflowY: "auto",
              }}
            >
              {activeTab === "details" && (
                <TaskDetailsContent
                  task={task}
                  isCollaboratorView={isCollaboratorView}
                />
              )}
              {activeTab === "documents" && (
                <DocumentsContent task={task} onUpdate={refetch} />
              )}
            </Box>
          </Card>
        </Box>

        {/* Right Column - Echanges Panel */}
        <Box
          sx={{
            flex: { xs: "1 1 100%", lg: "1 1 35%" },
            minWidth: { xs: 0, lg: 320 },
          }}
        >
          <Card
            sx={{
              bgcolor: "white",
              borderRadius: 1.5,
              border: `1px solid ${theme.palette.grey[200]}`,
              p: { xs: 2, sm: 2.5, md: 3 },
              height: { xs: "auto", lg: "calc(100vh - 300px)" },
              minHeight: { xs: 400, lg: "calc(100vh - 300px)" },
              display: "flex",
              flexDirection: "column",
              width: "100%",
            }}
          >
            <EchangesContent task={task} onCommentAdded={refetch} />
          </Card>
        </Box>
      </Box>
    </PageHeader>
  );
}
