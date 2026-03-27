import {
  Box,
  Typography,
  Avatar,
  useTheme,
  alpha,
  Chip,
  IconButton,
} from "@mui/material";
import { Flag, MessageCircle, Folder, Archive } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import type { Task } from "./types";
import { PRIORITY_CONFIG } from "./types";
import { format } from "date-fns";
import { useArchiveTaskMutation } from "src/lib/services/tasksApi";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
  isAccountant?: boolean;
  columnId?: string;
}

export function TaskCard({
  task,
  isDragging = false,
  isAccountant = false,
  columnId,
}: TaskCardProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBase = useDashboardBase();
  const tasksBase =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management")
      ? "tasks"
      : "collaborators/task-management";

  const [archiveTask, { isLoading: isArchiving }] = useArchiveTaskMutation();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: task.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!isSortableDragging) {
      navigate(`${dashboardBase}/${tasksBase}/${task.id}`);
    }
  };

  const handleArchive = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await archiveTask(task.id).unwrap();
    } catch (err) {
      // Failed to archive task
    }
  };

  const priorityConfig = PRIORITY_CONFIG[task.priority];
  const formattedDate = task.dueDate
    ? format(new Date(task.dueDate), "dd/MM/yy")
    : "";

  const assigneeName = task.assignee
    ? `${task.assignee.firstName || ""} ${task.assignee.lastName || ""}`.trim() ||
      task.assignee.username
    : "Unknown";

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={handleClick}
      sx={{
        bgcolor: "white",
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
        boxShadow: isDragging ? theme.shadows[8] : theme.shadows[1],
        cursor: isDragging ? "grabbing" : "grab",
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: theme.shadows[4],
          transform: isDragging ? "none" : "translateY(-2px)",
        },
      }}
    >
      {/* Priority Badge */}
      <Box sx={{ mb: { xs: 1, sm: 1.5 } }}>
        <Chip
          label={priorityConfig.label}
          size="small"
          sx={{
            height: { xs: 20, sm: 22 },
            fontSize: { xs: 10, sm: 11 },
            fontWeight: 600,
            bgcolor: alpha(priorityConfig.color, 0.1),
            color: priorityConfig.color,
            "& .MuiChip-label": {
              px: { xs: 1, sm: 1.25 },
            },
          }}
        />
      </Box>

      {/* Title */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: { xs: 13, sm: 14 },
          color: theme.palette.text.primary,
          mb: task.description ? 1 : 0,
          lineHeight: 1.4,
        }}
      >
        {task.title}
      </Typography>

      {/* Description */}
      {task.description && (
        <Typography
          variant="body2"
          sx={{
            fontSize: { xs: 11, sm: 12 },
            color: theme.palette.text.secondary,
            mb: { xs: 1, sm: 1.5 },
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: { xs: 2, sm: 3 },
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {task.description}
        </Typography>
      )}

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          mt: { xs: 1, sm: 1.5 },
          pt: { xs: 1, sm: 1.5 },
          borderTop: `1px solid ${theme.palette.grey[200]}`,
          gap: 1,
        }}
      >
        {/* First Row: Date and Avatars */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 1.5 },
          }}
        >
          {/* Date with Flag */}
          {formattedDate && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Flag size={14} color={theme.palette.error.main} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  color: theme.palette.text.secondary,
                }}
              >
                {formattedDate}
              </Typography>
            </Box>
          )}

          {/* Assigned User */}
          <Avatar
            alt={assigneeName}
            sx={{
              width: { xs: 22, sm: 24 },
              height: { xs: 22, sm: 24 },
              fontSize: { xs: 9, sm: 10 },
              bgcolor: theme.palette.primary.main,
              color: theme.palette.common.white,
            }}
          >
            {assigneeName.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        {/* Second Row: Comments, Files on left, Archive on right */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, sm: 1.5 },
            }}
          >
            {/* Comments */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MessageCircle size={14} color={theme.palette.text.secondary} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  color: theme.palette.text.secondary,
                }}
              >
                {task.comments?.length || 0}
              </Typography>
            </Box>

            {/* Files */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Folder size={14} color={theme.palette.text.secondary} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  color: theme.palette.text.secondary,
                }}
              >
                {task.attachments?.length || 0}
              </Typography>
            </Box>
          </Box>

          {/* Archive Button - Only for completed tasks and accountants */}
          {columnId === "completed" && isAccountant && (
            <IconButton
              size="small"
              onClick={handleArchive}
              disabled={isArchiving}
              sx={{
                width: { xs: 22, sm: 24 },
                height: { xs: 22, sm: 24 },
                color: "#64748B",
                bgcolor: alpha("#64748B", 0.1),
                borderRadius: 1,
                "&:hover": {
                  bgcolor: alpha("#64748B", 0.2),
                  color: "#475569",
                },
                "&:disabled": {
                  opacity: 0.5,
                },
              }}
            >
              <Archive size={12} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}
