import { Box } from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState } from "react";
import type { FileItem } from "src/components/common/File";
import { FileCard } from "src/components/common/File";
import { useDownloadDocumentMutation } from "src/lib/services/documentsApi";

/** Préfixe des ids sortable pour les fichiers (pour distinguer file vs folder dans handleDragEnd). */
export const FILE_PREFIX = "file-";

export interface SortableFileCardProps {
  file: FileItem;
  selectable: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onMenuAction: (action: string, file: FileItem) => void;
  previewContentUrl?: string | null;
  menuOptions?: { label: string; icon: React.ReactNode; action: string }[];
}

/** Carte document draggable (useSortable). */
export function SortableFileCard({
  file,
  selectable,
  selected,
  onSelect,
  onMenuAction,
  previewContentUrl,
  menuOptions,
}: SortableFileCardProps) {
  const id = `${FILE_PREFIX}${file.id}`;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: "file" as const, fileId: file.id },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <FileCard
        file={file}
        previewContentUrl={previewContentUrl}
        selectable={selectable}
        selected={selected}
        onSelect={onSelect}
        onMenuAction={onMenuAction}
        menuOptions={menuOptions}
      />
    </Box>
  );
}

/** Charge l’aperçu du document (PDF/image) et l’affiche sur la carte. */
export function FileCardWithPreview(props: SortableFileCardProps) {
  const { file } = props;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadDocument] = useDownloadDocumentMutation();
  const isPdf = file.type === "pdf";
  const isImage =
    file.type === "jpg" ||
    file.type === "png" ||
    (file.mimeType && file.mimeType.toLowerCase().startsWith("image/"));
  const canPreview = isPdf || isImage;

  useEffect(() => {
    if (!canPreview || file.id == null) return undefined;
    let revoked = false;
    downloadDocument(Number(file.id))
      .unwrap()
      .then(({ blob }) => {
        if (!revoked) setPreviewUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!revoked) setPreviewUrl(null);
      });
    return () => {
      revoked = true;
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when file id/type/mime change
  }, [file.id, file.type, file.mimeType, canPreview]);

  return <SortableFileCard {...props} previewContentUrl={previewUrl} />;
}
