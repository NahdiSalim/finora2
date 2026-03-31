import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  TextField,
  Avatar,
  Checkbox,
  useTheme,
  useMediaQuery,
  alpha,
} from "@mui/material";
import { X, Users, Search } from "lucide-react";
import CustomButton from "../../../../components/common/CustomButton";
import { availableClients, availableCollaborators } from "../data/mock";
import type { GroupMember } from "../data/types";

type CreateGroupModalProps = {
  open: boolean;
  onClose: () => void;
  onCreate: (groupName: string, members: number[]) => void;
};

export default function CreateGroupModal({
  open,
  onClose,
  onCreate,
}: CreateGroupModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [groupName, setGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(
    new Set(),
  );
  const [searchTerm, setSearchTerm] = useState("");

  console.log("[CreateGroupModal] Render state:", { open, isMobile });

  const handleClose = () => {
    setGroupName("");
    setSelectedMembers(new Set());
    setSearchTerm("");
    onClose();
  };

  const handleToggleMember = (id: number) => {
    setSelectedMembers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleCreate = () => {
    if (!groupName.trim() || selectedMembers.size === 0) return;
    onCreate(groupName.trim(), Array.from(selectedMembers));
    handleClose();
  };

  const filteredClients = availableClients.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredCollaborators = availableCollaborators.filter((c) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const selectedCount = selectedMembers.size;
  const canCreate = groupName.trim() && selectedCount > 0;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth={isMobile}
      disablePortal={false}
      disableScrollLock
      transitionDuration={0}
      slotProps={{
        backdrop: {
          sx: {
            zIndex: 9998,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          timeout: 0,
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          width: isMobile ? "100%" : "auto",
          minWidth: isMobile ? "100%" : "600px",
          height: isMobile ? "100vh" : "auto",
          maxHeight: isMobile ? "100vh" : "90vh",
          maxWidth: "100%",
          m: isMobile ? 0 : 3,
          zIndex: 9999,
          position: "relative",
        },
      }}
      sx={{
        zIndex: "9999 !important",
        position: "fixed",
        "& .MuiDialog-container": {
          zIndex: 9999,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 1 : 1.5,
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 2.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
        }}
      >
        {!isMobile && (
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "12px",
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: theme.palette.primary.main,
            }}
          >
            <Users size={20} />
          </Box>
        )}
        <Typography
          variant="h6"
          sx={{
            flex: 1,
            fontWeight: 700,
            fontSize: isMobile ? 16 : 19,
            color: theme.palette.text.primary,
          }}
        >
          Créer un groupe
        </Typography>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": {
              bgcolor: theme.palette.action.hover,
            },
          }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      {/* Content */}
      <DialogContent
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 3,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Group Name Input */}
        <Box sx={{ mb: isMobile ? 2 : 3 }}>
          <Typography
            sx={{
              fontSize: isMobile ? 13 : 14,
              fontWeight: 600,
              color: theme.palette.text.primary,
              mb: isMobile ? 0.75 : 1,
            }}
          >
            Nom du groupe
          </Typography>
          <TextField
            fullWidth
            placeholder="Ex: Équipe Comptabilité 2026"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            size={isMobile ? "small" : "medium"}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                fontSize: isMobile ? 13 : 14,
              },
            }}
          />
        </Box>

        {/* Selected Count */}
        {selectedCount > 0 && (
          <Box
            sx={{
              mb: 2,
              px: isMobile ? 1.5 : 2,
              py: isMobile ? 1 : 1.25,
              borderRadius: "12px",
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: theme.palette.primary.main,
              }}
            >
              {selectedCount} membre{selectedCount > 1 ? "s" : ""} sélectionné
              {selectedCount > 1 ? "s" : ""}
            </Typography>
          </Box>
        )}

        {/* Search */}
        <Box sx={{ mb: isMobile ? 2 : 3 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher un membre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ mr: 1, display: "flex", color: "text.secondary" }}>
                  <Search size={isMobile ? 16 : 18} />
                </Box>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px",
                fontSize: isMobile ? 13 : 14,
              },
            }}
          />
        </Box>

        {/* Clients and Collaborators Side by Side */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: isMobile ? 2 : 3,
          }}
        >
          {/* Clients Section */}
          {filteredClients.length > 0 && (
            <Box>
              <Typography
                sx={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 700,
                  color: theme.palette.text.secondary,
                  mb: isMobile ? 1 : 1.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Clients ({filteredClients.length})
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 0.5 : 0.75,
                }}
              >
                {filteredClients.map((client) => (
                  <MemberItem
                    key={client.id}
                    member={client}
                    selected={selectedMembers.has(client.id)}
                    onToggle={() => handleToggleMember(client.id)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Collaborators Section */}
          {filteredCollaborators.length > 0 && (
            <Box>
              <Typography
                sx={{
                  fontSize: isMobile ? 12 : 13,
                  fontWeight: 700,
                  color: theme.palette.text.secondary,
                  mb: isMobile ? 1 : 1.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Collaborateurs ({filteredCollaborators.length})
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 0.5 : 0.75,
                }}
              >
                {filteredCollaborators.map((collab) => (
                  <MemberItem
                    key={collab.id}
                    member={collab}
                    selected={selectedMembers.has(collab.id)}
                    onToggle={() => handleToggleMember(collab.id)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* No results */}
        {filteredClients.length === 0 && filteredCollaborators.length === 0 && (
          <Box
            sx={{
              py: 6,
              textAlign: "center",
            }}
          >
            <Typography
              sx={{
                fontSize: 14,
                color: theme.palette.text.disabled,
                fontStyle: "italic",
                mb: 0.5,
              }}
            >
              Aucun membre trouvé
            </Typography>
            {searchTerm && (
              <Typography
                sx={{
                  fontSize: 12,
                  color: theme.palette.text.disabled,
                }}
              >
                Essayez une autre recherche
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 1.5 : 2,
          borderTop: `1px solid ${theme.palette.divider}`,
          gap: isMobile ? 1 : 1.5,
          flexShrink: 0,
        }}
      >
        <CustomButton
          fullWidth
          variant="outlined"
          color="info"
          onClick={handleClose}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
            py: isMobile ? 1.25 : 1.5,
            fontSize: isMobile ? 13 : 14,
          }}
        >
          Annuler
        </CustomButton>
        <CustomButton
          fullWidth
          variant="contained"
          color="primary"
          onClick={handleCreate}
          disabled={!canCreate}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
            boxShadow: "none",
            py: isMobile ? 1.25 : 1.5,
            fontSize: isMobile ? 13 : 14,
          }}
        >
          Créer le groupe
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}

// ── Member Item Component ─────────────────────────────────────────────────────

type MemberItemProps = {
  member: GroupMember;
  selected: boolean;
  onToggle: () => void;
};

function MemberItem({ member, selected, onToggle }: MemberItemProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const roleColor =
    member.role === "client"
      ? theme.palette.primary.main
      : theme.palette.secondary.main;

  return (
    <Box
      onClick={onToggle}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 1 : 1.5,
        px: isMobile ? 1 : 1.5,
        py: isMobile ? 1 : 1.25,
        borderRadius: isMobile ? "10px" : "12px",
        cursor: "pointer",
        transition: "all 0.2s",
        bgcolor: selected
          ? alpha(theme.palette.primary.main, 0.08)
          : theme.palette.background.paper,
        border: `1px solid ${
          selected
            ? alpha(theme.palette.primary.main, 0.4)
            : theme.palette.divider
        }`,
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transform: isMobile ? "none" : "translateY(-1px)",
          boxShadow: isMobile
            ? "none"
            : selected
              ? theme.shadows[3]
              : theme.shadows[2],
        },
        "&:active": {
          transform: "translateY(0)",
        },
      }}
    >
      <Checkbox
        checked={selected}
        sx={{
          p: 0,
          color: theme.palette.grey[400],
          "&.Mui-checked": {
            color: theme.palette.primary.main,
          },
        }}
      />

      <Avatar
        sx={{
          width: isMobile ? 34 : 38,
          height: isMobile ? 34 : 38,
          fontSize: isMobile ? 13 : 14,
          fontWeight: 600,
          bgcolor: alpha(roleColor, 0.15),
          color: roleColor,
        }}
      >
        {member.avatar}
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: isMobile ? 14 : 14,
            fontWeight: selected ? 600 : 500,
            color: theme.palette.text.primary,
            mb: isMobile ? 0 : 0.25,
          }}
        >
          {member.name}
        </Typography>
        {!isMobile && (
          <Typography
            sx={{
              fontSize: 12,
              fontWeight: 500,
              color: theme.palette.text.secondary,
            }}
          >
            {member.role === "client" ? "Client" : "Collaborateur"}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
