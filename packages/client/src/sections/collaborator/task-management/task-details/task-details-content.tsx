import {
  Box,
  Typography,
  useTheme,
  alpha,
  Chip,
  Avatar,
  Grid,
} from "@mui/material";
import { format } from "date-fns";
import type { Task } from "../types";
import { PRIORITY_CONFIG } from "../types";

interface TaskDetailsContentProps {
  task: Task;
  isCollaboratorView?: boolean;
}

export function TaskDetailsContent({
  task,
  isCollaboratorView = false,
}: TaskDetailsContentProps) {
  const theme = useTheme();

  const priorityConfig = PRIORITY_CONFIG[task.priority];

  const statusLabels: Record<Task["status"], string> = {
    todo: "À faire",
    in_progress: "En cours",
    in_review: "En révision",
    completed: "Terminé",
    cancelled: "Annulé",
  };

  const statusColors: Record<Task["status"], string> = {
    todo: "#EF4444",
    in_progress: "#F59E0B",
    in_review: "#8B5CF6",
    completed: "#10B981",
    cancelled: "#6B7280",
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2, sm: 3 },
      }}
    >
      {/* Title Area with Badges */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: { xs: 1.5, sm: 2 },
          flexWrap: "wrap",
        }}
      >
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            fontSize: { xs: 18, sm: 20 },
            color: theme.palette.text.primary,
          }}
        >
          {task.title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Chip
            label={statusLabels[task.status]}
            size="medium"
            sx={{
              height: 32,
              fontSize: 14,
              fontWeight: 600,
              bgcolor: alpha(statusColors[task.status], 0.1),
              color: statusColors[task.status],
              "& .MuiChip-label": {
                px: 2,
              },
            }}
          />
          <Chip
            label={priorityConfig.label}
            size="medium"
            sx={{
              height: 32,
              fontSize: 14,
              fontWeight: 600,
              bgcolor: alpha(priorityConfig.color, 0.1),
              color: priorityConfig.color,
              "& .MuiChip-label": {
                px: 2,
              },
            }}
          />
        </Box>
      </Box>

      {/* Description */}
      <Box>
        <Typography
          variant="body2"
          sx={{
            mb: 1,
            fontSize: 14,
            fontWeight: 500,
            color: theme.palette.text.secondary,
          }}
        >
          Description
        </Typography>
        <Box
          sx={{
            p: 2,
            bgcolor: theme.palette.grey[50],
            borderRadius: 2,
            border: `1px solid ${theme.palette.grey[300]}`,
            minHeight: 100,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: 14,
              color: theme.palette.text.primary,
              lineHeight: 1.6,
            }}
          >
            {task.description || ""}
          </Typography>
        </Box>
      </Box>

      {/* Grid Layout - 2 Columns */}
      <Grid container spacing={{ xs: 1.5, sm: 2 }}>
        {/* Client */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.secondary,
              }}
            >
              Client
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: theme.palette.grey[50],
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[300]}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: 14,
                  color: theme.palette.text.primary,
                }}
              >
                {task.client
                  ? `${task.client.firstName || ""} ${task.client.lastName || ""}`.trim() ||
                    task.client.username ||
                    task.client.email
                  : "Aucun client"}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Date d'échéance */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.secondary,
              }}
            >
              Date d&apos;échéance
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: theme.palette.grey[50],
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[300]}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: 14,
                  color: theme.palette.text.primary,
                }}
              >
                {task.dueDate
                  ? format(new Date(task.dueDate), "dd/MM/yyyy 'à' HH:mm")
                  : "Non définie"}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Assigné à */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.secondary,
              }}
            >
              Assigné à
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar
                alt={task.assignee.username}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: theme.palette.primary.main,
                  color: theme.palette.common.white,
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {task.assignee.firstName
                  ? `${task.assignee.firstName.charAt(0)}${task.assignee.lastName?.charAt(0) || ""}`
                  : task.assignee.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography variant="body2" fontWeight={600}>
                  {task.assignee.firstName && task.assignee.lastName
                    ? `${task.assignee.firstName} ${task.assignee.lastName}`
                    : task.assignee.username}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {task.assignee.email}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* Créé par */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box>
            <Typography
              variant="body2"
              sx={{
                mb: 1,
                fontSize: 14,
                fontWeight: 500,
                color: theme.palette.text.secondary,
              }}
            >
              Créé par
            </Typography>
            <Box
              sx={{
                p: 1.5,
                bgcolor: theme.palette.grey[50],
                borderRadius: 2,
                border: `1px solid ${theme.palette.grey[300]}`,
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontSize: 14,
                  color: theme.palette.text.primary,
                }}
              >
                {task.createdBy.firstName && task.createdBy.lastName
                  ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
                  : task.createdBy.username}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
