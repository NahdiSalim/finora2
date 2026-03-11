import { Box } from "@mui/material";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Folder } from "src/components/common/folder";
import { useGetDocumentsQuery } from "src/lib/services/documentsApi";
import type { FolderItem } from "./document-details-types";

/** Préfixe des droppables pour déposer un document dans un dossier (évite conflit avec sortable). */
export const FOLDER_DROP_PREFIX = "drop-folder-";

export interface SortableDroppableFolderProps {
  folder: FolderItem;
  onOpen: () => void;
  onMenuAction: (action: string) => void;
  /** Client company ID when accountant consulte l'espace d'un client */
  clientCompanyId?: number;
}

function SortableDroppableFolderInner({
  folder,
  onOpen,
  onMenuAction,
}: Omit<SortableDroppableFolderProps, "clientCompanyId">) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: folder.id });
  const { isOver, setNodeRef: setFileDropRef } = useDroppable({
    id: `${FOLDER_DROP_PREFIX}${folder.id}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setSortableRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        borderRadius: 2,
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        opacity: isSortableDragging ? 0.4 : 1,
        ...(isSortableDragging && {
          border: "2px dashed",
          borderColor: "primary.main",
        }),
      }}
    >
      <Box
        ref={setFileDropRef}
        sx={{
          height: "100%",
          minHeight: 80,
          borderRadius: 2,
          ...(isOver &&
            !isSortableDragging && {
              border: "2px dashed",
              borderColor: "primary.main",
              bgcolor: "action.hover",
            }),
        }}
      >
        <Folder
          name={folder.name}
          description={folder.description}
          state={folder.state}
          fileCount={folder.fileCount ?? 0}
          updatedAt={folder.updatedAt}
          onClick={onOpen}
          onMenuAction={onMenuAction}
        />
      </Box>
    </Box>
  );
}

/** Folder with child count (fetches count from API so "hasFiles" is correct). */
export function FolderWithCount({
  folder,
  onOpen,
  onMenuAction,
  clientCompanyId,
}: SortableDroppableFolderProps) {
  const { data } = useGetDocumentsQuery(
    {
      clientId: clientCompanyId,
      parentId: folder.id,
      limit: 500,
      status: "active",
    },
    { skip: folder.id == null },
  );
  const fileCount = data?.data?.filter((d) => d.type !== "folder").length ?? 0;
  const folderWithCount: FolderItem = {
    ...folder,
    fileCount,
    state: fileCount > 0 ? "hasFiles" : "empty",
  };
  return (
    <SortableDroppableFolderInner
      folder={folderWithCount}
      onOpen={onOpen}
      onMenuAction={onMenuAction}
    />
  );
}
