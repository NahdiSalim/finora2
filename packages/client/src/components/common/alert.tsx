import type { AlertProps } from "@mui/material/Alert";

import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useTheme, alpha } from "@mui/material/styles";
import { Info, AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

export type CustomAlertProps = Omit<AlertProps, "variant"> & {
  title?: string;
  onClose?: () => void;
  variant?: "info" | "warning" | "error" | "success";
};

// Map variant to icon components
const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

export function CustomAlert({
  title,
  children,
  onClose,
  variant = "info",
  ...other
}: CustomAlertProps) {
  const theme = useTheme();

  // Get colors based on variant from theme palette
  const getVariantColors = () => {
    switch (variant) {
      case "info":
        return {
          bg: alpha(theme.palette.info.main, 0.08),
          border: theme.palette.info.main,
          icon: theme.palette.info.main,
          text: theme.palette.info.dark,
          title: theme.palette.info.dark,
        };
      case "warning":
        return {
          bg: alpha(theme.palette.warning.main, 0.08),
          border: theme.palette.warning.main,
          icon: theme.palette.warning.main,
          text: theme.palette.warning.dark,
          title: theme.palette.warning.dark,
        };
      case "error":
        return {
          bg: alpha(theme.palette.error.main, 0.08),
          border: theme.palette.error.main,
          icon: theme.palette.error.main,
          text: theme.palette.error.dark,
          title: theme.palette.error.dark,
        };
      case "success":
        return {
          bg: alpha(theme.palette.success.main, 0.08),
          border: theme.palette.success.main,
          icon: theme.palette.success.main,
          text: theme.palette.success.dark,
          title: theme.palette.success.dark,
        };
      default:
        return {
          bg: alpha(theme.palette.info.main, 0.08),
          border: theme.palette.info.main,
          icon: theme.palette.info.main,
          text: theme.palette.info.dark,
          title: theme.palette.info.dark,
        };
    }
  };

  const colors = getVariantColors();
  const IconComponent = variantIcons[variant];

  // Map our variant to MUI severity
  const severityMap = {
    info: "info",
    warning: "warning",
    error: "error",
    success: "success",
  } as const;

  return (
    <Alert
      icon={<IconComponent size={20} />}
      {...other}
      severity={severityMap[variant]}
      sx={{
        borderRadius: "12px",
        border: "1px solid",
        borderColor: colors.border,
        backgroundColor: colors.bg,
        color: colors.text,
        "& .MuiAlert-icon": {
          color: colors.icon,
          "& svg": {
            strokeWidth: 1.5,
          },
        },
        "& .MuiAlert-message": {
          color: colors.text,
          padding: "4px 0",
        },
        "& .MuiAlertTitle-root": {
          color: colors.title,
          fontWeight: 600,
          fontSize: "0.95rem",
          marginBottom: "4px",
        },
        boxShadow: `0 2px 8px ${alpha(colors.border, 0.15)}`,
        transition: "all 0.2s ease",
        "&:hover": {
          boxShadow: `0 4px 12px ${alpha(colors.border, 0.25)}`,
        },
        ...other.sx,
      }}
      action={
        onClose && (
          <IconButton
            aria-label="close"
            color="inherit"
            size="small"
            onClick={onClose}
            sx={{
              color: colors.text,
              opacity: 0.7,
              "&:hover": {
                opacity: 1,
                backgroundColor: alpha(colors.border, 0.12),
              },
            }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        )
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </Alert>
  );
}
