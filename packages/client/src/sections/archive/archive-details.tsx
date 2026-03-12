import {
  alpha,
  Box,
  Grid,
  IconButton,
  Paper,
  Typography,
  useTheme,
  Fade,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import type { Dayjs } from "dayjs";
import {
  Eye,
  Download,
  Trash2,
  ArchiveRestore,
  Search,
  CalendarDays,
  X,
} from "lucide-react";
import { useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import MenuItem from "@mui/material/MenuItem";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import { Folder } from "src/components/common/folder";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import CustomButton from "src/components/common/CustomButton";
import { ConfirmDeleteModal } from "src/components/document/ConfirmDeleteModal";
import { DocumentPreviewModal } from "src/components/document/DocumentPreviewModal";
import { FileCard } from "src/components/common/File";
import {
  useGetArchivedDocumentsQuery,
  useDeleteDocumentMutation,
  useUnarchiveDocumentMutation,
  useDownloadDocumentMutation,
} from "src/lib/services/documentsApi";
import type { DocumentItem } from "src/lib/services/documentsApi";
import {
  type FolderItem,
  formatSize,
  docToFileType,
} from "src/types/document-details-types";
import type { FileItem, FileType } from "src/components/common/File";

export default function ArchiveDetailsView() {
  const { clientId } = useParams<{ clientId?: string }>();
  const location = useLocation();
  const dashboardBase = useDashboardBase();
  const theme = useTheme();
  const state = location.state as { clientName?: string } | null;
  /** Mode "mon espace" (client) : pas de clientId dans l’URL. */
  const isMySpace = clientId == null || clientId === "";
  const clientName =
    state?.clientName ?? (clientId ? `Client ${clientId}` : "");

  const [searchValue, setSearchValue] = useState("");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: number; name: string }[]>(
    [],
  );
  const [deleteConfirm, setDeleteConfirm] = useState<
    | { type: "folder"; id: number; name: string }
    | { type: "file"; id: number; name: string }
    | null
  >(null);
  const [previewFile, setPreviewFile] = useState<{
    id: number;
    name: string;
    type: FileType;
    mimeType?: string | null;
  } | null>(null);

  const numericClientId = clientId ? Number(clientId) : undefined;

  const hasSearchOrFilter = Boolean(
    searchValue.trim() || category || startDate || endDate,
  );

  const { data, isLoading, isError } = useGetArchivedDocumentsQuery(
    {
      clientId: numericClientId ?? undefined,
      parentId: parentId ?? undefined,
      limit: 100,
      search: searchValue.trim() || undefined,
      category: category || undefined,
      startDate: startDate ? startDate.format("YYYY-MM-DD") : undefined,
      endDate: endDate ? endDate.format("YYYY-MM-DD") : undefined,
    },
    { skip: false },
  );
  const [deleteDocument, { isLoading: isDeleting }] =
    useDeleteDocumentMutation();
  const [unarchiveDocument] = useUnarchiveDocumentMutation();
  const [downloadDocument] = useDownloadDocumentMutation();

  const rawItems: DocumentItem[] = data?.data ?? [];
  const foldersFromApi: FolderItem[] = rawItems
    .filter((d) => d.isFolder)
    .map((d) => {
      const doc = d as DocumentItem & {
        foldersCount?: number;
        filesCount?: number;
      };
      return {
        id: doc.id,
        name: doc.name,
        description: "",
        state: "archived" as const,
        fileCount: (doc.filesCount ?? 0) + (doc.foldersCount ?? 0),
        updatedAt: doc.updatedAt ?? null,
      };
    });
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

  const folderMenuOptions = [
    {
      label: "Désarchiver",
      icon: <ArchiveRestore size={16} />,
      action: "unarchive",
    },
    { label: "Supprimer", icon: <Trash2 size={16} />, action: "delete" },
  ];

  const fileCardMenuOptions = [
    { label: "Aperçu", icon: <Eye size={16} />, action: "preview" },
    { label: "Télécharger", icon: <Download size={16} />, action: "download" },
    {
      label: "Désarchiver",
      icon: <ArchiveRestore size={16} />,
      action: "unarchive",
    },
    { label: "Supprimer", icon: <Trash2 size={16} />, action: "delete" },
  ];

  const handleFolderMenuAction = (action: string, folder: FolderItem) => {
    if (action === "unarchive") {
      unarchiveDocument(folder.id);
    } else if (action === "delete") {
      setDeleteConfirm({ type: "folder", id: folder.id, name: folder.name });
    }
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

  const handleFileMenuAction = (action: string, file: FileItem) => {
    if (action === "preview") {
      setPreviewFile({
        id: Number(file.id),
        name: file.name,
        type: file.type,
        mimeType: file.mimeType ?? null,
      });
    } else if (action === "download") {
      handleDownloadFile(Number(file.id), file.name);
    } else if (action === "unarchive") {
      unarchiveDocument(Number(file.id));
    } else if (action === "delete") {
      setDeleteConfirm({
        type: "file",
        id: Number(file.id),
        name: file.name,
      });
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDocument(deleteConfirm.id).unwrap();
      setDeleteConfirm(null);
    } catch {
      // Error handled by mutation
    }
    setDeleteConfirm(null);
  };

  return (
    <>
      <PageHeader
        title="Archive"
        caption={clientName}
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
            ? [{ label: "Mon archive", path: `${dashboardBase}/archive` }]
            : [
                { label: "Archive", path: `${dashboardBase}/archive` },
                { label: clientName },
              ]),
          ...folderPath.map((step, i) => ({
            label: step.name,
            path: undefined,
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
          {/* Barre recherche + filtres */}
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
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flex: 1,
                width: "100%",
              }}
            >
              <Box sx={{ marginLeft: "auto" }}>
                <CustomInput
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Rechercher..."
                  startIcon={<Search size={20} />}
                />
              </Box>
              <CustomSelect
                value={category}
                onChange={(e) => setCategory(String(e.target.value ?? ""))}
                displayEmpty
                sx={{ maxWidth: 160 }}
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
            </Box>
          </Box>

          {hasSearchOrFilter && (
            <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
              Résultat de recherche
            </Typography>
          )}

          {isError && (
            <Typography color="error" sx={{ py: 2 }}>
              Impossible de charger les documents archivés.
            </Typography>
          )}
          {isLoading && (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              Chargement…
            </Typography>
          )}

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            {dateAnchor && (
              <Fade in timeout={300}>
                <Paper
                  elevation={8}
                  sx={{
                    position: "absolute",
                    mt: 1,
                    right: 24,
                    zIndex: 1300,
                    borderRadius: 3,
                    minWidth: 320,
                    overflow: "hidden",
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: `0 12px 28px ${alpha(theme.palette.common.black, 0.12)}`,
                  }}
                >
                  <Box
                    sx={{
                      px: 2.5,
                      py: 2,
                      borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CalendarDays
                        size={18}
                        color={theme.palette.primary.main}
                      />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Filtrer par date
                      </Typography>
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => setDateAnchor(null)}
                      sx={{
                        color: theme.palette.text.secondary,
                        "&:hover": {
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.08,
                          ),
                          color: theme.palette.primary.main,
                        },
                      }}
                    >
                      <X size={18} />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      p: 2.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2.5,
                    }}
                  >
                    <DatePicker
                      label="Du"
                      value={startDate}
                      onChange={(v: Dayjs | null) => setStartDate(v)}
                      maxDate={endDate ?? undefined}
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              backgroundColor: theme.palette.background.paper,
                            },
                            "& .MuiInputLabel-root": {
                              fontWeight: 500,
                              color: theme.palette.text.secondary,
                            },
                          },
                        },
                      }}
                    />
                    <DatePicker
                      label="Au"
                      value={endDate}
                      onChange={(v: Dayjs | null) => setEndDate(v)}
                      minDate={startDate ?? undefined}
                      slotProps={{
                        textField: {
                          size: "small",
                          fullWidth: true,
                          sx: {
                            "& .MuiOutlinedInput-root": {
                              borderRadius: 2,
                              backgroundColor: theme.palette.background.paper,
                            },
                            "& .MuiInputLabel-root": {
                              fontWeight: 500,
                              color: theme.palette.text.secondary,
                            },
                          },
                        },
                      }}
                    />
                    {(startDate || endDate) && (
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: alpha(
                            theme.palette.primary.main,
                            0.04,
                          ),
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 0.5,
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: theme.palette.text.secondary }}
                        >
                          Période:
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 600,
                            color: theme.palette.primary.main,
                          }}
                        >
                          {startDate?.format("DD/MM/YYYY") || "..."} -{" "}
                          {endDate?.format("DD/MM/YYYY") || "..."}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", gap: 1.5, mt: 0.5 }}>
                      <CustomButton
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setStartDate(null);
                          setEndDate(null);
                        }}
                        sx={{
                          flex: 1,
                          borderRadius: 2,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          textTransform: "none",
                        }}
                      >
                        Réinitialiser
                      </CustomButton>
                      <CustomButton
                        size="small"
                        variant="contained"
                        onClick={() => setDateAnchor(null)}
                        sx={{
                          flex: 1,
                          borderRadius: 2,
                          fontSize: "0.8125rem",
                          fontWeight: 600,
                          textTransform: "none",
                        }}
                      >
                        Appliquer
                      </CustomButton>
                    </Box>
                  </Box>
                </Paper>
              </Fade>
            )}
          </LocalizationProvider>

          {!isLoading && !isError && (
            <>
              <Grid container spacing={3}>
                {folders.map((folder) => (
                  <Grid key={folder.id}>
                    <Folder
                      name={folder.name}
                      state="archived"
                      fileCount={folder.fileCount ?? 0}
                      updatedAt={folder.updatedAt}
                      allowClickWhenArchived
                      onClick={() => {
                        setFolderPath((prev) => [
                          ...prev,
                          { id: folder.id, name: folder.name },
                        ]);
                        setParentId(folder.id);
                      }}
                      onMenuAction={(action) =>
                        handleFolderMenuAction(action, folder)
                      }
                      menuOptions={folderMenuOptions}
                    />
                  </Grid>
                ))}
              </Grid>

              <Box sx={{ my: 4 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Documents{" "}
                  {parentId != null ? "dans ce dossier" : "à la racine"}
                </Typography>
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "repeat(6, 1fr)",
                    gap: 2,
                  }}
                >
                  {fileItems.map((file) => (
                    <FileCard
                      key={file.id}
                      file={file}
                      menuOptions={fileCardMenuOptions}
                      onMenuAction={(action) =>
                        handleFileMenuAction(action, file)
                      }
                    />
                  ))}
                </Box>
                {fileItems.length === 0 && folders.length === 0 && (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      py: 8,
                      px: 3,
                      bgcolor: alpha(theme.palette.grey[500], 0.04),
                      borderRadius: 4,
                      border: "1px dashed",
                      borderColor: alpha(theme.palette.grey[500], 0.3),
                    }}
                  >
                    <Typography color="text.secondary">
                      Aucun document archivé.
                    </Typography>
                  </Box>
                )}
              </Box>
            </>
          )}
        </Box>
      </PageHeader>

      <ConfirmDeleteModal
        open={deleteConfirm !== null}
        title={
          deleteConfirm?.type === "folder"
            ? "Supprimer le dossier ?"
            : "Supprimer le document ?"
        }
        message={
          deleteConfirm
            ? `« ${deleteConfirm.name} » sera supprimé définitivement.`
            : ""
        }
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmLabel="Supprimer"
      />

      {previewFile && (
        <DocumentPreviewModal
          open={Boolean(previewFile)}
          onClose={() => setPreviewFile(null)}
          documentId={previewFile.id}
          fileName={previewFile.name}
          fileType={previewFile.type}
          mimeType={previewFile.mimeType}
          onDownloadDocument={handleDownloadFile}
        />
      )}
    </>
  );
}
