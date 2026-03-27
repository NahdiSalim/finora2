import { Box, IconButton, useTheme } from "@mui/material";
import { Eye, Power, Trash2 } from "lucide-react";

interface UserRowActionsProps {
  isActive: boolean;
  status?: string;
  canWrite: boolean;
  canDelete?: boolean;
  disabled?: boolean;
  onView: () => void;
  onToggleStatus: () => void;
  onDelete?: () => void;
}

export default function UserRowActions({
  isActive,
  status,
  canWrite,
  canDelete = false,
  disabled = false,
  onView,
  onToggleStatus,
  onDelete,
}: UserRowActionsProps) {
  const theme = useTheme();
  const isDisabled = disabled || !canWrite;
  const normalizedStatus = (status || "").toLowerCase();
  const powerColor =
    normalizedStatus === "active"
      ? theme.palette.error.main
      : normalizedStatus === "pending"
        ? theme.palette.warning.main
        : theme.palette.success.main;
  const powerBgHover =
    normalizedStatus === "active"
      ? theme.palette.error.lighter
      : normalizedStatus === "pending"
        ? theme.palette.warning.lighter
        : theme.palette.success.lighter;

  return (
    <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
      <IconButton
        size="small"
        onClick={onView}
        sx={{
          minWidth: 32,
          height: 32,
          p: 0,
          borderRadius: 1.5,
          border: 1,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.background.paper,
          color: theme.palette.text.secondary,
          "&:hover": {
            borderColor: theme.palette.primary.main,
            color: theme.palette.primary.main,
          },
        }}
      >
        <Eye size={18} />
      </IconButton>

      <IconButton
        size="small"
        onClick={onToggleStatus}
        disabled={isDisabled}
        sx={{
          minWidth: 32,
          height: 32,
          p: 0,
          borderRadius: 1.5,
          border: 1,
          borderColor: theme.palette.divider,
          backgroundColor: theme.palette.common.white,
          color: powerColor,
          "&:hover": {
            borderColor: powerColor,
            backgroundColor: powerBgHover,
          },
        }}
      >
        <Power size={18} />
      </IconButton>

      {onDelete && (
        <IconButton
          size="small"
          onClick={onDelete}
          disabled={!canDelete}
          sx={{
            minWidth: 32,
            height: 32,
            p: 0,
            borderRadius: 1.5,
            border: 1,
            borderColor: theme.palette.divider,
            backgroundColor: theme.palette.common.white,
            color: theme.palette.error.main,
            "&:hover": {
              borderColor: theme.palette.error.main,
              backgroundColor: theme.palette.error.lighter,
            },
            "&.Mui-disabled": {
              color: theme.palette.action.disabled,
              borderColor: theme.palette.divider,
            },
          }}
        >
          <Trash2 size={18} />
        </IconButton>
      )}
    </Box>
  );
}
