import { useState, useEffect } from "react";
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
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  useTheme,
  useMediaQuery,
  alpha,
  Chip,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  X,
  Users,
  Edit2,
  UserPlus,
  MoreVertical,
  Trash2,
  Check,
  Search,
} from "lucide-react";
import CustomButton from "../../../../components/common/CustomButton";
import type { GroupMember } from "../data/types";

type GroupManagementModalProps = {
  open: boolean;
  onClose: () => void;
  groupId: number | null;
  initialGroupName: string;
  initialMembers: GroupMember[];
  onUpdate: (groupName: string, members: GroupMember[]) => void;
  /** If true, the current user can remove members from the group */
  isAdmin?: boolean;
  /** Real contacts available to add (falls back to mock if not provided) */
  clients?: GroupMember[];
  collaborators?: GroupMember[];
};

export default function GroupManagementModal({
  open,
  onClose,
  groupId: _groupId,
  initialGroupName,
  initialMembers,
  onUpdate,
  isAdmin = false,
  clients,
  collaborators,
}: GroupManagementModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [isEditingName, setIsEditingName] = useState(false);
  const [groupName, setGroupName] = useState(initialGroupName);
  const [members, setMembers] = useState<GroupMember[]>(initialMembers);
  const [openAddMemberMenu, setOpenAddMemberMenu] = useState(false);
  const [memberMenuAnchor, setMemberMenuAnchor] = useState<null | HTMLElement>(
    null,
  );
  const [selectedMemberForMenu, setSelectedMemberForMenu] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (open) {
      setGroupName(initialGroupName);
      setMembers(initialMembers);
      setIsEditingName(false);
    }
  }, [open, initialGroupName, initialMembers]);

  const handleClose = () => {
    setIsEditingName(false);
    setOpenAddMemberMenu(false);
    onClose();
  };

  const handleSave = () => {
    if (!groupName.trim() || members.length === 0) return;
    onUpdate(groupName.trim(), members);
    handleClose();
  };

  const handleSaveGroupName = () => {
    setIsEditingName(false);
  };

  const handleAddMember = (newMember: GroupMember) => {
    if (!members.find((m) => m.id === newMember.id)) {
      setMembers([...members, newMember]);
    }
    setOpenAddMemberMenu(false);
  };

  const handleRemoveMember = (memberId: number) => {
    setMembers(members.filter((m) => m.id !== memberId));
    setMemberMenuAnchor(null);
  };

  const handleOpenMemberMenu = (
    event: React.MouseEvent<HTMLElement>,
    memberId: number,
  ) => {
    setMemberMenuAnchor(event.currentTarget);
    setSelectedMemberForMenu(memberId);
  };

  const handleCloseMemberMenu = () => {
    setMemberMenuAnchor(null);
    setSelectedMemberForMenu(null);
  };

  const allAvailableMembers = [...(clients ?? []), ...(collaborators ?? [])];
  const availableToAdd = allAvailableMembers.filter(
    (u) => !members.find((m) => m.id === u.id),
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullScreen={isMobile}
      maxWidth="sm"
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
          minWidth: isMobile ? "100%" : "500px",
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
          Gérer le groupe
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
        {/* Group Name Section */}
        <Box sx={{ mb: isMobile ? 2 : 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: isMobile ? 0.75 : 1,
            }}
          >
            <Typography
              sx={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: 700,
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Nom du groupe
            </Typography>
            {!isEditingName && (
              <IconButton
                size="small"
                onClick={() => setIsEditingName(true)}
                sx={{
                  color: theme.palette.primary.main,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                  },
                }}
              >
                <Edit2 size={isMobile ? 14 : 16} />
              </IconButton>
            )}
          </Box>

          {isEditingName ? (
            <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
              <TextField
                fullWidth
                size="small"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "10px",
                    fontSize: isMobile ? 13 : 14,
                  },
                }}
              />
              <IconButton
                size="small"
                onClick={handleSaveGroupName}
                sx={{
                  color: theme.palette.success.main,
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  "&:hover": {
                    bgcolor: alpha(theme.palette.success.main, 0.2),
                  },
                }}
              >
                <Check size={18} />
              </IconButton>
            </Box>
          ) : (
            <Typography
              sx={{
                fontSize: isMobile ? 15 : 16,
                fontWeight: 600,
                color: theme.palette.text.primary,
                px: isMobile ? 1.25 : 1.5,
                py: isMobile ? 0.875 : 1,
                borderRadius: "10px",
                bgcolor: theme.palette.grey[100],
              }}
            >
              {groupName}
            </Typography>
          )}
        </Box>

        {/* Members Section */}
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: isMobile ? 1 : 1.5,
            }}
          >
            <Typography
              sx={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: 700,
                color: theme.palette.text.secondary,
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              Membres ({members.length})
            </Typography>
            <CustomButton
              variant="text"
              color="primary"
              onClick={() => setOpenAddMemberMenu(true)}
              sx={{
                textTransform: "none",
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                gap: 0.5,
                py: isMobile ? 0.375 : 0.5,
                px: isMobile ? 1 : 1.25,
                borderRadius: "8px",
                minWidth: "auto",
              }}
            >
              <UserPlus size={isMobile ? 14 : 16} />
              Ajouter
            </CustomButton>
          </Box>

          <List sx={{ p: 0 }}>
            {members.map((member, index) => {
              const roleColor =
                member.role === "client"
                  ? theme.palette.primary.main
                  : member.role === "comptable"
                    ? theme.palette.warning.main
                    : theme.palette.secondary.main;

              return (
                <ListItem
                  key={member.id}
                  sx={{
                    px: isMobile ? 1 : 1.5,
                    py: isMobile ? 1 : 1.25,
                    borderRadius: isMobile ? "10px" : "12px",
                    mb:
                      index < members.length - 1 ? (isMobile ? 0.5 : 0.75) : 0,
                    border: `1px solid ${theme.palette.divider}`,
                    bgcolor: theme.palette.background.paper,
                    transition: "all 0.2s",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.04),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                      boxShadow: isMobile ? "none" : theme.shadows[1],
                    },
                  }}
                  secondaryAction={
                    isAdmin ? (
                      <IconButton
                        edge="end"
                        size="small"
                        onClick={(e) => handleOpenMemberMenu(e, member.id)}
                        sx={{
                          color: theme.palette.text.secondary,
                          "&:hover": {
                            bgcolor: alpha(theme.palette.error.main, 0.08),
                            color: theme.palette.error.main,
                          },
                        }}
                      >
                        <MoreVertical size={isMobile ? 16 : 18} />
                      </IconButton>
                    ) : undefined
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        fontSize: isMobile ? 13 : 14,
                        fontWeight: 600,
                        bgcolor: alpha(roleColor, 0.15),
                        color: roleColor,
                      }}
                    >
                      {member.avatar}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography
                        sx={{
                          fontSize: isMobile ? 14 : 14,
                          fontWeight: 600,
                          color: theme.palette.text.primary,
                          mb: isMobile ? 0.25 : 0.5,
                        }}
                      >
                        {member.name}
                      </Typography>
                    }
                    secondary={
                      <Chip
                        label={
                          member.role === "client"
                            ? "Client"
                            : member.role === "comptable"
                              ? "Comptable"
                              : "Collaborateur"
                        }
                        size="small"
                        sx={{
                          height: isMobile ? 18 : 20,
                          fontSize: isMobile ? 10 : 11,
                          fontWeight: 600,
                          bgcolor: alpha(roleColor, 0.1),
                          color: roleColor,
                          border: `1px solid ${alpha(roleColor, 0.2)}`,
                          "& .MuiChip-label": {
                            px: isMobile ? 0.75 : 1,
                          },
                        }}
                      />
                    }
                  />
                </ListItem>
              );
            })}
          </List>
        </Box>
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
          onClick={handleSave}
          disabled={!groupName.trim() || members.length === 0}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
            boxShadow: "none",
            py: isMobile ? 1.25 : 1.5,
            fontSize: isMobile ? 13 : 14,
          }}
        >
          Enregistrer
        </CustomButton>
      </DialogActions>

      {/* Add Member Menu */}
      {openAddMemberMenu && (
        <AddMemberDialog
          open={openAddMemberMenu}
          onClose={() => setOpenAddMemberMenu(false)}
          availableMembers={availableToAdd}
          onAdd={handleAddMember}
        />
      )}

      {/* Member Context Menu */}
      <Menu
        anchorEl={memberMenuAnchor}
        open={Boolean(memberMenuAnchor)}
        onClose={handleCloseMemberMenu}
        sx={{ zIndex: 10001 }}
        PaperProps={{
          sx: {
            minWidth: 180,
            borderRadius: 2,
            boxShadow: theme.shadows[8],
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (selectedMemberForMenu) {
              handleRemoveMember(selectedMemberForMenu);
            }
          }}
          sx={{
            color: theme.palette.error.main,
            gap: 1.5,
            py: 1.25,
            px: 2,
          }}
        >
          <Trash2 size={16} />
          Retirer du groupe
        </MenuItem>
      </Menu>
    </Dialog>
  );
}

// ── Add Member Dialog ─────────────────────────────────────────────────────────

type AddMemberDialogProps = {
  open: boolean;
  onClose: () => void;
  availableMembers: GroupMember[];
  onAdd: (member: GroupMember) => void;
};

function AddMemberDialog({
  open,
  onClose,
  availableMembers,
  onAdd,
}: AddMemberDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [searchTerm, setSearchTerm] = useState("");

  const filteredMembers = availableMembers.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const clients = filteredMembers.filter((m) => m.role === "client");
  const collaborators = filteredMembers.filter(
    (m) => m.role === "collaborateur",
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="md"
      fullWidth={isMobile}
      disablePortal={false}
      disableScrollLock
      transitionDuration={0}
      slotProps={{
        backdrop: {
          sx: {
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
          },
          timeout: 0,
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          width: isMobile ? "100%" : "auto",
          minWidth: isMobile ? "100%" : "700px",
          height: isMobile ? "100vh" : "auto",
          maxHeight: isMobile ? "100vh" : "85vh",
          maxWidth: "100%",
          m: isMobile ? 0 : 3,
          zIndex: 10000,
          position: "relative",
        },
      }}
      sx={{
        zIndex: "10000 !important",
        position: "fixed",
        "& .MuiDialog-container": {
          zIndex: 10000,
        },
      }}
    >
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
            <UserPlus size={20} />
          </Box>
        )}
        <Typography
          variant="h6"
          sx={{
            flex: 1,
            fontWeight: 700,
            fontSize: isMobile ? 16 : 18,
          }}
        >
          Ajouter un membre
        </Typography>
        <IconButton
          onClick={onClose}
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

      <DialogContent
        sx={{
          px: isMobile ? 2 : 3,
          py: isMobile ? 2 : 3,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* Search */}
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
            mb: isMobile ? 2 : 3,
            "& .MuiOutlinedInput-root": {
              borderRadius: "12px",
              fontSize: isMobile ? 13 : 14,
            },
          }}
        />

        {/* Results Count */}
        {filteredMembers.length > 0 && (
          <Box
            sx={{
              mb: isMobile ? 1.5 : 2,
              px: isMobile ? 1.5 : 2,
              py: isMobile ? 0.875 : 1,
              borderRadius: "10px",
              bgcolor: alpha(theme.palette.info.main, 0.08),
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
          >
            <Typography
              sx={{
                fontSize: isMobile ? 12 : 13,
                fontWeight: 600,
                color: theme.palette.info.main,
              }}
            >
              {filteredMembers.length} membre
              {filteredMembers.length > 1 ? "s" : ""} disponible
              {filteredMembers.length > 1 ? "s" : ""}
            </Typography>
          </Box>
        )}

        {/* Available Members - Side by Side */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: isMobile ? 2 : 3,
          }}
        >
          {/* Clients Section */}
          {clients.length > 0 && (
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
                Clients ({clients.length})
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 0.5 : 0.75,
                }}
              >
                {clients.map((member) => (
                  <MemberSelectItem
                    key={member.id}
                    member={member}
                    onAdd={() => onAdd(member)}
                  />
                ))}
              </Box>
            </Box>
          )}

          {/* Collaborators Section */}
          {collaborators.length > 0 && (
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
                Collaborateurs ({collaborators.length})
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: isMobile ? 0.5 : 0.75,
                }}
              >
                {collaborators.map((member) => (
                  <MemberSelectItem
                    key={member.id}
                    member={member}
                    onAdd={() => onAdd(member)}
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>

        {/* No results */}
        {filteredMembers.length === 0 && (
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
              {availableMembers.length === 0
                ? "Tous les membres ont déjà été ajoutés"
                : "Aucun membre trouvé"}
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
    </Dialog>
  );
}

// ── Member Select Item ────────────────────────────────────────────────────────

type MemberSelectItemProps = {
  member: GroupMember;
  onAdd: () => void;
};

function MemberSelectItem({ member, onAdd }: MemberSelectItemProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const roleColor =
    member.role === "client"
      ? theme.palette.primary.main
      : member.role === "comptable"
        ? theme.palette.warning.main
        : theme.palette.secondary.main;

  return (
    <Box
      onClick={onAdd}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: isMobile ? 1 : 1.5,
        px: isMobile ? 1 : 1.5,
        py: isMobile ? 1 : 1.25,
        borderRadius: isMobile ? "10px" : "12px",
        cursor: "pointer",
        transition: "all 0.2s",
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: theme.palette.background.paper,
        "&:hover": {
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
          transform: isMobile ? "none" : "translateY(-1px)",
          boxShadow: isMobile ? "none" : theme.shadows[2],
        },
        "&:active": {
          transform: "translateY(0)",
        },
      }}
    >
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
            fontWeight: 600,
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
            {member.role === "client"
              ? "Client"
              : member.role === "comptable"
                ? "Comptable"
                : "Collaborateur"}
          </Typography>
        )}
      </Box>

      <Box
        sx={{
          width: isMobile ? 28 : 28,
          height: isMobile ? 28 : 28,
          borderRadius: "8px",
          bgcolor: alpha(theme.palette.primary.main, 0.1),
          color: theme.palette.primary.main,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <UserPlus size={16} />
      </Box>
    </Box>
  );
}
