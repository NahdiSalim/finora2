import { Box, Button } from '@mui/material';
import DotSpinner from './DotSpinner';

interface FormButtonsProps {
  onCancel: () => void;
  isLoading?: boolean;
  isEdit?: boolean;
  cancelLabel?: string;
  submitLabel?: string;
  disabled?: boolean;
}

export function FormButtons({
  onCancel,
  isLoading = false,
  isEdit = false,
  cancelLabel = 'Cancel',
  submitLabel,
  disabled = false,
}: FormButtonsProps) {
  const defaultSubmitLabel = isEdit ? 'Update' : 'Add';

  return (
    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
      <Button
        variant="outlined"
        color="inherit"
        onClick={onCancel}
        disabled={isLoading}
        sx={{ borderColor: 'rgba(145, 158, 171, 0.32)' }}
      >
        {cancelLabel}
      </Button>
      <Button
        type="submit"
        variant="contained"
        color="primary"
        disabled={isLoading || disabled}
        sx={{ minWidth: 120 }}
      >
        {isLoading ? <DotSpinner size={20} /> : submitLabel || defaultSubmitLabel}
      </Button>
    </Box>
  );
}
