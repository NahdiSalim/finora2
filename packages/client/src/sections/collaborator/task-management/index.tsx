import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  MenuItem,
  useTheme,
  Card,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Plus, Search, Calendar } from "lucide-react";
import { DashboardContent } from "src/layouts/dashboard";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import { KanbanBoard } from "./kanban-board";
import TaskModal from "./modal/TaskModal";
import {
  useGetMyCreatedTasksQuery,
  useGetMyTasksQuery,
} from "src/lib/services/tasksApi";
import type { KanbanColumn, Task } from "./types";
import { COLUMN_CONFIG_ACCOUNTANT, COLUMN_CONFIG_COLLABORATOR } from "./types";

export default function TaskManagementView() {
  const theme = useTheme();
  const location = useLocation();
  const isMesTasks =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management");
  const [searchValue, setSearchValue] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<
    KanbanColumn["id"] | undefined
  >();

  const skipAccountantQuery = isMesTasks;
  const skipCollaboratorQuery = !isMesTasks;

  const {
    data: accountantTasksData,
    isLoading: isLoadingAccountant,
    error: errorAccountant,
    refetch: refetchAccountant,
  } = useGetMyCreatedTasksQuery(
    { page: 1, limit: 100 },
    { skip: skipAccountantQuery },
  );

  const {
    data: collaboratorTasksData,
    isLoading: isLoadingCollaborator,
    error: errorCollaborator,
    refetch: refetchCollaborator,
  } = useGetMyTasksQuery(
    { page: 1, limit: 100 },
    { skip: skipCollaboratorQuery },
  );

  const tasksData = isMesTasks ? collaboratorTasksData : accountantTasksData;
  const isLoading = isMesTasks ? isLoadingCollaborator : isLoadingAccountant;
  const error = isMesTasks ? errorCollaborator : errorAccountant;
  const refetch = isMesTasks ? refetchCollaborator : refetchAccountant;

  const COLUMN_CONFIG = isMesTasks
    ? COLUMN_CONFIG_COLLABORATOR
    : COLUMN_CONFIG_ACCOUNTANT;

  const columns = useMemo<KanbanColumn[]>(() => {
    if (!tasksData?.data) {
      return Object.entries(COLUMN_CONFIG).map(([id, config]) => ({
        id: id as KanbanColumn["id"],
        title: config.title,
        color: config.color,
        tasks: [],
      }));
    }

    const filteredTasks = tasksData.data.filter((task: Task) => {
      if (task.status === "cancelled") return false;

      if (searchValue.trim()) {
        const search = searchValue.toLowerCase();
        return (
          task.title.toLowerCase().includes(search) ||
          task.description?.toLowerCase().includes(search) ||
          task.assignee?.firstName?.toLowerCase().includes(search) ||
          task.assignee?.lastName?.toLowerCase().includes(search)
        );
      }

      return true;
    });

    const columnMap: Record<KanbanColumn["id"], Task[]> = {
      todo: [],
      in_progress: [],
      in_review: [],
      completed: [],
    };

    filteredTasks.forEach((task: Task) => {
      if (task.status in columnMap) {
        columnMap[task.status as KanbanColumn["id"]].push(task);
      }
    });

    const columnOrder: KanbanColumn["id"][] = [
      "todo",
      "in_progress",
      "in_review",
      "completed",
    ];

    return columnOrder.map((id) => ({
      id,
      title: COLUMN_CONFIG[id].title,
      color: COLUMN_CONFIG[id].color,
      tasks: columnMap[id] || [],
    }));
  }, [tasksData, searchValue, COLUMN_CONFIG]);

  const handleAddTask = (columnId?: KanbanColumn["id"]) => {
    setSelectedColumnId(columnId);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedColumnId(undefined);
  };

  const handleTaskCreated = () => {
    refetch();
  };

  return (
    <DashboardContent
      maxWidth={false}
      sx={{
        pt: 0,
        pl: { lg: 0 },
        pr: { lg: 1.5 },
      }}
    >
      {/* Title Container */}
      <Card
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: 2,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: { xs: "wrap", md: "nowrap" },
            gap: 2,
          }}
        >
          {/* Left Side - Title and Caption */}
          <Box>
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                fontSize: { xs: 24, md: 28 },
                color: theme.palette.text.primary,
                mb: 0.5,
              }}
            >
              {isMesTasks ? "Mes tâches" : "Gestion des tâches"}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontSize: 14,
                color: theme.palette.text.secondary,
              }}
            >
              {isMesTasks
                ? "Consultez et gérez vos tâches assignées."
                : "Gérez votre équipe et suivez leurs performances."}
            </Typography>
          </Box>

          {/* Right Side - Action Button (Accountant only) */}
          {!isMesTasks && (
            <Box>
              <CustomButton
                variant="contained"
                color="primary"
                startIcon={<Plus size={18} />}
                onClick={() => handleAddTask()}
              >
                Ajouter une tâche
              </CustomButton>
            </Box>
          )}
        </Box>
      </Card>

      {/* Content Container - Search Bar and Kanban Board */}
      <Card
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: 2,
        }}
      >
        {/* Controls Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            mb: 3,
            flexWrap: { xs: "wrap", md: "nowrap" },
          }}
        >
          {/* Search Bar */}
          <Box sx={{ width: { xs: "100%", md: "20%" }, minWidth: { md: 280 } }}>
            <CustomInput
              fullWidth
              placeholder="Rechercher"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              startIcon={<Search size={20} />}
            />
          </Box>

          {/* Date Filter */}
          <Box
            sx={{
              width: { xs: "100%", sm: "auto" },
              minWidth: { xs: "100%", sm: 200 },
              display: "flex",
              alignItems: "stretch",
              borderRadius: "10px",
              border: `1.5px solid ${theme.palette.grey[300]}`,
              overflow: "hidden",
              "&:hover": {
                borderColor: theme.palette.grey[600],
              },
              "&:focus-within": {
                borderColor: theme.palette.primary.main,
                boxShadow: `0px 0px 0px 3px ${theme.palette.primary.lighter}`,
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pl: 2,
                pr: 1,
                color: theme.palette.grey[600],
                flexShrink: 0,
              }}
            >
              <Calendar size={18} />
            </Box>
            <CustomSelect
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as string)}
              sx={{
                flex: 1,
                minWidth: 0,
                border: "none",
                boxShadow: "none",
                "& .MuiOutlinedInput-notchedOutline": {
                  border: "none",
                },
                "& .MuiSelect-select": {
                  pl: 0,
                  pr: 2,
                  minHeight: "auto",
                  fontSize: { xs: 14, sm: 16 },
                },
                "&.Mui-focused, &:hover": {
                  border: "none",
                  boxShadow: "none",
                },
              }}
            >
              <MenuItem value="today">Aujourd&apos;hui</MenuItem>
              <MenuItem value="week">Cette semaine</MenuItem>
              <MenuItem value="month">Ce mois</MenuItem>
            </CustomSelect>
          </Box>
        </Box>

        {/* Loading State */}
        {isLoading && (
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
        )}

        {/* Error State */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            Erreur lors du chargement des tâches. Veuillez réessayer.
          </Alert>
        )}

        {/* Kanban Board */}
        {!isLoading && !error && (
          <KanbanBoard
            columns={columns}
            onAddTask={handleAddTask}
            isCollaboratorView={isMesTasks}
          />
        )}
      </Card>

      {/* Task Modal (Accountant only) */}
      {!isMesTasks && (
        <TaskModal
          open={isTaskModalOpen}
          onClose={handleCloseTaskModal}
          columnId={selectedColumnId}
          onTaskCreated={handleTaskCreated}
        />
      )}
    </DashboardContent>
  );
}
