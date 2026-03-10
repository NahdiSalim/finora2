import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus,
  Search,
  FolderPlus,
  FileText,
  File as FileIcon,
  X,
  Upload,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import { Folder } from "src/components/common/folder";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import type { FileItem, FileType } from "src/components/common/File";
import { FileCard } from "src/components/common/File";
import PdfIcon from "src/components/common/pdfIcon";
import ImageIcon from "src/components/common/imageIcon";
import XlsIcon from "src/components/common/xlsIcon";
import CustomButton from "src/components/common/CustomButton";
import { CreateFolderModal } from "./CreateFolderModal";
import { SuccessFolderModal } from "./SuccessFolderModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { RenameFolderModal } from "./RenameFolderModal";
import { ImportDocumentModal } from "./ImportDocumentModal";
import {
  useGetDocumentsQuery,
  useCreateFolderMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useUploadDocumentMutation,
  useDownloadDocumentMutation,
} from "src/lib/services/documentsApi";
import type { DocumentItem } from "src/lib/services/documentsApi";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FolderItem {
  id: number;
  name: string;
  description: string;
  state: "hasFiles" | "archived" | "empty";
  fileCount?: number;
  updatedAt?: string | null;
}

function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function docToFolderState(item: DocumentItem): FolderItem["state"] {
  if (item.status === "archived") return "archived";
  return "empty";
}

function docToFileType(
  type?: string | null,
  mimeType?: string | null,
): FileItem["type"] {
  const t = (type || mimeType || "").toLowerCase();
  if (t.includes("pdf")) return "pdf";
  if (t.includes("word") || t.includes("doc")) return "docx";
  if (t.includes("sheet") || t.includes("excel") || t.includes("xls"))
    return "xls";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("png")) return "png";
  return "other";
}

// ─── Folder with child count (fetches count from API so "hasFiles" is correct) ─

interface SortableDroppableFolderProps {
  folder: FolderItem;
  onOpen: () => void;
  onMenuAction: (action: string) => void;
}

function FolderWithCount({
  folder,
  onOpen,
  onMenuAction,
}: SortableDroppableFolderProps) {
  const { data } = useGetDocumentsQuery(
    { parentId: folder.id, limit: 500, status: "active" },
    { skip: folder.id == null },
  );
  const fileCount = data?.data?.filter((d) => d.type !== "folder").length ?? 0;
  const folderWithCount: FolderItem = {
    ...folder,
    fileCount,
    state: fileCount > 0 ? "hasFiles" : "empty",
  };
  return (
    <SortableDroppableFolder
      folder={folderWithCount}
      onOpen={onOpen}
      onMenuAction={onMenuAction}
    />
  );
}

// ─── Sortable + Droppable Folder (drag to reorder, drop files into) ───────────

function SortableDroppableFolder({
  folder,
  onOpen,
  onMenuAction,
}: SortableDroppableFolderProps) {
  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: folder.id });
  const { isOver, setNodeRef: setDroppableRef } = useDroppable({
    id: folder.id,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setSortableRef(node);
    setDroppableRef(node);
  };

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
        borderRadius: 2,
        cursor: "grab",
        "&:active": { cursor: "grabbing" },
        opacity: isSortableDragging ? 0.4 : 1,
        ...(isSortableDragging && {
          border: "2px dashed",
          borderColor: "primary.main",
        }),
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
  );
}

// ─── Document Preview Modal (aperçu du fichier comme dans la capture) ─────────

const previewFileTypeIcons: Record<FileType, React.ReactNode> = {
  pdf: <PdfIcon />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <XlsIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  other: <FileIcon size={24} color="#6B7280" />,
};

interface DocumentPreviewModalProps {
  open: boolean;
  onClose: () => void;
  documentId: number;
  fileName: string;
  fileType: FileType;
  onDownloadDocument: (id: number, displayName?: string) => void;
}

function DocumentPreviewModal({
  open,
  onClose,
  documentId,
  fileName,
  fileType,
  onDownloadDocument,
}: DocumentPreviewModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [downloadDocument] = useDownloadDocumentMutation();
  const theme = useTheme();

  useEffect(() => {
    if (!open || !documentId) {
      setBlobUrl(null);
      return undefined;
    }
    let revoked = false;
    downloadDocument(documentId)
      .unwrap()
      .then(({ blob }) => {
        if (!revoked) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        if (!revoked) setBlobUrl(null);
      });
    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when open/documentId change
  }, [open, documentId]);

  const canPreview =
    fileType === "pdf" || fileType === "jpg" || fileType === "png";

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: "hidden",
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: "1.125rem",
          py: 1,
          px: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Aperçu du document
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Box
          sx={{
            flex: 1,
            minHeight: 400,
            maxHeight: "90vh",
            bgcolor: "grey.100",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderBottom: `1px solid ${theme.palette.divider}`,
            overflow: "hidden",
          }}
        >
          {!blobUrl && (
            <Typography color="text.secondary">
              Chargement de l&apos;aperçu…
            </Typography>
          )}
          {blobUrl && fileType === "pdf" && (
            <iframe
              title={fileName}
              src={blobUrl}
              style={{
                width: "100%",
                height: "100%",
                border: "none",
                background: "white",
              }}
            />
          )}
          {blobUrl && (fileType === "jpg" || fileType === "png") && (
            <Box
              component="img"
              src={blobUrl}
              alt={fileName}
              sx={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
              }}
            />
          )}
          {blobUrl && !canPreview && (
            <Typography color="text.secondary">
              Aperçu non disponible pour ce type de fichier.
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            p: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            bgcolor: "background.paper",
          }}
        >
          <Box sx={{ flexShrink: 0 }}>{previewFileTypeIcons[fileType]}</Box>
          <Typography variant="body2" fontWeight={500} noWrap sx={{ flex: 1 }}>
            {fileName}
          </Typography>
          <CustomButton
            variant="outlined"
            size="small"
            onClick={() => onDownloadDocument(documentId, fileName)}
          >
            Télécharger
          </CustomButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ─── Draggable File ──────────────────────────────────────────────────────────

const FILE_PREFIX = "file-";

interface DraggableFileCardProps {
  file: FileItem;
  selectable: boolean;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onMenuAction: (action: string, file: FileItem) => void;
  previewContentUrl?: string | null;
}

function DraggableFileCard({
  file,
  selectable,
  selected,
  onSelect,
  onMenuAction,
  previewContentUrl,
}: DraggableFileCardProps) {
  const id = `${FILE_PREFIX}${file.id}`;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { type: "file" as const, fileId: file.id },
  });

  return (
    <Box
      ref={setNodeRef}
      {...listeners}
      {...attributes}
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
      />
    </Box>
  );
}

/** Charge l’aperçu du document (PDF/image) et l’affiche sur la carte comme dans le Figma. */
function FileCardWithPreview(props: DraggableFileCardProps) {
  const { file } = props;
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadDocument] = useDownloadDocumentMutation();
  const canPreview =
    file.type === "pdf" || file.type === "jpg" || file.type === "png";

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only refetch when file id/type change
  }, [file.id, file.type, canPreview]);

  return <DraggableFileCard {...props} previewContentUrl={previewUrl} />;
}

// ─── Main View ────────────────────────────────────────────────────────────────

export default function DocumentDetailsView() {
  const { clientId } = useParams<{ clientId?: string }>();
  const location = useLocation();
  const state = location.state as {
    clientName?: string;
    invoiceStats?: { traite: number; pending: number; total: number };
  } | null;
  const clientName = state?.clientName;
  const invoiceStats = state?.invoiceStats ?? {
    traite: 0,
    pending: 0,
    total: 0,
  };
  /** Mode "mon espace" : pas de clientId (client voit ses docs directement). */
  const isMySpace = clientId == null || clientId === "";
  const [searchValue, setSearchValue] = useState("");
  const [parentId, setParentId] = useState<number | null>(null);
  /** Chemin des dossiers (arborescence) pour le fil d'Ariane */
  const [folderPath, setFolderPath] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [renameFile, setRenameFile] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [previewFile, setPreviewFile] = useState<{
    id: number;
    name: string;
    type: FileType;
  } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: "folder"; id: number; name: string }
    | { type: "file"; id: number; name: string }
    | { type: "files"; ids: number[] }
    | null
  >(null);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<(string | number)[]>([]);
  const theme = useTheme();

  const { data, isLoading, isError, refetch } = useGetDocumentsQuery({
    parentId: parentId ?? undefined,
    limit: 100,
    status: "active",
  });
  const [createFolder, { isLoading: isCreating }] = useCreateFolderMutation();
  const [updateDocument, { isLoading: isUpdating }] =
    useUpdateDocumentMutation();
  const [deleteDocument, { isLoading: isDeleting }] =
    useDeleteDocumentMutation();
  const [uploadDocument, { isLoading: isUploading }] =
    useUploadDocumentMutation();
  const [downloadDocument, { isLoading: isDownloading }] =
    useDownloadDocumentMutation();

  const rawItems: DocumentItem[] = data?.data ?? [];
  const foldersFromApi: FolderItem[] = rawItems
    .filter((d) => d.isFolder)
    .map((d) => ({
      id: d.id,
      name: d.name,
      description: "",
      state: docToFolderState(d),
      fileCount: 0,
      updatedAt: d.updatedAt ?? null,
    }));

  const folders: FolderItem[] = foldersFromApi;

  const fileItems: FileItem[] = rawItems
    .filter((d) => !d.isFolder)
    .map((d) => ({
      id: d.id,
      name: d.name,
      type: docToFileType(d.type, d.mimeType),
      size: formatSize(d.size),
    }));

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const actions = [
    {
      label: "Nouveau dossier",
      icon: <FolderPlus size={18} />,
      onClick: () => setCreateModalOpen(true),
      variant: "outlined" as const,
      color: "primary" as const,
    },
    {
      label: "Nouveau document",
      icon: <Plus size={18} />,
      onClick: () => setImportModalOpen(true),
      variant: "contained" as const,
      color: "primary" as const,
    },
  ];

  const handleCreateFolder = async (name: string) => {
    await createFolder({ name, parentId: parentId ?? undefined }).unwrap();
    setSuccessModalOpen(true);
  };

  const handleImportDocument = async (payload: {
    file: File;
    documentName?: string;
    category?: string;
    parentId?: number | null;
  }) => {
    await uploadDocument({
      file: payload.file,
      parentId: payload.parentId ?? undefined,
      category: payload.category,
    }).unwrap();
    if (payload.documentName && payload.documentName !== payload.file.name) {
      // Optional: rename after upload when backend supports it or we get doc id from response
      // For now the server uses file.originalname; skip rename.
    }
  };

  const handleRenameFolder = async (newName: string) => {
    if (!renameFolder) return;
    await updateDocument({
      id: renameFolder.id,
      dto: { name: newName },
    }).unwrap();
    setFolderPath((prev) =>
      prev.map((step) =>
        step.id === renameFolder.id ? { ...step, name: newName } : step,
      ),
    );
    setRenameFolder(null);
  };

  const handleRenameFile = async (newName: string) => {
    if (!renameFile) return;
    await updateDocument({
      id: renameFile.id,
      dto: { name: newName },
    }).unwrap();
    setRenameFile(null);
  };

  const handleDownloadFile = async (
    documentId: number,
    displayName?: string,
  ) => {
    try {
      const { blob, filename } = await downloadDocument(documentId).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = displayName ?? filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // Error handled by mutation
    }
  };

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id;
    const idStr = String(id);
    if (idStr.startsWith(FILE_PREFIX)) {
      setActiveFileId(idStr);
      setActiveFolderId(null);
    } else if (typeof id === "number" && folders.some((f) => f.id === id)) {
      setActiveFolderId(id);
      setActiveFileId(null);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveFileId(null);
    setActiveFolderId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    if (activeIdStr.startsWith(FILE_PREFIX) && typeof over.id === "number") {
      const fileId = Number(activeIdStr.slice(FILE_PREFIX.length));
      if (!Number.isNaN(fileId) && over.id !== fileId) {
        updateDocument({ id: fileId, dto: { parentId: over.id } });
      }
      return;
    }
    if (typeof active.id === "number" && typeof over.id === "number") {
      const folderId = active.id as number;
      const newParentId = over.id as number;
      if (folderId !== newParentId) {
        updateDocument({ id: folderId, dto: { parentId: newParentId } });
      }
    }
  }

  const handleSelect = (fileId: string | number, selected: boolean) => {
    setSelectedFiles((prev) =>
      selected ? [...prev, fileId] : prev.filter((id) => id !== fileId),
    );
  };

  const handleSelectAll = () => {
    setSelectedFiles(
      selectedFiles.length === fileItems.length
        ? []
        : fileItems.map((f) => f.id),
    );
  };

  const handleDeleteSelected = () => {
    const ids = selectedFiles
      .map((s) => Number(s))
      .filter((id) => !Number.isNaN(id));
    if (ids.length > 0) setDeleteConfirm({ type: "files", ids });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "folder") {
        await deleteDocument(deleteConfirm.id).unwrap();
        if (parentId === deleteConfirm.id) {
          const newPath = folderPath.slice(0, -1);
          setFolderPath(newPath);
          setParentId(
            newPath.length === 0 ? null : newPath[newPath.length - 1].id,
          );
        } else {
          const index = folderPath.findIndex((p) => p.id === deleteConfirm.id);
          if (index !== -1) {
            const newPath = folderPath.slice(0, index);
            setFolderPath(newPath);
            setParentId(
              newPath.length === 0 ? null : newPath[newPath.length - 1].id,
            );
          }
        }
      } else if (deleteConfirm.type === "file") {
        await deleteDocument(deleteConfirm.id).unwrap();
      } else if (deleteConfirm.type === "files") {
        for (const id of deleteConfirm.ids) {
          await deleteDocument(id).unwrap();
        }
        setSelectedFiles([]);
      }
    } catch {
      // Error handled by mutation
    }
    setDeleteConfirm(null);
  };

  const activeFile = activeFileId
    ? fileItems.find((f) => `${FILE_PREFIX}${f.id}` === activeFileId)
    : null;
  const activeFolder = activeFolderId
    ? folders.find((f) => f.id === activeFolderId)
    : null;

  return (
    <PageHeader
      title={
        isMySpace
          ? "Mon espace"
          : clientName ||
            (clientId ? `Documents client #${clientId}` : "Documents client")
      }
      backButton={
        parentId != null
          ? () => {
              const newPath = folderPath.slice(0, -1);
              setFolderPath(newPath);
              setParentId(
                newPath.length === 0 ? null : newPath[newPath.length - 1].id,
              );
            }
          : undefined
      }
      breadcrumbs={[
        ...(isMySpace
          ? [{ label: "Mes documents", path: "/dashboard/documents" }]
          : [
              { label: "Documents partagés", path: "/dashboard/documents" },
              {
                label:
                  clientName || (clientId ? `Client ${clientId}` : "Détail"),
              },
            ]),
        ...folderPath.map((step, i) => ({
          label: step.name,
          onClick:
            i < folderPath.length - 1
              ? () => {
                  const newPath = folderPath.slice(0, i + 1);
                  setFolderPath(newPath);
                  setParentId(newPath[newPath.length - 1].id);
                }
              : undefined,
        })),
      ]}
      documentsProcessed={
        isMySpace
          ? undefined
          : {
              processed: invoiceStats.traite,
              total: invoiceStats.total,
            }
      }
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
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Typography variant="h6" fontWeight={500}>
            Dossiers
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CustomInput
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder="Rechercher..."
              startIcon={<Search size={20} />}
              sx={{ width: 300 }}
            />
          </Box>
        </Box>

        {isError && (
          <Typography color="error" sx={{ py: 2 }}>
            Impossible de charger les dossiers et documents.
          </Typography>
        )}
        {isLoading && (
          <Typography color="text.secondary" sx={{ py: 2 }}>
            Chargement…
          </Typography>
        )}

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
              {!isLoading &&
                !isError &&
                folders.map((folder) => (
                  <Grid key={folder.id}>
                    <FolderWithCount
                      folder={folder}
                      onOpen={() => {
                        setFolderPath((prev) => [
                          ...prev,
                          { id: folder.id, name: folder.name },
                        ]);
                        setParentId(folder.id);
                      }}
                      onMenuAction={(action) => {
                        if (action === "edit") {
                          setRenameFolder({ id: folder.id, name: folder.name });
                        } else if (action === "delete") {
                          setDeleteConfirm({
                            type: "folder",
                            id: folder.id,
                            name: folder.name,
                          });
                        }
                      }}
                    />
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
                  updatedAt={activeFolder.updatedAt}
                  onClick={() => {}}
                  onMenuAction={() => {}}
                />
              </Box>
            ) : activeFile ? (
              <Box sx={{ opacity: 0.9, pointerEvents: "none" }}>
                <FileCard file={activeFile} onMenuAction={() => {}} />
              </Box>
            ) : null}
          </DragOverlay>
        </DndContext>

        {/* ── Documents (fichiers) ── */}
        <Box sx={{ my: 4 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography variant="body1">
              Documents {parentId != null ? "dans ce dossier" : "à la racine"}
            </Typography>
          </Box>

          <Box>
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
                  {selectedFiles.length} sélectionné(s)
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    width: "50%",
                    gap: 1,
                  }}
                >
                  <CustomButton
                    variant="contained"
                    onClick={handleDeleteSelected}
                  >
                    Supprimer
                  </CustomButton>
                  <CustomButton variant="outlined" onClick={handleSelectAll}>
                    Tout sélectionner
                  </CustomButton>
                </Box>
              </Box>
            )}

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(6, 1fr)",
                gap: 2,
              }}
            >
              {!isLoading &&
                !isError &&
                fileItems.map((file) => (
                  <FileCardWithPreview
                    key={file.id}
                    file={file}
                    selectable
                    selected={selectedFiles.includes(file.id)}
                    onSelect={(selected) => handleSelect(file.id, selected)}
                    onMenuAction={(action, fileItem) => {
                      if (action === "delete") {
                        setDeleteConfirm({
                          type: "file",
                          id: Number(fileItem.id),
                          name: fileItem.name,
                        });
                      } else if (action === "rename") {
                        setRenameFile({
                          id: Number(fileItem.id),
                          name: fileItem.name,
                        });
                      } else if (action === "download") {
                        handleDownloadFile(Number(fileItem.id), fileItem.name);
                      } else if (action === "preview") {
                        setPreviewFile({
                          id: Number(fileItem.id),
                          name: fileItem.name,
                          type: fileItem.type,
                        });
                      }
                    }}
                  />
                ))}
            </Box>
            {!isLoading && !isError && fileItems.length === 0 && (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  py: 8,
                  px: 3,
                  bgcolor: "grey.50",
                  borderRadius: 4,
                  border: "1px dashed",
                  borderColor: "grey.300",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    bgcolor: "grey.100",
                    borderColor: "primary.main",
                  },
                }}
              >
                {/* Animated Icon */}
                <Box
                  sx={{
                    position: "relative",
                    mb: 3,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 80,
                      height: 80,
                      borderRadius: "50%",
                      bgcolor: "primary.lighter",
                      opacity: 0.5,
                      animation: "pulse 2s infinite",
                      "@keyframes pulse": {
                        "0%": {
                          transform: "translate(-50%, -50%) scale(0.8)",
                          opacity: 0.3,
                        },
                        "50%": {
                          transform: "translate(-50%, -50%) scale(1.2)",
                          opacity: 0.6,
                        },
                        "100%": {
                          transform: "translate(-50%, -50%) scale(0.8)",
                          opacity: 0.3,
                        },
                      },
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      bgcolor: "primary.light",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M4 7C4 5.89543 4.89543 5 6 5H10L12 7H18C19.1046 7 20 7.89543 20 9V17C20 18.1046 19.1046 19 18 19H6C4.89543 19 4 18.1046 4 17V7Z"
                        fill="white"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 15V11M10 13H14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Box>
                </Box>

                {/* Title */}
                <Typography
                  variant="h6"
                  fontWeight={600}
                  color="text.primary"
                  sx={{ mb: 1 }}
                >
                  Dossier vide
                </Typography>

                {/* Description */}
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ maxWidth: 280, mb: 3 }}
                >
                  Aucun document ajouté à ce dossier. Commencez par importer des
                  fichiers.
                </Typography>

                {/* Action Buttons */}
                <Box sx={{ display: "flex", gap: 2 }}>
                  <CustomButton
                    variant="contained"
                    color="primary"
                    startIcon={<Upload size={18} />}
                    onClick={() => console.log("Upload document")}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                      boxShadow: "none",
                      "&:hover": {
                        boxShadow: "0 8px 16px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    Importer
                  </CustomButton>
                  <CustomButton
                    variant="outlined"
                    color="primary"
                    startIcon={<FolderPlus size={18} />}
                    onClick={() => console.log("Create folder")}
                    sx={{
                      borderRadius: 2,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Nouveau dossier
                  </CustomButton>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <CreateFolderModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateFolder}
        isLoading={isCreating}
      />
      <ImportDocumentModal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSubmit={handleImportDocument}
        defaultParentId={parentId}
        isLoading={isUploading}
      />
      {renameFolder && (
        <RenameFolderModal
          open={!!renameFolder}
          onClose={() => setRenameFolder(null)}
          onSubmit={handleRenameFolder}
          initialName={renameFolder.name}
          isLoading={isUpdating}
        />
      )}
      {renameFile && (
        <RenameFolderModal
          open={!!renameFile}
          onClose={() => setRenameFile(null)}
          onSubmit={handleRenameFile}
          initialName={renameFile.name}
          isLoading={isUpdating}
          title="Renommer le document"
          description="Saisissez le nouveau nom du document."
          inputLabel="Nom du document"
          inputPlaceholder="Saisir le nom du document"
        />
      )}
      {previewFile && (
        <DocumentPreviewModal
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          documentId={previewFile.id}
          fileName={previewFile.name}
          fileType={previewFile.type}
          onDownloadDocument={handleDownloadFile}
        />
      )}
      <SuccessFolderModal
        open={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
      />
      {deleteConfirm && (
        <ConfirmDeleteModal
          open={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
          title="Confirmer la suppression"
          message={
            deleteConfirm.type === "folder"
              ? `Supprimer le dossier « ${deleteConfirm.name} » ? Son contenu sera également supprimé.`
              : deleteConfirm.type === "file"
                ? `Supprimer le document « ${deleteConfirm.name} » ?`
                : `Supprimer les ${deleteConfirm.ids.length} document(s) sélectionné(s) ?`
          }
        />
      )}
    </PageHeader>
  );
}
