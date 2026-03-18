import { Box, Typography, Avatar, useTheme, alpha, Chip } from "@mui/material";
import { Flag, MessageCircle, Folder } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import type { Task } from "./types";
import { PRIORITY_CONFIG } from "./types";
import { format } from "date-fns";

interface TaskCardProps {
  task: Task;
  isDragging?: boolean;
}

export function TaskCard({ task, isDragging = false }: TaskCardProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardBase = useDashboardBase();
  const tasksBase =
    location.pathname.includes("/tasks") &&
    !location.pathname.includes("/task-management")
      ? "tasks"
      : "collaborators/task-management";

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
        p: 2,
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
      <Box sx={{ mb: 1.5 }}>
        <Chip
          label={priorityConfig.label}
          size="small"
          sx={{
            height: 22,
            fontSize: 11,
            fontWeight: 600,
            bgcolor: alpha(priorityConfig.color, 0.1),
            color: priorityConfig.color,
            "& .MuiChip-label": {
              px: 1.25,
            },
          }}
        />
      </Box>

      {/* Title */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 600,
          fontSize: 14,
          color: theme.palette.text.primary,
          mb: task.description ? 1 : 0,
        }}
      >
        {task.title}
      </Typography>

      {/* Description */}
      {task.description && (
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            color: theme.palette.text.secondary,
            mb: 1.5,
            lineHeight: 1.5,
            display: "-webkit-box",
            WebkitLineClamp: 3,
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
          alignItems: "center",
          justifyContent: "space-between",
          mt: 1.5,
          pt: 1.5,
          borderTop: `1px solid ${theme.palette.grey[200]}`,
        }}
      >
        {/* Left: Date and Avatars */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Date with Flag */}
          {formattedDate && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Flag size={14} color={theme.palette.error.main} />
              <Typography
                variant="caption"
                sx={{
                  fontSize: 12,
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
              width: 24,
              height: 24,
              fontSize: 10,
              bgcolor: theme.palette.primary.main,
              color: theme.palette.common.white,
            }}
          >
            {assigneeName.charAt(0).toUpperCase()}
          </Avatar>
        </Box>

        {/* Right: Comments and Files */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {/* Comments */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <MessageCircle size={14} color={theme.palette.text.secondary} />
            <Typography
              variant="caption"
              sx={{
                fontSize: 12,
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
                fontSize: 12,
                color: theme.palette.text.secondary,
              }}
            >
              {task.attachments?.length || 0}
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
