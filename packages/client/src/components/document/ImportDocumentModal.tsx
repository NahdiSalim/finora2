import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import { X, ChevronRight, Folder } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import MenuItem from "@mui/material/MenuItem";
import FileUpload from "src/components/common/FileUpload";
import { useGetDocumentsQuery } from "src/lib/services/documentsApi";
import { DOCUMENT_CATEGORIES } from "src/lib/constants/documentCategories";

const MAX_SIZE_MB = 50;
const ACCEPTED_FILES = [".jpg", ".jpeg", ".png", ".pdf", ".mp4"];

// ─── Folder tree item (loads children when expanded) ────────────────────────

const DESTINATION_PAGE_SIZE = 5;

interface FolderTreeItemProps {
  folderId: number;
  folderName: string;
  depth: number;
  hasFolders?: boolean;
  foldersCount?: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
  clientCompanyId?: number;
}

function FolderTreeItem({
  folderId,
  folderName,
  depth,
  hasFolders,
  foldersCount,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  clientCompanyId,
}: FolderTreeItemProps) {
  const canExpand =
    hasFolders === true ||
    (typeof foldersCount === "number" && foldersCount > 0);
  const isExpanded = expandedIds.has(folderId);
  const { data } = useGetDocumentsQuery(
    {
      clientId: clientCompanyId,
      parentId: folderId,
      page: 1,
      limit: DESTINATION_PAGE_SIZE,
      status: "active",
      itemType: "folder",
    },
    { skip: !isExpanded || !canExpand },
  );
  const childFolders =
    data?.data?.map((d) => ({
      id: d.id,
      name: d.name,
      hasFolders: d.hasFolders,
      foldersCount: d.foldersCount,
    })) ?? [];

  return (
    <>
      <Box
        onClick={() => onSelect(folderId)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 2 + depth * 2,
          py: 1.25,
          cursor: "pointer",
          bgcolor: selectedId === folderId ? "action.selected" : "transparent",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            if (!canExpand) return;
            onToggleExpand(folderId);
          }}
          sx={{
            display: "inline-flex",
            transform: isExpanded ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          {canExpand ? (
            <ChevronRight size={18} />
          ) : (
            <ChevronRight size={18} color="transparent" />
          )}
        </Box>
        <Folder size={18} />
        <Typography variant="body2">
          {folderName}
          {typeof foldersCount === "number" && foldersCount > 0
            ? ` (${foldersCount})`
            : ""}
        </Typography>
      </Box>
      {isExpanded &&
        childFolders.map((child) => (
          <FolderTreeItem
            key={child.id}
            folderId={child.id}
            folderName={child.name}
            depth={depth + 1}
            hasFolders={child.hasFolders}
            foldersCount={child.foldersCount}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            selectedId={selectedId}
            onSelect={onSelect}
            clientCompanyId={clientCompanyId}
          />
        ))}
    </>
  );
}

// ─── Main modal ─────────────────────────────────────────────────────────────

export interface ImportDocumentModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    file: File;
    documentName?: string;
    category?: string;
    parentId?: number | null;
  }) => void | Promise<void>;
  defaultParentId?: number | null;
  isLoading?: boolean;
  /** Client company ID quand le comptable importe dans l'espace d'un client */
  clientCompanyId?: number;
}

export function ImportDocumentModal({
  open,
  onClose,
  onSubmit,
  defaultParentId = null,
  isLoading = false,
  clientCompanyId,
}: ImportDocumentModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState("");
  const [category, setCategory] = useState<string>("");
  const [parentId, setParentId] = useState<number | null>(
    defaultParentId ?? null,
  );
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [rootPage, setRootPage] = useState(1);
  const [accumulatedRootFolders, setAccumulatedRootFolders] = useState<
    { id: number; name: string; hasFolders?: boolean; foldersCount?: number }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const destinationScrollRef = useRef<HTMLDivElement | null>(null);
  const isLoadingNextRootPageRef = useRef(false);

  useEffect(() => {
    if (open) {
      setParentId(defaultParentId ?? null);
      setExpandedIds(new Set());
      setRootPage(1);
      setAccumulatedRootFolders([]);
    }
  }, [open, defaultParentId]);

  const {
    data,
    isFetching,
    isLoading: isFoldersLoading,
  } = useGetDocumentsQuery(
    {
      clientId: clientCompanyId,
      parentId: undefined,
      page: rootPage,
      limit: DESTINATION_PAGE_SIZE,
      status: "active",
      itemType: "folder",
    },
    { skip: !open },
  );
  const hasMoreRootPages =
    (data?.pagination?.currentPage ?? 1) < (data?.pagination?.totalPages ?? 1);

  useEffect(() => {
    if (!data) return;
    const incoming = (data.data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      hasFolders: d.hasFolders,
      foldersCount: d.foldersCount,
    }));
    setAccumulatedRootFolders((prev) => {
      if (rootPage === 1) return incoming;
      const existingIds = new Set(prev.map((f) => f.id));
      const appended = incoming.filter((f) => !existingIds.has(f.id));
      return [...prev, ...appended];
    });
    isLoadingNextRootPageRef.current = false;
  }, [data, rootPage]);

  const isFetchingMoreRoots = isFetching && rootPage > 1;

  const resetForm = useCallback(() => {
    setFile(null);
    setDocumentName("");
    setCategory("");
    setParentId(defaultParentId ?? null);
    setExpandedIds(new Set());
    setRootPage(1);
    setAccumulatedRootFolders([]);
    setError(null);
  }, [defaultParentId]);

  const handleClose = () => {
    if (!isLoading) {
      resetForm();
      onClose();
    }
  };

  const handleFileChange = useCallback((f: File | null) => {
    setError(null);
    setFile(f);
    if (f) {
      setDocumentName((prev) =>
        prev.trim() ? prev : f.name.replace(/\.[^/.]+$/, ""),
      );
    } else {
      setDocumentName("");
    }
  }, []);

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleDestinationScroll = useCallback(() => {
    const el = destinationScrollRef.current;
    if (
      !el ||
      isFetching ||
      isFetchingMoreRoots ||
      !hasMoreRootPages ||
      isLoadingNextRootPageRef.current
    )
      return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 24;
    if (nearBottom) {
      isLoadingNextRootPageRef.current = true;
      setRootPage((prev) => prev + 1);
    }
  }, [hasMoreRootPages, isFetching, isFetchingMoreRoots]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Veuillez sélectionner un fichier.");
      return;
    }
    setError(null);
    try {
      await onSubmit({
        file,
        documentName: documentName.trim() || undefined,
        category: category || undefined,
        parentId: parentId ?? undefined,
        // clientCompanyId sera utilisé côté comptable (ignoré côté client)
        ...(clientCompanyId != null && { clientCompanyId }),
      });
      resetForm();
      onClose();
    } catch {
      setError("Erreur lors de l\u2019import.");
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3, p: 0, overflow: "hidden" } }}
    >
      <DialogTitle
        sx={{ fontWeight: 600, fontSize: "1.25rem", pb: 0, pt: 2, px: 2 }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Importer un document
          <IconButton
            size="small"
            onClick={handleClose}
            disabled={isLoading}
            sx={{ color: "text.secondary" }}
          >
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 2, pb: 2, pt: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Importez un nouveau document dans votre espace de travail.
        </Typography>

        <Stack spacing={2}>
          <FileUpload
            label="Fichier"
            value={file}
            onChange={handleFileChange}
            maxSize={MAX_SIZE_MB}
            acceptedFiles={ACCEPTED_FILES}
            error={!!error}
            helperText={error ?? undefined}
          />
          <Typography variant="caption" color="text.secondary">
            JPEG, PNG, PDF et MP4, jusqu&apos;à {MAX_SIZE_MB} Mo
          </Typography>

          <CustomInput
            label="Nom du document"
            placeholder="Saisir le nom du document"
            value={documentName}
            onChange={(e) => setDocumentName(e.target.value)}
            fullWidth
          />

          <CustomSelect
            label="Catégorie"
            value={category}
            onChange={(e) => setCategory(String(e.target.value ?? ""))}
            displayEmpty
            renderValue={(v) =>
              typeof v === "string" && v
                ? (DOCUMENT_CATEGORIES.find((c) => c.value === v)?.label ?? "")
                : "Sélectionnez une catégorie"
            }
          >
            <MenuItem value="">
              <em>Sélectionnez une catégorie</em>
            </MenuItem>
            {DOCUMENT_CATEGORIES.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </CustomSelect>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Choisir la destination du document
            </Typography>
            <Box
              ref={destinationScrollRef}
              onScroll={handleDestinationScroll}
              sx={{
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
                maxHeight: 240,
                overflow: "auto",
              }}
            >
              <Box
                onClick={() => setParentId(null)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  cursor: "pointer",
                  bgcolor:
                    parentId === null ? "action.selected" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <ChevronRight size={18} color="transparent" />
                <Folder size={18} />
                <Typography variant="body2">Racine</Typography>
              </Box>
              {accumulatedRootFolders.map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folderId={folder.id}
                  folderName={folder.name}
                  depth={0}
                  hasFolders={folder.hasFolders}
                  foldersCount={folder.foldersCount}
                  expandedIds={expandedIds}
                  onToggleExpand={handleToggleExpand}
                  selectedId={parentId}
                  onSelect={setParentId}
                  clientCompanyId={clientCompanyId}
                />
              ))}
              {(isFoldersLoading || isFetchingMoreRoots) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, py: 1.25, display: "block" }}
                >
                  Chargement...
                </Typography>
              )}
              {!isFoldersLoading && accumulatedRootFolders.length === 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ px: 2, py: 1.25, display: "block" }}
                >
                  Aucun dossier disponible.
                </Typography>
              )}
            </Box>
          </Box>

          {error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          <Box
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1, pt: 1 }}
          >
            <CustomButton
              variant="outlined"
              onClick={handleClose}
              disabled={isLoading}
            >
              Annuler
            </CustomButton>
            <CustomButton
              variant="contained"
              onClick={handleSubmit}
              disabled={!file || isLoading}
            >
              Importer
            </CustomButton>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
