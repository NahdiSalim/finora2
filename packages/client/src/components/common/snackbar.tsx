import type { AlertProps } from '@mui/material/Alert';
import type { SnackbarProps } from '@mui/material/Snackbar';

import { useState } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import {
  Alert,
  Button,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Typography,
} from '@mui/material';

export type CustomSnackbarProps = SnackbarProps & {
  severity?: AlertProps['severity'] | 'default';
  variant?: AlertProps['variant'];
  actionButtons?: Array<{
    label: string;
    onClick: () => void;
  }>;
  onClose?: () => void;
};

export function CustomSnackbar({
  message,
  severity = 'default',
  actionButtons,
  onClose,
  open = true,
  autoHideDuration = 5000,
  anchorOrigin = { vertical: 'bottom', horizontal: 'left' },
  ...other
}: CustomSnackbarProps) {
  // Default snackbar without icon - always dark background
  if (severity === 'default') {
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
            bgcolor: 'rgba(33, 43, 54, 1)',
            color: 'white',
            minWidth: '288px',
            borderRadius: '8px',
            overflow: 'hidden',
            ...(actionButtons &&
              actionButtons.length > 0 && {
                height: '64px',
              }),
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0} sx={{ height: '100%' }}>
            <Typography variant="body2" sx={{ flex: 1, px: 2, py: 1.5 }}>
              {message}
            </Typography>
            {actionButtons && actionButtons.length > 0 && (
              <>
                <Divider
                  orientation="vertical"
                  flexItem
                  sx={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}
                />
                <Stack direction="column" spacing={0} sx={{ height: '100%' }}>
                  {actionButtons.map((btn, index) => (
                    <Button
                      key={index}
                      color="inherit"
                      size="small"
                      onClick={btn.onClick}
                      sx={{
                        width: '64px',
                        minWidth: '64px',
                        height: '32px',
                        py: 0,
                        px: 1,
                        fontSize: '0.875rem',
                        borderRadius: 0,
                        '&:hover': {
                          bgcolor: 'rgba(255, 255, 255, 0.08)',
                        },
                        ...(index === 0 && {
                          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
                        }),
                      }}
                    >
                      {btn.label}
                    </Button>
                  ))}
                </Stack>
              </>
            )}
            {onClose && !actionButtons && (
              <IconButton size="small" onClick={onClose} sx={{ color: 'white', mr: 1 }}>
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </Stack>
        </Paper>
      </Snackbar>
    );
  }

  // Colored snackbars with icon - always white background
  // With action buttons: white background with divider (no close button)
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
            bgcolor: 'rgba(255, 255, 255, 1)',
            minWidth: '288px',
            borderRadius: 1,
            overflow: 'hidden',
          }}
        >
          <Stack direction="row" alignItems="center" spacing={0}>
            <Alert
              severity={severity as AlertProps['severity']}
              variant="standard"
              sx={{
                flex: 1,
                border: 'none',
                bgcolor: 'transparent',
                py: 1,
                px: 2,
                alignItems: 'center',
                '& .MuiAlert-icon': {
                  py: 0,
                  alignItems: 'center',
                },
                '& .MuiAlert-message': {
                  py: 0,
                  display: 'flex',
                  alignItems: 'center',
                },
              }}
            >
              {message}
            </Alert>
            <Divider orientation="vertical" flexItem sx={{ my: 1 }} />
            <Stack direction="column" spacing={0}>
              {actionButtons.map((btn, index) => (
                <Button
                  key={index}
                  size="small"
                  onClick={btn.onClick}
                  sx={{
                    minWidth: '60px',
                    py: 1,
                    px: 2,
                    fontSize: '0.875rem',
                    borderRadius: 0,
                    color: 'text.primary',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.04)',
                    },
                    ...(index === 0 && {
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                    }),
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

  // Without action buttons: white background with standard variant
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
          bgcolor: 'rgba(255, 255, 255, 1)',
          minWidth: '288px',
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Alert
          severity={severity}
          variant="standard"
          sx={{
            width: '100%',
            border: 'none',
            bgcolor: 'transparent',
            alignItems: 'center',
            '& .MuiAlert-icon': {
              py: 0,
              alignItems: 'center',
            },
            '& .MuiAlert-message': {
              py: 0,
              display: 'flex',
              alignItems: 'center',
            },
          }}
          onClose={onClose}
        >
          {message}
        </Alert>
      </Paper>
    </Snackbar>
  );
}

// ----------------------------------------------------------------------

export type UseSnackbarReturn = {
  open: boolean;
  message: string;
  severity: AlertProps['severity'];
  showSnackbar: (msg: string, sev?: AlertProps['severity']) => void;
  hideSnackbar: () => void;
};

export function useSnackbar(): UseSnackbarReturn {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<AlertProps['severity']>('info');

  const showSnackbar = (msg: string, sev: AlertProps['severity'] = 'info') => {
    setMessage(msg);
    setSeverity(sev);
    setOpen(true);
  };

  const hideSnackbar = () => {
    setOpen(false);
  };

  return {
    open,
    message,
    severity,
    showSnackbar,
    hideSnackbar,
  };
}
