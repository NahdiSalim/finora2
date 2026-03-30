import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import {
  Box,
  MenuItem,
  useTheme,
  Card,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Plus, Search, Calendar } from "lucide-react";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import { KanbanBoard } from "./kanban-board";
import TaskModal from "./modal/TaskModal";
import {
  useGetMyCreatedTasksQuery,
  useGetMyTasksQuery,
} from "src/lib/services/tasksApi";
import type { KanbanColumn, Task } from "./types";
import { COLUMN_CONFIG_ACCOUNTANT, COLUMN_CONFIG_COLLABORATOR } from "./types";
import { useAppSelector, useAppDispatch } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";
import { PageHeader } from "src/layouts/components/page-header";

export default function TaskManagementView() {
  const theme = useTheme();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAppSelector((state) => state.auth);
  const isMesTasks =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management");

  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const userRoleUpper = userRole?.toUpperCase();
  const isAccountant =
    userRoleUpper === ROLE_CODES.ACCOUNTANT ||
    userRoleUpper === "COMPTABLE" ||
    userRoleUpper === ROLE_CODES.ADMINISTRATOR ||
    userRoleUpper === "ADMINISTRATEUR";

  // Initialize states from URL params
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") || "",
  );
  const [dateFilter, setDateFilter] = useState(
    searchParams.get("dateFilter") || "today",
  );
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [selectedColumnId, setSelectedColumnId] = useState<
    KanbanColumn["id"] | undefined
  >();

  // Pagination state per column
  const [columnPages, setColumnPages] = useState<
    Record<KanbanColumn["id"], number>
  >({
    todo: 1,
    in_progress: 1,
    in_review: 1,
    completed: 1,
  });

  // Accumulated tasks per column across pages
  const [accumulatedTasks, setAccumulatedTasks] = useState<
    Record<KanbanColumn["id"], Task[]>
  >({
    todo: [],
    in_progress: [],
    in_review: [],
    completed: [],
  });

  const TASKS_PER_PAGE = 3;
  const COLUMN_CONFIG = isMesTasks
    ? COLUMN_CONFIG_COLLABORATOR
    : COLUMN_CONFIG_ACCOUNTANT;

  // Fetch tasks for each column separately
  const columnStatuses: KanbanColumn["id"][] = [
    "todo",
    "in_progress",
    "in_review",
    "completed",
  ];

  const getQueryHook = () =>
    isMesTasks ? useGetMyTasksQuery : useGetMyCreatedTasksQuery;
  const QueryHook = getQueryHook();

  // Fetch data for each column (always fresh on parameter change)
  const todoQuery = QueryHook(
    {
      page: columnPages.todo,
      limit: TASKS_PER_PAGE,
      status: "todo",
      search: searchValue.trim() || undefined,
      dateFilter: dateFilter || undefined,
    },
    {
      skip: false,
      refetchOnMountOrArgChange: true,
    },
  );

  const inProgressQuery = QueryHook(
    {
      page: columnPages.in_progress,
      limit: TASKS_PER_PAGE,
      status: "in_progress",
      search: searchValue.trim() || undefined,
      dateFilter: dateFilter || undefined,
    },
    {
      skip: false,
      refetchOnMountOrArgChange: true,
    },
  );

  const inReviewQuery = QueryHook(
    {
      page: columnPages.in_review,
      limit: TASKS_PER_PAGE,
      status: "in_review",
      search: searchValue.trim() || undefined,
      dateFilter: dateFilter || undefined,
    },
    {
      skip: false,
      refetchOnMountOrArgChange: true,
    },
  );

  const completedQuery = QueryHook(
    {
      page: columnPages.completed,
      limit: TASKS_PER_PAGE,
      status: "completed",
      search: searchValue.trim() || undefined,
      dateFilter: dateFilter || undefined,
    },
    {
      skip: false,
      refetchOnMountOrArgChange: true,
    },
  );

  const columnQueries = {
    todo: todoQuery,
    in_progress: inProgressQuery,
    in_review: inReviewQuery,
    completed: completedQuery,
  };

  // Sync state with URL params on mount and navigation
  useEffect(() => {
    const urlSearch = searchParams.get("search") || "";
    const urlDateFilter = searchParams.get("dateFilter") || "today";

    if (urlSearch !== searchValue) {
      setSearchValue(urlSearch);
    }
    if (urlDateFilter !== dateFilter) {
      setDateFilter(urlDateFilter);
    }
  }, [searchParams]);

  // Reset to page 1 and clear accumulated tasks when search or date filter changes
  useEffect(() => {
    setColumnPages({
      todo: 1,
      in_progress: 1,
      in_review: 1,
      completed: 1,
    });
    setAccumulatedTasks({
      todo: [],
      in_progress: [],
      in_review: [],
      completed: [],
    });
  }, [searchValue, dateFilter]);

  // Accumulate tasks when new data arrives
  useEffect(() => {
    columnStatuses.forEach((status) => {
      const query = columnQueries[status];
      if (query.data?.data && !query.isLoading) {
        setAccumulatedTasks((prev) => {
          const currentPage = columnPages[status];
          const queryData = query.data;

          if (!queryData) return prev;

          if (currentPage === 1) {
            // Reset on page 1
            return { ...prev, [status]: queryData.data };
          } else {
            // Append new tasks, avoiding duplicates
            const existingIds = new Set(prev[status].map((t) => t.id));
            const newTasks = queryData.data.filter(
              (t) => !existingIds.has(t.id),
            );
            return { ...prev, [status]: [...prev[status], ...newTasks] };
          }
        });
      }
    });
  }, [
    todoQuery.data,
    inProgressQuery.data,
    inReviewQuery.data,
    completedQuery.data,
    columnPages,
  ]);

  const isLoading = Object.values(columnQueries).some(
    (q) => q.isLoading && q.originalArgs?.page === 1,
  );
  const error = Object.values(columnQueries).find((q) => q.error)?.error;

  const columns = useMemo<KanbanColumn[]>(() => {
    return columnStatuses.map((status) => {
      const query = columnQueries[status];
      const pagination = query.data?.pagination;

      return {
        id: status,
        title: COLUMN_CONFIG[status].title,
        color: COLUMN_CONFIG[status].color,
        tasks: accumulatedTasks[status],
        currentPage: columnPages[status],
        totalTasks: pagination?.total || 0,
        hasMore: pagination ? pagination.page < pagination.totalPages : false,
        isLoading: query.isLoading,
      };
    });
  }, [columnQueries, columnPages, COLUMN_CONFIG, accumulatedTasks]);

  const handleAddTask = (columnId?: KanbanColumn["id"]) => {
    setSelectedColumnId(columnId);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedColumnId(undefined);
  };

  const handleTaskCreated = () => {
    // Reset pagination and refetch all columns
    setColumnPages({
      todo: 1,
      in_progress: 1,
      in_review: 1,
      completed: 1,
    });
    setAccumulatedTasks({
      todo: [],
      in_progress: [],
      in_review: [],
      completed: [],
    });
    Object.values(columnQueries).forEach((q) => q.refetch());
  };

  const handleLoadMore = useCallback((columnId: KanbanColumn["id"]) => {
    setColumnPages((prev) => ({
      ...prev,
      [columnId]: prev[columnId] + 1,
    }));
  }, []);

  const handleTaskMoved = useCallback(
    (
      taskId: number,
      fromColumn: KanbanColumn["id"],
      toColumn: KanbanColumn["id"],
    ) => {
      setAccumulatedTasks((prev) => {
        const task = prev[fromColumn].find((t) => t.id === taskId);
        if (!task) return prev;

        return {
          ...prev,
          [fromColumn]: prev[fromColumn].filter((t) => t.id !== taskId),
          [toColumn]: [...prev[toColumn], { ...task, status: toColumn }],
        };
      });
    },
    [],
  );

  // Update URL params when filters change
  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set("search", value);
    } else {
      params.delete("search");
    }
    setSearchParams(params, { replace: true });
  };

  const handleDateFilterChange = (value: string) => {
    setDateFilter(value);
    const params = new URLSearchParams(searchParams);
    params.set("dateFilter", value);
    setSearchParams(params, { replace: true });
  };

  return (
    <PageHeader
      title={isMesTasks ? "Mes tâches" : "Gestion des tâches"}
      caption={
        isMesTasks
          ? "Consultez et gérez vos tâches assignées."
          : "Gérez votre équipe et suivez leurs performances."
      }
      actions={
        !isMesTasks
          ? [
              {
                label: "Ajouter une tâche",
                icon: <Plus size={18} />,
                onClick: handleAddTask,
                variant: "contained",
                color: "primary",
                sx: {
                  fontSize: { xs: 13, sm: 14 },
                  px: { xs: 2, sm: 3 },
                },
              },
            ]
          : []
      }
    >
      {/* Content Container - Search Bar and Kanban Board */}
      <Card
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: { xs: 1.5, sm: 2 },
        }}
      >
        {/* Controls Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: { xs: 1.5, sm: 2 },
            mb: { xs: 2, sm: 3 },
            flexWrap: "wrap",
          }}
        >
          {/* Search Bar */}
          <Box
            sx={{
              width: { xs: "100%", sm: "60%", md: "35%", lg: "25%" },
              minWidth: { sm: 200 },
            }}
          >
            <CustomInput
              fullWidth
              placeholder="Rechercher"
              value={searchValue}
              onChange={(e) => handleSearchChange(e.target.value)}
              startIcon={<Search size={20} />}
            />
          </Box>

          {/* Date Filter */}
          <Box
            sx={{
              width: { xs: "100%", sm: "35%", md: "auto" },
              minWidth: { xs: "100%", sm: 180, md: 200 },
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
              onChange={(e) => handleDateFilterChange(e.target.value as string)}
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
            onLoadMore={handleLoadMore}
            onTaskMoved={handleTaskMoved}
            isCollaboratorView={isMesTasks}
            isAccountant={!isMesTasks && isAccountant}
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
    </PageHeader>
  );
}
