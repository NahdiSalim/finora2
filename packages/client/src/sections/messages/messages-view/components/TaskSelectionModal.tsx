import { useState, useCallback, useEffect } from "react";
import { Box, Typography, Chip, useTheme, alpha } from "@mui/material";
import { CheckCircle2, Clock, AlertCircle } from "lucide-react";
import AttachmentSelectionModal from "./AttachmentSelectionModal";
import { useGetChatAccessibleTasksQuery } from "../../../../lib/services/chatApi";
import type { ChatMessageTask } from "../../../../lib/services/chatApi";
import type { MessageTask } from "../data/types";

type TaskSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (task: MessageTask) => void;
  collaboratorId: number | null;
};

const TASK_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; icon: any }
> = {
  todo: {
    label: "À faire",
    color: "#94A3B8",
    icon: Clock,
  },
  in_progress: {
    label: "En cours",
    color: "#8B5CF6",
    icon: Clock,
  },
  in_review: {
    label: "En révision",
    color: "#F59E0B",
    icon: AlertCircle,
  },
  completed: {
    label: "Terminé",
    color: "#10B981",
    icon: CheckCircle2,
  },
};

const TASK_PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  low: {
    label: "Basse",
    color: "#1d61e7",
  },
  medium: {
    label: "Moyenne",
    color: "#F59E0B",
  },
  high: {
    label: "Haute",
    color: "#ff7d0d",
  },
  urgent: {
    label: "Urgent !",
    color: "#ff5757",
  },
};

export default function TaskSelectionModal({
  open,
  onClose,
  onSelect,
  collaboratorId,
}: TaskSelectionModalProps) {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [allTasks, setAllTasks] = useState<ChatMessageTask[]>([]);

  const { data, isLoading, isFetching } = useGetChatAccessibleTasksQuery(
    { collaboratorId: collaboratorId!, page, limit: 5 },
    { skip: !open || !collaboratorId },
  );

  const handleLoadMore = useCallback(() => {
    if (data?.pagination && page < data.pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  }, [data?.pagination, page]);

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllTasks(data.data);
      } else {
        setAllTasks((prev) => [...prev, ...data.data]);
      }
    }
  }, [data, page]);

  useEffect(() => {
    if (!open) {
      setPage(1);
      setAllTasks([]);
    }
  }, [open]);

  const handleSelect = (task: ChatMessageTask) => {
    onSelect({
      id: task.id,
      title: task.title,
      status: task.status,
      priority: task.priority,
    });
    onClose();
  };

  const renderTaskItem = (task: ChatMessageTask) => {
    const statusConfig =
      TASK_STATUS_CONFIG[task.status] || TASK_STATUS_CONFIG.todo;
    const priorityConfig =
      TASK_PRIORITY_CONFIG[task.priority] || TASK_PRIORITY_CONFIG.medium;
    const StatusIcon = statusConfig.icon;

    return (
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 1.5,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          transition: "all 0.2s",
          "&:hover": {
            borderColor: theme.palette.primary.main,
            boxShadow: theme.shadows[2],
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box
            sx={{
              mt: 0.25,
              color: statusConfig.color,
            }}
          >
            <StatusIcon size={18} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: 14, sm: 15 },
                color: theme.palette.text.primary,
                mb: 1,
                wordBreak: "break-word",
              }}
            >
              {task.title}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Chip
                size="small"
                label={statusConfig.label}
                sx={{
                  bgcolor: alpha(statusConfig.color, 0.08),
                  color: statusConfig.color,
                  fontWeight: 600,
                  borderRadius: 2,
                  fontSize: 11,
                  border: `1px solid ${alpha(statusConfig.color, 0.25)}`,
                  height: 24,
                }}
              />
              <Chip
                size="small"
                label={priorityConfig.label}
                sx={{
                  bgcolor: alpha(priorityConfig.color, 0.08),
                  color: priorityConfig.color,
                  fontWeight: 600,
                  borderRadius: 2,
                  fontSize: 11,
                  border: `1px solid ${alpha(priorityConfig.color, 0.25)}`,
                  height: 24,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <AttachmentSelectionModal
      open={open}
      onClose={onClose}
      title="Sélectionner une tâche"
      items={allTasks}
      isLoading={isLoading || isFetching}
      hasMore={!!data?.pagination && page < data.pagination.totalPages}
      onLoadMore={handleLoadMore}
      onSelect={handleSelect}
      renderItem={renderTaskItem}
      emptyMessage="Aucune tâche disponible pour ce collaborateur"
    />
  );
}
