import {
  alpha,
  Box,
  Grid,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import {
  DndContext,
  rectIntersection,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  Plus,
  Search,
  FolderPlus,
  CalendarDays,
  Eye,
  Download,
  Edit,
  Trash2,
  Move,
} from "lucide-react";
import { useState } from "react";
import type { Dayjs } from "dayjs";
import { useParams, useLocation } from "react-router-dom";
import { Folder } from "src/components/common/folder";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import MenuItem from "@mui/material/MenuItem";
import type { FileItem, FileType } from "src/components/common/File";
import { FileCard } from "src/components/common/File";
import CustomButton from "src/components/common/CustomButton";
import { CreateFolderModal } from "./CreateFolderModal";
import { SuccessFolderModal } from "./SuccessFolderModal";
import { ConfirmDeleteModal } from "./ConfirmDeleteModal";
import { RenameFolderModal } from "./RenameFolderModal";
import { ImportDocumentModal } from "./ImportDocumentModal";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { MoveDocumentModal } from "./MoveDocumentModal";
import { FolderWithCount, FOLDER_DROP_PREFIX } from "./SortableDroppableFolder";
import { FileCardWithPreview, FILE_PREFIX } from "./SortableFileCard";
import {
  useGetDocumentsQuery,
  useCreateFolderMutation,
  useUpdateDocumentMutation,
  useDeleteDocumentMutation,
  useUploadDocumentMutation,
  useDownloadDocumentMutation,
} from "src/lib/services/documentsApi";
import type { DocumentItem } from "src/lib/services/documentsApi";
import {
  type FolderItem,
  formatSize,
  docToFolderState,
  docToFileType,
} from "./document-details-types";

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
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
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
    mimeType?: string | null;
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
  const [moveFile, setMoveFile] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const theme = useTheme();

  const hasSearchOrFilter = Boolean(
    searchValue.trim() || category || startDate || endDate,
  );

  const { data, isLoading, isError, refetch } = useGetDocumentsQuery({
    clientId: !isMySpace && clientId ? Number(clientId) : undefined,
    parentId: parentId ?? undefined,
    limit: 100,
    status: "active",
    search: searchValue || undefined,
    category: category || undefined,
    startDate: startDate ? startDate.format("YYYY-MM-DD") : undefined,
    endDate: endDate ? endDate.format("YYYY-MM-DD") : undefined,
  });
  const { data: moveFoldersData } = useGetDocumentsQuery(
    {
      clientId: !isMySpace && clientId ? Number(clientId) : undefined,
      parentId: undefined,
      limit: 200,
      status: "active",
    },
    { skip: !moveFile },
  );
  const moveFoldersList: { id: number | null; name: string }[] = moveFile
    ? [
        { id: null, name: "Racine" },
        ...(moveFoldersData?.data ?? [])
          .filter((d) => d.isFolder)
          .map((d) => ({ id: d.id, name: d.name })),
      ]
    : [];

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
      mimeType: d.mimeType ?? undefined,
    }));

  const fileCardMenuOptionsBase: {
    label: string;
    icon: React.ReactNode;
    action: string;
  }[] = [
    { label: "Aperçu", icon: <Eye size={16} />, action: "preview" },
    { label: "Télécharger", icon: <Download size={16} />, action: "download" },
    { label: "Renommer", icon: <Edit size={16} />, action: "rename" },
    { label: "Supprimer", icon: <Trash2 size={16} />, action: "delete" },
  ];
  const fileCardMenuOptions = hasSearchOrFilter
    ? [
        ...fileCardMenuOptionsBase.slice(0, 3),
        { label: "Déplacer", icon: <Move size={16} />, action: "move" },
        ...fileCardMenuOptionsBase.slice(3),
      ]
    : fileCardMenuOptionsBase;

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
    await createFolder({
      name,
      parentId: parentId ?? undefined,
      clientCompanyId: !isMySpace && clientId ? Number(clientId) : undefined,
    }).unwrap();
    setSuccessModalOpen(true);
  };

  const handleImportDocument = async (payload: {
    file: File;
    documentName?: string;
    category?: string;
    parentId?: number | null;
    clientCompanyId?: number | null;
  }) => {
    await uploadDocument({
      file: payload.file,
      parentId: payload.parentId ?? undefined,
      category: payload.category,
      clientCompanyId:
        payload.clientCompanyId ??
        (!isMySpace && clientId ? Number(clientId) : undefined),
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
    const overIdStr = String(over.id);

    // Document (file) déposé sur un dossier → déplacer le document dans ce dossier
    if (activeIdStr.startsWith(FILE_PREFIX)) {
      let targetFolderId: number | null = null;
      if (overIdStr.startsWith(FOLDER_DROP_PREFIX)) {
        targetFolderId = Number(overIdStr.slice(FOLDER_DROP_PREFIX.length));
      } else {
        const n = Number(overIdStr);
        if (!Number.isNaN(n)) targetFolderId = n;
      }
      if (
        targetFolderId != null &&
        !Number.isNaN(targetFolderId) &&
        folders.some((f) => f.id === targetFolderId)
      ) {
        const fileId = Number(activeIdStr.slice(FILE_PREFIX.length));
        if (!Number.isNaN(fileId)) {
          updateDocument({ id: fileId, dto: { parentId: targetFolderId } });
        }
      }
      return;
    }

    // Dossier déposé sur un autre dossier → déplacer le dossier (over peut être sortable id ou drop-folder-X)
    const overId = overIdStr.startsWith(FOLDER_DROP_PREFIX)
      ? Number(overIdStr.slice(FOLDER_DROP_PREFIX.length))
      : typeof over.id === "number"
        ? over.id
        : Number(over.id);
    const draggedFolderId =
      typeof active.id === "number" ? active.id : Number(active.id);
    if (
      !Number.isNaN(draggedFolderId) &&
      !Number.isNaN(overId) &&
      draggedFolderId !== overId &&
      folders.some((f) => f.id === draggedFolderId) &&
      folders.some((f) => f.id === overId)
    ) {
      updateDocument({ id: draggedFolderId, dto: { parentId: overId } });
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
        {/* ── Folders section + filters ── */}
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
          {/* Filtres : gauche = date, centre = catégorie, droite = recherche */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}>
            {/* Gauche : filtre date */}
            <IconButton
              onClick={(e) => setDateAnchor(e.currentTarget)}
              sx={{
                border: "1px solid",
                borderColor: theme.palette.divider,
                borderRadius: 1.5,
                color:
                  dateAnchor || startDate || endDate
                    ? theme.palette.primary.main
                    : theme.palette.grey[600],
                backgroundColor:
                  dateAnchor || startDate || endDate
                    ? alpha(theme.palette.primary.main, 0.08)
                    : theme.palette.background.paper,
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                },
              }}
              aria-label="Filtrer par date"
            >
              <CalendarDays size={20} />
            </IconButton>

            {/* Centre : filtre catégorie (custom select) */}
            <CustomSelect
              value={category}
              onChange={(e) => setCategory(String(e.target.value ?? ""))}
              displayEmpty
              sx={{ minWidth: 140 }}
              renderValue={(v) =>
                typeof v === "string" && v ? v : "Catégorie"
              }
            >
              <MenuItem value="">
                <em>Toutes les catégories</em>
              </MenuItem>
              <MenuItem value="facture">Facture</MenuItem>
              <MenuItem value="contrat">Contrat</MenuItem>
              <MenuItem value="rapport">Rapport</MenuItem>
              <MenuItem value="autre">Autre</MenuItem>
            </CustomSelect>

            {/* Droite : recherche */}
            <Box sx={{ marginLeft: "auto" }}>
              <CustomInput
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                placeholder="Rechercher..."
                startIcon={<Search size={20} />}
                sx={{ width: 260 }}
              />
            </Box>
          </Box>
        </Box>

        {hasSearchOrFilter && (
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Résultat de recherche
          </Typography>
        )}

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

        <LocalizationProvider dateAdapter={AdapterDayjs}>
          {/* Popover-like inline date filters (simple version) */}
          {dateAnchor && (
            <Box
              sx={{
                position: "absolute",
                mt: 1,
                right: 24,
                zIndex: 10,
                bgcolor: "background.paper",
                boxShadow: 3,
                borderRadius: 2,
                p: 2,
                minWidth: 260,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Filtrer par date
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <DatePicker
                  label="Du"
                  value={startDate}
                  onChange={(v: Dayjs | null) => setStartDate(v)}
                  maxDate={endDate ?? undefined}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <DatePicker
                  label="Au"
                  value={endDate}
                  onChange={(v: Dayjs | null) => setEndDate(v)}
                  minDate={startDate ?? undefined}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <CustomButton
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setStartDate(null);
                      setEndDate(null);
                    }}
                  >
                    Réinitialiser
                  </CustomButton>
                  <CustomButton
                    size="small"
                    variant="contained"
                    onClick={() => setDateAnchor(null)}
                  >
                    Appliquer
                  </CustomButton>
                </Box>
              </Box>
            </Box>
          )}
        </LocalizationProvider>

        <DndContext
          sensors={sensors}
          collisionDetection={rectIntersection}
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
                      clientCompanyId={
                        !isMySpace && clientId ? Number(clientId) : undefined
                      }
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

          {/* ── Documents (fichiers) : doit être dans DndContext pour le drag & drop ── */}
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

              <SortableContext
                items={fileItems.map((f) => `${FILE_PREFIX}${f.id}`)}
                strategy={rectSortingStrategy}
              >
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
                        menuOptions={fileCardMenuOptions}
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
                            handleDownloadFile(
                              Number(fileItem.id),
                              fileItem.name,
                            );
                          } else if (action === "preview") {
                            setPreviewFile({
                              id: Number(fileItem.id),
                              name: fileItem.name,
                              type: fileItem.type,
                              mimeType: fileItem.mimeType,
                            });
                          } else if (action === "move" && hasSearchOrFilter) {
                            setMoveFile({
                              id: Number(fileItem.id),
                              name: fileItem.name,
                            });
                          }
                        }}
                      />
                    ))}
                </Box>
              </SortableContext>
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
                  <Typography color="text.secondary">
                    Aucun document. Importez ou glissez-déposez ici.
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>

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
        clientCompanyId={!isMySpace && clientId ? Number(clientId) : undefined}
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
      <MoveDocumentModal
        open={!!moveFile}
        onClose={() => setMoveFile(null)}
        moveFile={moveFile}
        foldersList={moveFoldersList}
        onMove={async (documentId, targetParentId) => {
          await updateDocument({
            id: documentId,
            dto: { parentId: targetParentId },
          }).unwrap();
          setMoveFile(null);
        }}
        isLoading={isUpdating}
      />
      {previewFile && (
        <DocumentPreviewModal
          open={!!previewFile}
          onClose={() => setPreviewFile(null)}
          documentId={previewFile.id}
          fileName={previewFile.name}
          fileType={previewFile.type}
          mimeType={previewFile.mimeType}
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
