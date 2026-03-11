import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  Typography,
} from "@mui/material";
import { ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import CustomButton from "src/components/common/CustomButton";
import { useLazyGetDocumentsQuery } from "src/lib/services/documentsApi";

export type MoveItemType = "file" | "folder";

export interface MoveItem {
  id: number;
  name: string;
  type: MoveItemType;
}

export interface MoveDocumentModalProps {
  open: boolean;
  onClose: () => void;
  /** Élément à déplacer (document ou dossier) */
  moveItem: MoveItem | null;
  /** Liste des dossiers racine : [{ id: null, name: "Racine" }, ...dossiers] */
  foldersList: { id: number | null; name: string }[];
  /** Client company ID pour charger les sous-dossiers à la demande */
  clientId?: number | null;
  /** À exclure de l'arbre (ex. ID du dossier qu'on déplace, pour éviter de le déplacer dans lui-même) */
  excludeFolderId?: number | null;
  onMove: (itemId: number, parentId: number | null) => Promise<void>;
  isLoading?: boolean;
}

interface FolderEntry {
  id: number;
  name: string;
}

export function MoveDocumentModal({
  open,
  onClose,
  moveItem,
  foldersList,
  clientId,
  excludeFolderId,
  onMove,
  isLoading = false,
}: MoveDocumentModalProps) {
  const [selectedParentId, setSelectedParentId] = useState<number | null>(null);
  const [pathBreadcrumb, setPathBreadcrumb] = useState<FolderEntry[]>([]);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [childrenByParentId, setChildrenByParentId] = useState<
    Record<number, FolderEntry[]>
  >({});
  const [pathForId, setPathForId] = useState<Record<number, FolderEntry[]>>({});
  const [loadingParentId, setLoadingParentId] = useState<number | null>(null);
  const loadedParentIdsRef = useRef<Set<number>>(new Set());
  const [fetchChildren] = useLazyGetDocumentsQuery();

  const rootFolders = foldersList.filter((f) => f.id != null) as FolderEntry[];

  useEffect(() => {
    if (!open) return;
    loadedParentIdsRef.current = new Set();
    setSelectedParentId(null);
    setPathBreadcrumb([]);
    setExpandedIds(new Set());
    setChildrenByParentId({});
    const root = foldersList.filter((f) => f.id != null) as FolderEntry[];
    const initialPaths: Record<number, FolderEntry[]> = {};
    root.forEach((f) => {
      initialPaths[f.id] = [{ id: f.id, name: f.name }];
    });
    setPathForId(initialPaths);
  }, [open, foldersList]);

  const loadChildren = useCallback(
    async (parentId: number) => {
      if (loadedParentIdsRef.current.has(parentId)) return;
      loadedParentIdsRef.current.add(parentId);
      setLoadingParentId(parentId);
      try {
        const result = await fetchChildren({
          clientId: clientId ?? undefined,
          parentId,
          limit: 500,
          status: "active",
        }).unwrap();
        const folders = (result.data ?? [])
          .filter((d) => d.isFolder && d.id !== excludeFolderId)
          .map((d) => ({ id: d.id, name: d.name }));
        setChildrenByParentId((prev) => ({ ...prev, [parentId]: folders }));
        setPathForId((prev) => {
          const next = { ...prev };
          const parentPath = prev[parentId] ?? [];
          folders.forEach((f) => {
            next[f.id] = [...parentPath, f];
          });
          return next;
        });
      } finally {
        setLoadingParentId(null);
      }
    },
    [clientId, fetchChildren],
  );

  const toggleExpand = (folderId: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
    loadChildren(folderId);
  };

  const selectRoot = () => {
    setSelectedParentId(null);
    setPathBreadcrumb([]);
  };

  const selectFolder = (folderId: number, path: FolderEntry[]) => {
    setSelectedParentId(folderId);
    setPathBreadcrumb(path);
  };

  const handleMove = async () => {
    if (!moveItem) return;
    await onMove(moveItem.id, selectedParentId);
    onClose();
  };

  const isFolder = moveItem?.type === "folder";
  const modalTitle = isFolder
    ? "Déplacer votre dossier"
    : "Déplacer votre document";
  const modalDescription = isFolder
    ? "Déplacez votre dossier vers un autre dossier"
    : "Déplacez votre document vers un autre dossier";

  const breadcrumbLabel =
    pathBreadcrumb.length === 0
      ? "Racine"
      : pathBreadcrumb.map((p) => p.name).join(" > ");

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: "1.125rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {modalTitle}
        <IconButton
          size="small"
          onClick={onClose}
          sx={{ color: "text.secondary" }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {modalDescription}
        </Typography>

        <Typography
          variant="body2"
          fontWeight={500}
          color="text.secondary"
          sx={{ mb: 0.5 }}
        >
          Choisir la destination du fichier
        </Typography>
        <Box
          sx={{
            border: "1px solid",
            borderColor: "primary.main",
            borderRadius: 1.5,
            px: 1.5,
            py: 1.25,
            mb: 2,
            bgcolor: "background.paper",
          }}
        >
          <Typography
            variant="body2"
            noWrap
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <span aria-hidden>📁</span> {breadcrumbLabel}
          </Typography>
        </Box>

        <List disablePadding sx={{ maxHeight: 320, overflow: "auto" }}>
          <ListItemButton
            selected={selectedParentId === null}
            onClick={selectRoot}
            sx={{ borderRadius: 1 }}
          >
            <Typography
              variant="body2"
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <span aria-hidden>📁</span> Racine
            </Typography>
          </ListItemButton>
          {rootFolders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              depth={0}
              path={pathForId[folder.id] ?? [folder]}
              isExpanded={expandedIds.has(folder.id)}
              isLoading={loadingParentId === folder.id}
              isSelected={selectedParentId === folder.id}
              onToggleExpand={() => toggleExpand(folder.id)}
              onSelect={() =>
                selectFolder(folder.id, pathForId[folder.id] ?? [folder])
              }
              childrenList={childrenByParentId[folder.id]}
              childrenByParentId={childrenByParentId}
              pathForId={pathForId}
              expandedIds={expandedIds}
              loadingParentId={loadingParentId}
              selectedParentId={selectedParentId}
              onToggleExpandId={toggleExpand}
              onSelectFolder={selectFolder}
            />
          ))}
        </List>

        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            mt: 2,
            pt: 2,
            borderTop: 1,
            borderColor: "divider",
          }}
        >
          <CustomButton variant="outlined" onClick={onClose}>
            Annuler
          </CustomButton>
          <CustomButton
            variant="contained"
            onClick={handleMove}
            disabled={isLoading}
          >
            Déplacer
          </CustomButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

interface FolderRowProps {
  folder: FolderEntry;
  depth: number;
  path: FolderEntry[];
  isExpanded: boolean;
  isLoading: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onSelect: () => void;
  childrenList?: FolderEntry[];
  childrenByParentId: Record<number, FolderEntry[]>;
  pathForId: Record<number, FolderEntry[]>;
  expandedIds: Set<number>;
  loadingParentId: number | null;
  selectedParentId: number | null;
  onToggleExpandId: (folderId: number) => void;
  onSelectFolder: (folderId: number, path: FolderEntry[]) => void;
}

function FolderRow({
  folder,
  depth,
  path,
  isExpanded,
  isLoading,
  isSelected,
  onToggleExpand,
  onSelect,
  childrenList,
  childrenByParentId,
  pathForId,
  expandedIds,
  loadingParentId,
  selectedParentId,
  onToggleExpandId,
  onSelectFolder,
}: FolderRowProps) {
  const hasChildren = childrenList ? childrenList.length > 0 : undefined;
  const showChevron = hasChildren === undefined || hasChildren;

  return (
    <>
      <ListItemButton
        selected={isSelected}
        onClick={onSelect}
        sx={{
          pl: 2 + depth * 2,
          borderRadius: 1,
          py: 0.75,
        }}
      >
        <Box
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            if (showChevron) onToggleExpand();
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            mr: 0.5,
            cursor: showChevron ? "pointer" : "default",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
          aria-hidden
        >
          <ChevronRight size={18} />
        </Box>
        <Typography
          variant="body2"
          sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
        >
          <span aria-hidden>📁</span> {folder.name}
        </Typography>
        {isLoading && (
          <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
            …
          </Typography>
        )}
      </ListItemButton>
      {isExpanded &&
        (childrenList ?? []).map((child) => (
          <FolderRow
            key={child.id}
            folder={child}
            depth={depth + 1}
            path={pathForId[child.id] ?? [...path, child]}
            isExpanded={expandedIds.has(child.id)}
            isLoading={loadingParentId === child.id}
            isSelected={selectedParentId === child.id}
            onToggleExpand={() => onToggleExpandId(child.id)}
            onSelect={() =>
              onSelectFolder(child.id, pathForId[child.id] ?? [...path, child])
            }
            childrenList={childrenByParentId[child.id]}
            childrenByParentId={childrenByParentId}
            pathForId={pathForId}
            expandedIds={expandedIds}
            loadingParentId={loadingParentId}
            selectedParentId={selectedParentId}
            onToggleExpandId={onToggleExpandId}
            onSelectFolder={onSelectFolder}
          />
        ))}
    </>
  );
}
