import { useRef, useState } from "react";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { FileText, Paperclip, CheckSquare, Calendar } from "lucide-react";

type MessageAttachmentButtonProps = {
  disabled?: boolean;
  onFileSelect: (file: File) => void;
  onRequestClick?: () => void;
  onTaskClick?: () => void;
  onAppointmentClick?: () => void;
  recipientType?: "client" | "collaborator" | null;
};

export default function MessageAttachmentButton({
  disabled = false,
  onFileSelect,
  onRequestClick,
  onTaskClick,
  onAppointmentClick,
  recipientType,
}: MessageAttachmentButtonProps) {
  const theme = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const open = Boolean(anchorEl);

  const handleToggleMenu = (event: React.MouseEvent<HTMLElement>) => {
    if (disabled) return;

    if (open) {
      setAnchorEl(null);
    } else {
      setAnchorEl(event.currentTarget);
    }
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleRequestClick = () => {
    onRequestClick?.();
    handleCloseMenu();
  };

  const handleTaskClick = () => {
    onTaskClick?.();
    handleCloseMenu();
  };

  const handleAppointmentClick = () => {
    onAppointmentClick?.();
    handleCloseMenu();
  };

  const handleFileMenuClick = () => {
    fileInputRef.current?.click();
    handleCloseMenu();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    onFileSelect(file);
    event.target.value = "";
  };

  return (
    <>
      <IconButton
        onClick={handleToggleMenu} // 👈 هنا التبديل
        disabled={disabled}
        sx={{
          width: 24,
          height: 24,
          minWidth: 24,
          borderRadius: "6px",
          color: disabled
            ? theme.palette.grey[400]
            : open
              ? (theme.palette.grey as any)[1000]
              : theme.palette.info.light,
          backgroundColor: open ? "#F3F4F6" : "transparent",
          "&:hover": {
            backgroundColor: open ? "#F3F4F6" : "transparent",
          },
          "&.Mui-disabled": {
            color: theme.palette.grey[400],
            backgroundColor: "transparent",
          },
        }}
      >
        {open ? (
          <CloseIcon sx={{ fontSize: 18 }} /> // 👈 X
        ) : (
          <AddIcon sx={{ fontSize: 18 }} /> // 👈 +
        )}
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleCloseMenu}
        anchorOrigin={{
          vertical: "top",
          horizontal: "left",
        }}
        transformOrigin={{
          vertical: "bottom",
          horizontal: "left",
        }}
        PaperProps={{
          sx: {
            ml: -0.5,
            mb: 1,
            minWidth: 236,
            borderRadius: "18px",
            border: "1px solid #EAECEF",
            backgroundColor: "#FFFFFF",
            boxShadow: "0px 16px 40px rgba(16, 24, 40, 0.10)",
            px: 1,
            py: 1,
            overflow: "hidden",
          },
        }}
      >
        {[
          <MenuItem
            key="file"
            onClick={handleFileMenuClick}
            sx={{
              minHeight: 48,
              px: 1.25,
              py: 0.75,
              borderRadius: "14px",
              gap: 1.25,
              "&:hover": {
                backgroundColor: "#F9FAFB",
              },
            }}
          >
            <Box
              sx={{
                width: 22,
                height: 22,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#2F6BFF",
                flexShrink: 0,
              }}
            >
              <Paperclip size={16} strokeWidth={2} />
            </Box>

            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 400,
                lineHeight: "21px",
                color: "#344054",
              }}
            >
              Joindre un fichier
            </Typography>
          </MenuItem>,

          ...(recipientType === "client"
            ? [
                <MenuItem
                  key="request"
                  onClick={handleRequestClick}
                  sx={{
                    minHeight: 48,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: "14px",
                    gap: 1.25,
                    "&:hover": {
                      backgroundColor: "#F9FAFB",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2F6BFF",
                      flexShrink: 0,
                    }}
                  >
                    <FileText size={16} strokeWidth={2} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: "21px",
                      color: "#344054",
                    }}
                  >
                    Joindre une demande
                  </Typography>
                </MenuItem>,

                <MenuItem
                  key="appointment"
                  onClick={handleAppointmentClick}
                  sx={{
                    minHeight: 48,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: "14px",
                    gap: 1.25,
                    "&:hover": {
                      backgroundColor: "#F9FAFB",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2F6BFF",
                      flexShrink: 0,
                    }}
                  >
                    <Calendar size={16} strokeWidth={2} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: "21px",
                      color: "#344054",
                    }}
                  >
                    Joindre un rendez-vous
                  </Typography>
                </MenuItem>,
              ]
            : []),

          ...(recipientType === "collaborator"
            ? [
                <MenuItem
                  key="task"
                  onClick={handleTaskClick}
                  sx={{
                    minHeight: 48,
                    px: 1.25,
                    py: 0.75,
                    borderRadius: "14px",
                    gap: 1.25,
                    "&:hover": {
                      backgroundColor: "#F9FAFB",
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#2F6BFF",
                      flexShrink: 0,
                    }}
                  >
                    <CheckSquare size={16} strokeWidth={2} />
                  </Box>

                  <Typography
                    sx={{
                      fontSize: 14,
                      fontWeight: 400,
                      lineHeight: "21px",
                      color: "#344054",
                    }}
                  >
                    Joindre une tâche
                  </Typography>
                </MenuItem>,
              ]
            : []),
        ]}
      </Menu>

      <input
        ref={fileInputRef}
        type="file"
        hidden
        onChange={handleFileChange}
        disabled={disabled}
      />
    </>
  );
}
