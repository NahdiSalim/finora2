import { Box, Grid, TextField, Typography } from "@mui/material";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Download, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder } from "src/components/common/folder";
import { PageHeader } from "src/layouts/components/page-header";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FolderItem {
  id: number;
  name: string;
  description: string;
  state: "hasFiles" | "archived" | "empty";
  fileCount?: number;
}

// ─── Sortable Folder Wrapper ──────────────────────────────────────────────────

interface SortableFolderProps {
  folder: FolderItem;
  isDragging?: boolean;
}

function SortableFolder({ folder, isDragging }: SortableFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: folder.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
    cursor: "grab",
    outline: "none",
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        borderRadius: 2,
        "&:active": { cursor: "grabbing" },
        // Highlight border while dragging
        ...(isSortableDragging && {
          border: "2px dashed",
          borderColor: "primary.main",
          borderRadius: 2,
        }),
      }}
    >
      <Folder
        name={folder.name}
        description={folder.description}
        state={folder.state}
        fileCount={folder.fileCount}
        onClick={() => console.log(`Open ${folder.name}`)}
        onMenuAction={(action) => console.log(`${action} ${folder.name}`)}
      />
    </Box>
  );
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function DocumentDetailsView() {
  const [searchValue, setSearchValue] = useState("");
  const navigate = useNavigate();

  const [folders, setFolders] = useState<FolderItem[]>([
    {
      id: 1,
      name: "Contracts",
      description: "Legal documents",
      state: "hasFiles",
      fileCount: 15,
    },
    {
      id: 2,
      name: "Invoices",
      description: "2024 invoices",
      state: "hasFiles",
      fileCount: 8,
    },
    {
      id: 3,
      name: "Archive",
      description: "Old projects",
      state: "archived",
      fileCount: 23,
    },
    { id: 4, name: "New Folder", description: "Empty", state: "empty" },
  ]);

  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Require the mouse to move 8px before activating drag
      // This prevents accidental drags when clicking
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const actions = [
    {
      label: "Add Document",
      icon: <Plus size={18} />,
      onClick: () => console.log("Add document"),
      variant: "contained" as const,
      color: "primary" as const,
    },
    {
      label: "Export",
      icon: <Download size={18} />,
      onClick: () => console.log("Export"),
      variant: "outlined" as const,
      color: "primary" as const,
    },
  ];

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as number);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setFolders((items) => {
        const oldIndex = items.findIndex((f) => f.id === active.id);
        const newIndex = items.findIndex((f) => f.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const activeFolder = folders.find((f) => f.id === activeId);

  return (
    <PageHeader
      title="Digital Identity"
      breadcrumbs={[
        { label: "Shared Files", path: "/documents" },
        { label: "DIGID" },
      ]}
      documentsProcessed={{ processed: 10, total: 15 }}
      actions={actions}
    >
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          overflow: "hidden",
          p: 2,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Typography>Dossiers</Typography>
          <TextField
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search folders..."
            size="small"
          />
        </Box>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={folders.map((f) => f.id)}
            strategy={rectSortingStrategy}
          >
            <Grid container spacing={3}>
              {folders.map((folder) => (
                <Grid key={folder.id}>
                  <SortableFolder folder={folder} />
                </Grid>
              ))}
            </Grid>
          </SortableContext>

          {/* DragOverlay renders a floating "ghost" while dragging */}
          <DragOverlay>
            {activeFolder ? (
              <Box
                sx={{
                  opacity: 0.9,
                  pointerEvents: "none",
                  transform: "scale(1.03)",
                }}
              >
                <Folder
                  name={activeFolder.name}
                  description={activeFolder.description}
                  state={activeFolder.state}
                  fileCount={activeFolder.fileCount}
                  onClick={() => {}}
                  onMenuAction={() => {}}
                />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>
      </Box>
    </PageHeader>
  );
}
