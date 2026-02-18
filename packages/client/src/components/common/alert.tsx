import type { AlertProps } from '@mui/material/Alert';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export type CustomAlertProps = AlertProps & {
  title?: string;
  onClose?: () => void;
};

export function CustomAlert({ title, children, onClose, ...other }: CustomAlertProps) {
  return (
    <Alert
      {...other}
      sx={{
        borderRadius: '8px',
        ...other.sx,
      }}
      action={
        onClose && (
          <IconButton aria-label="close" color="inherit" size="small" onClick={onClose}>
            <CloseIcon fontSize="inherit" />
          </IconButton>
        )
      }
    >
      {title && <AlertTitle>{title}</AlertTitle>}
      {children}
    </Alert>
  );
}
