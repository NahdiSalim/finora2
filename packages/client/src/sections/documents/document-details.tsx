import { Box, Grid, Typography, useTheme } from "@mui/material";
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
import { Download, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Folder } from "src/components/common/folder";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import type { FileItem } from "src/components/common/File";
import { FileCard } from "src/components/common/File";
import CustomButton from "src/components/common/CustomButton";

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
}

function SortableFolder({ folder }: SortableFolderProps) {
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
        ...(isSortableDragging && {
          border: "2px dashed",
          borderColor: "primary.main",
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

// ─── Static file data (outside component to avoid re-creation on render) ─────

const files: FileItem[] = [
  { id: 1, name: "Document.pdf", type: "pdf", size: "1.2 MB" },
  { id: 2, name: "Spreadsheet.xls", type: "xls", size: "856 KB" },
  { id: 3, name: "Image.jpg", type: "jpg", size: "3.2 MB" },
];

// ─── Main View ────────────────────────────────────────────────────────────────

export default function DocumentDetailsView() {
  const [searchValue, setSearchValue] = useState("");
  const theme = useTheme();

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
  const [selectedFiles, setSelectedFiles] = useState<(string | number)[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
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

  const handleSelect = (fileId: string | number, selected: boolean) => {
    setSelectedFiles((prev) =>
      selected ? [...prev, fileId] : prev.filter((id) => id !== fileId),
    );
  };

  const handleSelectAll = () => {
    setSelectedFiles(
      selectedFiles.length === files.length ? [] : files.map((f) => f.id),
    );
  };

  const handleDeleteSelected = () => {
    console.log("Delete files:", selectedFiles);
    setSelectedFiles([]);
  };

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
        {/* ── Folders section ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Typography variant="h6" fontWeight={500}>
            Dossiers
          </Typography>
          <CustomInput
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Rechercher..."
            startIcon={<Search size={20} />}
            sx={{ width: 300 }}
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

        {/* ── Recent documents section ── */}
        <Box sx={{ my: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1.5,
            }}
          >
            <Typography variant="body1">Documents ajoutés récemment</Typography>
            <CustomInput
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Rechercher..."
              startIcon={<Search size={20} />}
              sx={{ width: 300 }}
            />
          </Box>

          <Box sx={{ p: 3 }}>
            {/* Selection toolbar */}
            {selectedFiles.length > 0 && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  mb: 2,
                  p: 1.5,
                  bgcolor: theme.palette.primary.light,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" color="primary.main">
                  {selectedFiles.length} selected
                </Typography>
                <Box sx={{ gap: 2 }}>
                  <CustomButton
                    variant="contained"
                    onClick={handleDeleteSelected}
                  >
                    Delete
                  </CustomButton>
                  <CustomButton variant="outlined" onClick={handleSelectAll}>
                    Select All
                  </CustomButton>
                </Box>
              </Box>
            )}

            {/* Files grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 2,
              }}
            >
              {files.map((file) => (
                <FileCard
                  key={file.id}
                  file={file}
                  selectable
                  selected={selectedFiles.includes(file.id)}
                  onSelect={(selected) => handleSelect(file.id, selected)}
                  onMenuAction={(action, fileItem) =>
                    console.log(action, fileItem)
                  }
                />
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </PageHeader>
  );
}
