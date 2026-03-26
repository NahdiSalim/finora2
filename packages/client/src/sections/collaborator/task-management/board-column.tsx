import {
  Box,
  Typography,
  IconButton,
  Chip,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import { ArrowUpDown, Archive } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { TaskCard } from "./task-card";
import type { KanbanColumn } from "./types";
import { useRef, useCallback, useEffect } from "react";

interface BoardColumnProps {
  column: KanbanColumn;
  onAddTask?: (columnId: KanbanColumn["id"]) => void;
  onSortByPriority?: (columnId: KanbanColumn["id"]) => void;
  onArchiveAll?: (columnId: KanbanColumn["id"]) => void;
  onLoadMore?: (columnId: KanbanColumn["id"]) => void;
  isAccountant?: boolean;
}

export function BoardColumn({
  column,
  onAddTask,
  onSortByPriority,
  onArchiveAll,
  onLoadMore,
  isAccountant = false,
}: BoardColumnProps) {
  const theme = useTheme();
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const taskIds = column.tasks.map((task) => task.id);

  const handleScroll = useCallback(() => {
    if (
      !scrollContainerRef.current ||
      !column.hasMore ||
      column.isLoading ||
      !onLoadMore
    )
      return;

    const { scrollTop, scrollHeight, clientHeight } =
      scrollContainerRef.current;
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 50;

    if (scrolledToBottom) {
      onLoadMore(column.id);
    }
  }, [column.hasMore, column.isLoading, column.id, onLoadMore]);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll);
      return () => scrollContainer.removeEventListener("scroll", handleScroll);
    }
    return undefined;
  }, [handleScroll]);

  const handleSortByPriority = () => {
    if (onSortByPriority) {
      onSortByPriority(column.id);
    }
  };

  const handleArchiveAll = () => {
    if (onArchiveAll) {
      onArchiveAll(column.id);
    }
  };

  return (
    <Box
      sx={{
        flex: { xs: "0 0 280px", sm: "0 0 300px", lg: "1 1 0%" },
        minWidth: { xs: 280, sm: 300, lg: 0 },
        maxWidth: { xs: "none", sm: "none", lg: "none" },
        width: { xs: "280px", sm: "300px", lg: "100%" },
        display: "flex",
        flexDirection: "column",
        bgcolor: isOver ? alpha(column.color, 0.08) : theme.palette.grey[50],
        borderRadius: 2,
        p: { xs: 1.5, sm: 2 },
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
          mb: { xs: 1.5, sm: 2 },
          pb: { xs: 1.5, sm: 2 },
          borderBottom: `2px solid ${column.color}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 1.5 },
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Colored Dot */}
          <Box
            sx={{
              width: 8,
              height: 8,
              borderRadius: "50%",
              bgcolor: column.color,
              flexShrink: 0,
            }}
          />
          {/* Column Title */}
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: { xs: 14, sm: 16 },
              color: theme.palette.text.primary,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {column.title}
          </Typography>
          {/* Task Count Badge */}
          <Chip
            label={column.totalTasks || column.tasks.length}
            size="small"
            sx={{
              height: { xs: 20, sm: 24 },
              fontSize: { xs: 11, sm: 12 },
              fontWeight: 500,
              bgcolor: theme.palette.grey[200],
              color: theme.palette.text.secondary,
              flexShrink: 0,
              "& .MuiChip-label": {
                px: { xs: 0.75, sm: 1 },
              },
            }}
          />
        </Box>
        {/* Action Buttons */}
        <Box sx={{ display: "flex", gap: { xs: 0.5, sm: 1 }, flexShrink: 0 }}>
          {/* Sort By Priority Button */}
          <IconButton
            size="small"
            onClick={handleSortByPriority}
            sx={{
              width: { xs: 26, sm: 28 },
              height: { xs: 26, sm: 28 },
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
          {/* Archive All Button - Only for completed column and accountants */}
          {column.id === "completed" &&
            isAccountant &&
            column.tasks.length > 0 && (
              <IconButton
                size="small"
                onClick={handleArchiveAll}
                sx={{
                  width: { xs: 26, sm: 28 },
                  height: { xs: 26, sm: 28 },
                  color: "#64748B",
                  bgcolor: alpha("#64748B", 0.1),
                  borderRadius: 1.5,
                  "&:hover": {
                    bgcolor: alpha("#64748B", 0.15),
                  },
                }}
              >
                <Archive size={16} />
              </IconButton>
            )}
        </Box>
      </Box>

      {/* Tasks List - Droppable */}
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <Box
          ref={(node: HTMLDivElement | null) => {
            setNodeRef(node);
            scrollContainerRef.current = node;
          }}
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
            "&::-webkit-scrollbar": {
              width: 6,
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: alpha(column.color, 0.3),
              borderRadius: 3,
            },
          }}
        >
          {column.tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isAccountant={isAccountant}
              columnId={column.id}
            />
          ))}

          {column.isLoading && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 2,
              }}
            >
              <CircularProgress size={24} sx={{ color: column.color }} />
            </Box>
          )}

          {column.tasks.length === 0 && !column.isLoading && (
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
