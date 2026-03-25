import { Box } from "@mui/material";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useState, useEffect } from "react";
import { BoardColumn } from "./board-column";
import { TaskCard } from "./task-card";
import {
  useUpdateTaskMutation,
  useArchiveTaskMutation,
  useReorderTasksMutation,
} from "src/lib/services/tasksApi";
import type { KanbanColumn, Task } from "./types";

interface KanbanBoardProps {
  columns: KanbanColumn[];
  onAddTask?: (columnId: KanbanColumn["id"]) => void;
  isCollaboratorView?: boolean;
  isAccountant?: boolean;
}

export function KanbanBoard({
  columns,
  onAddTask,
  isCollaboratorView = false,
  isAccountant = false,
}: KanbanBoardProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [localColumns, setLocalColumns] = useState<KanbanColumn[]>(columns);
  const [updateTask] = useUpdateTaskMutation();
  const [archiveTask] = useArchiveTaskMutation();
  const [reorderTasks] = useReorderTasksMutation();

  const STORAGE_KEY = `kanban-order-${isCollaboratorView ? "collaborator" : "accountant"}`;

  const saveTaskOrderToLocalStorage = (columnsToSave: KanbanColumn[]) => {
    try {
      const orderMap: Record<string, number[]> = {};
      columnsToSave.forEach((col) => {
        orderMap[col.id] = col.tasks.map((t) => t.id);
      });
      console.log(
        "💾 Saving task order to localStorage:",
        STORAGE_KEY,
        orderMap,
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(orderMap));
    } catch (error) {
      console.error("Failed to save task order to localStorage:", error);
    }
  };

  const getColumnOrderOffset = (columnId: string): number => {
    const offsets: Record<string, number> = {
      todo: 0,
      in_progress: 1000,
      in_review: 2000,
      completed: 3000,
    };
    return offsets[columnId] || 0;
  };

  const saveTaskOrderToBackend = async (
    columnId: string,
    tasks: Task[],
  ): Promise<void> => {
    try {
      const columnOffset = getColumnOrderOffset(columnId);
      const reorderedTasks = tasks.map((task, index) => ({
        id: task.id,
        order: columnOffset + index,
      }));

      console.log(
        `🌐 Saving task order to backend for column ${columnId}:`,
        reorderedTasks,
      );

      await reorderTasks({
        tasks: reorderedTasks,
        status: columnId,
      }).unwrap();

      console.log("✅ Backend order saved successfully");
    } catch (error) {
      console.error("❌ Failed to save task order to backend:", error);
      throw error;
    }
  };

  useEffect(() => {
    console.log(
      "🔵 Setting columns from backend with order field:",
      columns.map((col) => ({
        id: col.id,
        taskIds: col.tasks.map((t) => t.id),
        orders: col.tasks.map((t) => t.order),
      })),
    );
    setLocalColumns(columns);
  }, [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const taskId = active.id as number;

    const task = localColumns
      .flatMap((col) => col.tasks)
      .find((t) => t.id === taskId);

    if (task) {
      setActiveTask(task);
      setActiveId(taskId);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    setActiveId(null);

    if (!over) return;

    const taskId = active.id as number;
    const overId = over.id;

    const sourceColumn = localColumns.find((col) =>
      col.tasks.some((t) => t.id === taskId),
    );

    if (!sourceColumn) return;

    const task = sourceColumn.tasks.find((t) => t.id === taskId);
    if (!task) return;

    let targetColumn: KanbanColumn | undefined;

    if (
      typeof overId === "string" &&
      ["todo", "in_progress", "in_review", "completed"].includes(overId)
    ) {
      targetColumn = localColumns.find((col) => col.id === overId);
    } else {
      targetColumn = localColumns.find((col) =>
        col.tasks.some((t) => t.id === overId),
      );
    }

    if (!targetColumn) return;

    if (sourceColumn.id === targetColumn.id) {
      const oldIndex = sourceColumn.tasks.findIndex((t) => t.id === taskId);
      let newIndex: number;

      if (typeof overId === "string") {
        newIndex = sourceColumn.tasks.length;
      } else {
        newIndex = sourceColumn.tasks.findIndex((t) => t.id === overId);
      }

      if (oldIndex !== newIndex) {
        const newTasks = arrayMove(sourceColumn.tasks, oldIndex, newIndex);

        const updatedColumns = localColumns.map((col) => {
          if (col.id === sourceColumn.id) {
            return { ...col, tasks: newTasks };
          }
          return col;
        });

        setLocalColumns(updatedColumns);
        saveTaskOrderToLocalStorage(updatedColumns);

        try {
          await saveTaskOrderToBackend(sourceColumn.id, newTasks);
        } catch (error) {
          console.error("Failed to persist order, reverting:", error);
          setLocalColumns(localColumns);
        }
      }
    } else {
      const updatedColumns = localColumns.map((col) => {
        if (col.id === sourceColumn.id) {
          return { ...col, tasks: col.tasks.filter((t) => t.id !== taskId) };
        }
        if (col.id === targetColumn.id) {
          return {
            ...col,
            tasks: [...col.tasks, { ...task, status: targetColumn.id }],
          };
        }
        return col;
      });

      setLocalColumns(updatedColumns);
      saveTaskOrderToLocalStorage(updatedColumns);

      const newStatus = targetColumn.id;
      const formData = new FormData();
      formData.append("status", newStatus);

      try {
        await updateTask({ id: taskId, data: formData }).unwrap();

        // Update order for both source and target columns
        const sourceCol = updatedColumns.find(
          (col) => col.id === sourceColumn.id,
        );
        const targetCol = updatedColumns.find(
          (col) => col.id === targetColumn.id,
        );

        if (sourceCol && sourceCol.tasks.length > 0) {
          await saveTaskOrderToBackend(sourceColumn.id, sourceCol.tasks);
        }
        if (targetCol) {
          await saveTaskOrderToBackend(targetColumn.id, targetCol.tasks);
        }
      } catch (error) {
        console.error("Failed to update task status:", error);
        setLocalColumns(localColumns);
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeTaskId = active.id as number;
    const overId = over.id;

    const activeColumn = localColumns.find((col) =>
      col.tasks.some((t) => t.id === activeTaskId),
    );

    let overColumn: KanbanColumn | undefined;

    if (
      typeof overId === "string" &&
      ["todo", "in_progress", "in_review", "completed"].includes(overId)
    ) {
      overColumn = localColumns.find((col) => col.id === overId);
    } else {
      overColumn = localColumns.find((col) =>
        col.tasks.some((t) => t.id === overId),
      );
    }

    if (!activeColumn || !overColumn) return;

    if (activeColumn.id === overColumn.id) {
      const oldIndex = activeColumn.tasks.findIndex(
        (t) => t.id === activeTaskId,
      );
      let newIndex: number;

      if (typeof overId === "string") {
        return;
      } else {
        newIndex = activeColumn.tasks.findIndex((t) => t.id === overId);
      }

      if (oldIndex !== newIndex) {
        const updatedColumns = localColumns.map((col) => {
          if (col.id === activeColumn.id) {
            const newTasks = arrayMove(col.tasks, oldIndex, newIndex);
            return { ...col, tasks: newTasks };
          }
          return col;
        });
        setLocalColumns(updatedColumns);
      }
    }
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    setActiveId(null);
  };

  const handleSortByPriority = async (columnId: KanbanColumn["id"]) => {
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };

    const updatedColumns = localColumns.map((col) => {
      if (col.id === columnId) {
        const sortedTasks = [...col.tasks].sort((a, b) => {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        return { ...col, tasks: sortedTasks };
      }
      return col;
    });

    setLocalColumns(updatedColumns);
    saveTaskOrderToLocalStorage(updatedColumns);

    const targetCol = updatedColumns.find((col) => col.id === columnId);
    if (targetCol) {
      try {
        await saveTaskOrderToBackend(columnId, targetCol.tasks);
      } catch (error) {
        console.error("Failed to persist sorted order:", error);
      }
    }
  };

  const handleArchiveAll = async (columnId: KanbanColumn["id"]) => {
    if (columnId !== "completed") return;

    const completedColumn = localColumns.find((col) => col.id === "completed");
    if (!completedColumn || completedColumn.tasks.length === 0) return;

    try {
      await Promise.all(
        completedColumn.tasks.map((task) => archiveTask(task.id).unwrap()),
      );
    } catch (err) {
      console.error("Failed to archive all tasks:", err);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragCancel={handleDragCancel}
    >
      <Box
        sx={{
          display: "flex",
          gap: { xs: 1.5, sm: 2 },
          width: "100%",
          overflowX: { xs: "auto", lg: "hidden" },
          overflowY: "hidden",
          pb: 2,
          minHeight: { xs: "60vh", sm: "70vh" },
          "&::-webkit-scrollbar": {
            height: 8,
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: "rgba(0, 0, 0, 0.2)",
            borderRadius: 4,
          },
        }}
      >
        {localColumns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            onAddTask={isCollaboratorView ? undefined : onAddTask}
            onSortByPriority={handleSortByPriority}
            onArchiveAll={handleArchiveAll}
            isAccountant={isAccountant}
          />
        ))}
      </Box>

      <DragOverlay>
        {activeTask ? (
          <Box sx={{ cursor: "grabbing", transform: "rotate(3deg)" }}>
            <TaskCard task={activeTask} isDragging />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
