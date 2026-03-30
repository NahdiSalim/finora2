import {
  Box,
  Typography,
  useTheme,
  alpha,
  Chip,
  Avatar,
  Grid,
  Card,
  Divider,
} from "@mui/material";
import { Calendar, User, Users, FileText, Building2 } from "lucide-react";
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
    archived: "Archivé",
  };

  const statusColors: Record<Task["status"], string> = {
    todo: "#EF4444",
    in_progress: "#F59E0B",
    in_review: "#8B5CF6",
    completed: "#10B981",
    cancelled: "#6B7280",
    archived: "#64748B",
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: { xs: 2.5, sm: 3 },
      }}
    >
      {/* Header Section - Title & Status */}
      <Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            mb: 1.5,
          }}
        >
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              fontSize: { xs: 20, sm: 24 },
              color: theme.palette.text.primary,
              lineHeight: 1.3,
            }}
          >
            {task.title}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            <Chip
              label={statusLabels[task.status]}
              size="medium"
              sx={{
                height: 32,
                fontSize: 13,
                fontWeight: 600,
                bgcolor: alpha(statusColors[task.status], 0.12),
                color: statusColors[task.status],
                border: `1px solid ${alpha(statusColors[task.status], 0.3)}`,
                "& .MuiChip-label": { px: 2 },
              }}
            />
            <Chip
              label={priorityConfig.label}
              size="medium"
              sx={{
                height: 32,
                fontSize: 13,
                fontWeight: 600,
                bgcolor: alpha(priorityConfig.color, 0.12),
                color: priorityConfig.color,
                border: `1px solid ${alpha(priorityConfig.color, 0.3)}`,
                "& .MuiChip-label": { px: 2 },
              }}
            />
          </Box>
        </Box>
      </Box>

      <Divider sx={{ borderColor: theme.palette.grey[200] }} />

      {/* Description Section */}
      <Card
        elevation={0}
        sx={{
          bgcolor: alpha(theme.palette.primary.main, 0.02),
          border: `1px solid ${theme.palette.grey[200]}`,
          borderRadius: 2.5,
        }}
      >
        <Box sx={{ p: { xs: 2, sm: 2.5 } }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1.5,
            }}
          >
            <FileText size={18} color={theme.palette.text.secondary} />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                fontSize: 15,
                color: theme.palette.text.primary,
              }}
            >
              Description
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontSize: 14,
              color: theme.palette.text.primary,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {task.description || "Aucune description fournie"}
          </Typography>
        </Box>
      </Card>

      {/* Details Grid */}
      <Box>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            fontSize: 15,
            color: theme.palette.text.primary,
            mb: 2,
          }}
        >
          Détails de la tâche
        </Typography>
        <Grid container spacing={2}>
          {/* Client(s) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                bgcolor: "white",
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Building2 size={16} color={theme.palette.primary.main} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Client(s)
                  </Typography>
                </Box>
                {task.taskClients && task.taskClients.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                    {task.taskClients.map((tc, index) => (
                      <Chip
                        key={index}
                        label={
                          tc.client.company?.name ||
                          `${tc.client.firstName || ""} ${tc.client.lastName || ""}`.trim() ||
                          tc.client.email
                        }
                        size="small"
                        sx={{
                          height: 28,
                          fontSize: 13,
                          fontWeight: 500,
                          bgcolor: alpha(theme.palette.primary.main, 0.08),
                          color: theme.palette.primary.main,
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                          "& .MuiChip-label": { px: 1.5 },
                        }}
                      />
                    ))}
                  </Box>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      fontSize: 14,
                      color: theme.palette.text.disabled,
                      fontStyle: "italic",
                    }}
                  >
                    Aucun client assigné
                  </Typography>
                )}
              </Box>
            </Card>
          </Grid>

          {/* Date d'échéance */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                bgcolor: "white",
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Calendar size={16} color={theme.palette.primary.main} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Date d&apos;échéance
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: task.dueDate
                      ? theme.palette.text.primary
                      : theme.palette.text.disabled,
                  }}
                >
                  {task.dueDate
                    ? format(new Date(task.dueDate), "dd/MM/yyyy 'à' HH:mm")
                    : "Non définie"}
                </Typography>
              </Box>
            </Card>
          </Grid>

          {/* Assigné à */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                bgcolor: "white",
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <User size={16} color={theme.palette.primary.main} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Assigné à
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Avatar
                    alt={task.assignee.username}
                    sx={{
                      width: 42,
                      height: 42,
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.common.white,
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {task.assignee.firstName
                      ? `${task.assignee.firstName.charAt(0)}${task.assignee.lastName?.charAt(0) || ""}`
                      : task.assignee.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Box>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      sx={{ fontSize: 14, lineHeight: 1.4 }}
                    >
                      {task.assignee.firstName && task.assignee.lastName
                        ? `${task.assignee.firstName} ${task.assignee.lastName}`
                        : task.assignee.username}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: 12 }}
                    >
                      {task.assignee.email}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Card>
          </Grid>

          {/* Créé par */}
          <Grid size={{ xs: 12, md: 6 }}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                bgcolor: "white",
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: 2,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  boxShadow: `0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              }}
            >
              <Box sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    mb: 1.5,
                  }}
                >
                  <Users size={16} color={theme.palette.primary.main} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: theme.palette.text.secondary,
                      textTransform: "uppercase",
                      letterSpacing: 0.5,
                    }}
                  >
                    Créé par
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: theme.palette.text.primary,
                  }}
                >
                  {task.createdBy.firstName && task.createdBy.lastName
                    ? `${task.createdBy.firstName} ${task.createdBy.lastName}`
                    : task.createdBy.username}
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
