import { useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Box, Card, useTheme, CircularProgress, Alert } from "@mui/material";
import { Loader2, Check } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import { SimpleTabs } from "./simple-tabs";
import { TaskDetailsContent } from "./task-details-content";
import { DocumentsContent } from "./documents-content";
import {
  useGetTaskByIdQuery,
  useStartTaskMutation,
  useCompleteTaskMutation,
} from "src/lib/services/tasksApi";

export default function TaskDetailsView() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState("details");

  const {
    data: taskData,
    isLoading,
    error,
    refetch,
  } = useGetTaskByIdQuery(Number(taskId), { skip: !taskId });
  const [startTask, { isLoading: isStarting }] = useStartTaskMutation();
  const [completeTask, { isLoading: isCompleting }] = useCompleteTaskMutation();

  const task = taskData?.data;

  const dashboardBase = useDashboardBase();
  const isCollaboratorView =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management");
  const tasksBase = isCollaboratorView
    ? "tasks"
    : "collaborators/task-management";

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

  const handleCompleteTask = async () => {
    if (!task) return;
    try {
      await completeTask(task.id).unwrap();
      refetch();
    } catch (err) {
      console.error("Failed to complete task:", err);
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
    } else if (task.status === "in_progress") {
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
      {/* Tabs and Content Container - Rounded Square */}
      <Card
        sx={{
          bgcolor: "white",
          borderRadius: 1.5,
          overflow: "hidden",
          border: `1px solid ${theme.palette.grey[200]}`,
          display: "flex",
          flexDirection: "column",
          minHeight: "calc(100vh - 300px)",
          height: "100%",
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

        {/* Content - Full Width */}
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
    </PageHeader>
  );
}
