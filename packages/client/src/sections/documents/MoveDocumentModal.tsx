import {
  Dialog,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  Typography,
} from "@mui/material";

export interface MoveDocumentModalProps {
  open: boolean;
  onClose: () => void;
  /** Document à déplacer */
  moveFile: { id: number; name: string } | null;
  /** Liste des dossiers de destination (Racine + dossiers) */
  foldersList: { id: number | null; name: string }[];
  onMove: (documentId: number, parentId: number | null) => Promise<void>;
  isLoading?: boolean;
}

export function MoveDocumentModal({
  open,
  onClose,
  moveFile,
  foldersList,
  onMove,
  isLoading = false,
}: MoveDocumentModalProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontWeight: 600 }}>Déplacer le document</DialogTitle>
      <DialogContent>
        {moveFile && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Choisir la destination pour « {moveFile.name} »
          </Typography>
        )}
        <List disablePadding>
          {foldersList.map((folder) => (
            <ListItemButton
              key={folder.id ?? "root"}
              onClick={async () => {
                if (!moveFile) return;
                await onMove(moveFile.id, folder.id ?? null);
                onClose();
              }}
              disabled={isLoading}
            >
              <Typography variant="body2">{folder.name}</Typography>
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
    </Dialog>
  );
}
