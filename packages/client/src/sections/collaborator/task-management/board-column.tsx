import {
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
  alpha,
} from "@mui/material";
import { ArrowUpDown } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./task-card";
import type { KanbanColumn } from "./types";

interface BoardColumnProps {
  column: KanbanColumn;
  onAddTask?: (columnId: KanbanColumn["id"]) => void;
  onSortByPriority?: (columnId: KanbanColumn["id"]) => void;
}

export function BoardColumn({
  column,
  onAddTask,
  onSortByPriority,
}: BoardColumnProps) {
  const theme = useTheme();
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const taskIds = column.tasks.map((task) => task.id);

  const handleSortByPriority = () => {
    if (onSortByPriority) {
      onSortByPriority(column.id);
    }
  };

  return (
    <Box
      sx={{
        flex: { xs: "0 0 280px", sm: "1 1 0%" },
        minWidth: { xs: 280, sm: 0 },
        maxWidth: { xs: "none", sm: "none" },
        width: { xs: "280px", sm: "100%" },
        display: "flex",
        flexDirection: "column",
        bgcolor: isOver ? alpha(column.color, 0.08) : theme.palette.grey[50],
        borderRadius: 2,
        p: 2,
        border: isOver ? `2px solid ${column.color}` : `2px solid transparent`,
        transition: "all 0.2s ease",
      }}
    >
      {/* Column Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
          pb: 2,
          borderBottom: `2px solid ${column.color}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flex: 1 }}>
          {/* Colored Dot */}
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: column.color,
            }}
          />
          {/* Column Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: 16,
              color: theme.palette.text.primary,
            }}
          >
            {column.title}
          </Typography>
          {/* Task Count Badge */}
          <Chip
            label={column.tasks.length}
            size="small"
            sx={{
              height: 24,
              fontSize: 12,
              fontWeight: 500,
              bgcolor: theme.palette.grey[200],
              color: theme.palette.text.secondary,
              "& .MuiChip-label": {
                px: 1,
              },
            }}
          />
        </Box>
        {/* Sort By Priority Button */}
        <IconButton
          size="small"
          onClick={handleSortByPriority}
          sx={{
            width: 28,
            height: 28,
            color: column.color,
            bgcolor: alpha(column.color, 0.1),
            borderRadius: 1.5,
            "&:hover": {
              bgcolor: alpha(column.color, 0.15),
            },
          }}
        >
          <ArrowUpDown size={16} />
        </IconButton>
      </Box>

      {/* Tasks List - Droppable */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <Box
          ref={setNodeRef}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: 1,
            overflowY: "auto",
            maxHeight: "calc(100vh - 300px)",
            minHeight: 200,
            p: 1,
            borderRadius: 1,
            bgcolor: "transparent",
          }}
        >
          {column.tasks.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
          {column.tasks.length === 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                minHeight: 100,
                color: theme.palette.text.disabled,
                fontSize: 14,
              }}
            >
              Aucune tâche
            </Box>
          )}
        </Box>
      </SortableContext>
    </Box>
  );
}
