import type { AlertProps } from "@mui/material/Alert";
import type { SnackbarProps } from "@mui/material/Snackbar";

import { useState } from "react";

import {
  Button,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { Info, AlertCircle, AlertTriangle, CheckCircle, X } from "lucide-react";
import Box from "@mui/material/Box";

export type CustomSnackbarProps = SnackbarProps & {
  severity?: AlertProps["severity"] | "default";
  variant?: "info" | "warning" | "error" | "success" | "default";
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
  }>;
  onClose?: () => void;
  title?: string;
};

// Map variant to icon components
const variantIcons = {
  info: Info,
  warning: AlertTriangle,
  error: AlertCircle,
  success: CheckCircle,
};

// Get theme colors based on variant
const getVariantColors = (theme: any, variant: string) => {
  switch (variant) {
    case "info":
      return {
        bg: theme.palette.info.main,
        text: theme.palette.common.white,
      };
    case "warning":
      return {
        bg: theme.palette.secondary.main,
        text: theme.palette.common.white,
      };
    case "error":
      return {
        bg: theme.palette.error.main,
        text: theme.palette.common.white,
      };
    case "success":
      return {
        bg: theme.palette.success.main,
        text: theme.palette.common.white,
      };
    default:
      return {
        bg: theme.palette.grey[900],
        text: theme.palette.common.white,
      };
  }
};

export function CustomSnackbar({
  message,
  title: snackbarTitle,
  severity = "default",
  variant = "default",
  actionButtons,
  onClose,
  open = true,
  autoHideDuration = 5000,
  anchorOrigin = { vertical: "bottom", horizontal: "left" },
  ...other
}: CustomSnackbarProps) {
  const theme = useTheme();

  // Determine which variant to use (severity takes precedence over variant for backward compatibility)
  const activeVariant = severity !== "default" ? severity : variant;
  const colors = getVariantColors(theme, activeVariant);
  const IconComponent =
    activeVariant !== "default"
      ? variantIcons[activeVariant as keyof typeof variantIcons]
      : null;

  // Default snackbar without icon - always dark background
  if (activeVariant === "default") {
    return (
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
        {...other}
      >
        <Paper
          elevation={6}
          sx={{
            bgcolor: colors.bg,
            color: colors.text,
            minWidth: 320,
            maxWidth: 400,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: `0 8px 4px ${alpha(theme.palette.common.black, 0.2)}`,
            ...(actionButtons &&
              actionButtons.length > 0 && {
                height: "auto",
              }),
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            spacing={0}
            sx={{ minHeight: "56px" }}
          >
            <Stack sx={{ flex: 1, px: 2, py: 1.5 }}>
              {snackbarTitle && (
                <Typography
                  variant="caption"
                  fontWeight={600}
                  sx={{ color: colors.text, mb: 0.5 }}
                >
                  {snackbarTitle}
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{ color: alpha(colors.text, 0.9) }}
              >
                {message}
              </Typography>
            </Stack>

            {actionButtons && actionButtons.length > 0 && (
              <>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ borderColor: alpha(colors.text, 0.2) }}
                />
                <Stack direction="column" spacing={0} sx={{ height: "100%" }}>
                  {actionButtons.map((btn, index) => (
                    <Button
                      key={index}
                      color="inherit"
                      size="small"
                      onClick={btn.onClick}
                      sx={{
                        minWidth: "72px",
                        height: "40px",
                        py: 0,
                        px: 2,
                        fontSize: "0.875rem",
                        fontWeight: 600,
                        borderRadius: 0,
                        color: colors.text,
                        "&:hover": {
                          bgcolor: alpha(colors.text, 0.08),
                        },
                      }}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </Stack>
              </>
            )}

            {onClose && !actionButtons && (
              <IconButton
                size="small"
                onClick={onClose}
                sx={{
                  color: alpha(colors.text, 0.7),
                  mr: 1,
                  "&:hover": {
                    color: colors.text,
                    bgcolor: alpha(colors.text, 0.08),
                  },
                }}
              >
                <X size={18} />
              </IconButton>
            )}
          </Stack>
        </Paper>
      </Snackbar>
    );
  }

  // Colored snackbars with icon - using theme colors
  // With action buttons: colored background with divider
  if (actionButtons && actionButtons.length > 0) {
    return (
      <Snackbar
        open={open}
        autoHideDuration={autoHideDuration}
        onClose={onClose}
        anchorOrigin={anchorOrigin}
        {...other}
      >
        <Paper
          elevation={6}
          sx={{
            bgcolor: colors.bg,
            minWidth: 320,
            maxWidth: 400,
            borderRadius: 3,
            overflow: "hidden",
            boxShadow: `0 8px 24px ${alpha(colors.bg, 0.3)}`,
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0}>
            <Stack sx={{ flex: 1, p: 2 }}>
              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                {IconComponent && (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      color: colors.text,
                      flexShrink: 0,
                      mt: 0.25,
                    }}
                  >
                    <IconComponent size={16} strokeWidth={1.5} />
                  </Box>
                )}
                <Box sx={{ flex: 1 }}>
                  {snackbarTitle && (
                    <Typography
                      variant="caption"
                      fontWeight={600}
                      sx={{ color: colors.text, mb: 0.5 }}
                    >
                      {snackbarTitle}
                    </Typography>
                  )}
                  <Typography variant="body2" sx={{ color: colors.text }}>
                    {message}
                  </Typography>
                </Box>
              </Stack>
            </Stack>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ borderColor: alpha(colors.text, 0.2) }}
            />

            <Stack direction="column" spacing={0}>
              {actionButtons.map((btn, index) => (
                <Button
                  key={index}
                  size="small"
                  onClick={btn.onClick}
                  sx={{
                    minWidth: "80px",
                    height: "48px",
                    px: 2,
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    borderRadius: 0,
                    color: colors.text,
                    "&:hover": {
                      bgcolor: alpha(colors.text, 0.08),
                    },
                  }}
                >
                  {btn.label}
                </Button>
              ))}
            </Stack>
          </Stack>
        </Paper>
      </Snackbar>
    );
  }

  // Without action buttons: colored background with close button
  return (
    <Snackbar
      open={open}
      autoHideDuration={autoHideDuration}
      onClose={onClose}
      anchorOrigin={anchorOrigin}
      {...other}
    >
      <Paper
        elevation={6}
        sx={{
          bgcolor: colors.bg,
          minWidth: 320,
          maxWidth: 400,
          borderRadius: 3,
          overflow: "hidden",
          boxShadow: `0 8px 24px ${alpha(colors.bg, 0.3)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2 }}>
          {IconComponent && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: "50%",
                color: colors.text,
                flexShrink: 0,
              }}
            >
              <IconComponent size={16} strokeWidth={1.5} />
            </Box>
          )}

          <Box sx={{ flex: 1 }}>
            {snackbarTitle && (
              <Typography
                variant="caption"
                fontWeight={600}
                sx={{ color: colors.text, mb: 0.25 }}
              >
                {snackbarTitle}
              </Typography>
            )}
            <Typography variant="body2" sx={{ color: colors.text }}>
              {message}
            </Typography>
          </Box>

          {onClose && (
            <IconButton
              size="small"
              onClick={onClose}
              sx={{
                color: alpha(colors.text, 0.7),
                "&:hover": {
                  color: colors.text,
                  bgcolor: alpha(colors.text, 0.08),
                },
              }}
            >
              <X size={18} />
            </IconButton>
          )}
        </Stack>
      </Paper>
    </Snackbar>
  );
}

// ----------------------------------------------------------------------

export type UseSnackbarReturn = {
  open: boolean;
  message: string;
  title?: string;
  severity: AlertProps["severity"] | "default";
  showSnackbar: (
    msg: string,
    sev?: AlertProps["severity"] | "default",
    snackbarTitle?: string,
  ) => void;
  hideSnackbar: () => void;
};

export function useSnackbar(): UseSnackbarReturn {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState<string | undefined>();
  const [severity, setSeverity] = useState<AlertProps["severity"] | "default">(
    "info",
  );

  const showSnackbar = (
    msg: string,
    sev: AlertProps["severity"] | "default" = "info",
    snackbarTitle?: string,
  ) => {
    setMessage(msg);
    setSeverity(sev);
    setTitle(snackbarTitle);
    setOpen(true);
  };

  const hideSnackbar = () => {
    setOpen(false);
    setTitle(undefined);
  };

  return {
    open,
    message,
    title,
    severity,
    showSnackbar,
    hideSnackbar,
  };
}
