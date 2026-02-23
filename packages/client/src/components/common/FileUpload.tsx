import { useCallback, useState, useEffect } from 'react';

import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Typography, Button, styled } from '@mui/material';

const SUPPORTED_IMAGE_FORMATS = ['image/jpg', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

export type FileUploadProps = {
  label?: string;
  onFileChange?: (file: File | null) => void;
  accept?: string;
  preview?: string;
  maxSize?: number;
  supportedFormats?: string[];
  error?: boolean;
  helperText?: string;
  required?: boolean;
};

export function FileUpload({
  label = 'Profile Photo',
  onFileChange,
  accept = 'image/*',
  preview,
  maxSize = MAX_FILE_SIZE,
  supportedFormats = SUPPORTED_IMAGE_FORMATS,
  error: externalError = false,
  helperText,
  required = false,
}: FileUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string>(preview || '');
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (preview) {
      setPreviewUrl(preview);
    }
  }, [preview]);

  const validateFile = (file: File): string | null => {
    if (file.size > maxSize) {
      return `File is too large. Maximum size: ${maxSize / (1024 * 1024)}MB`;
    }

    if (!supportedFormats.includes(file.type)) {
      return `Unsupported file format. Accepted formats: ${supportedFormats.map((f) => f.split('/')[1]).join(', ')}`;
    }

    return null;
  };

  const handleFileChange = (file: File) => {
    setError('');

    // Validation du fichier
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    onFileChange?.(file);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  const handleRemoveFile = useCallback(() => {
    setPreviewUrl('');
    setError('');
    onFileChange?.(null);
  }, [onFileChange]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileChange(file);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <Button
        component="label"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        disabled={!!previewUrl}
        sx={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          border: '2px dashed',
          borderColor:
            error || externalError
              ? 'error.main'
              : isDragging
                ? 'rgba(145, 158, 171, 0.5)'
                : 'rgba(145, 158, 171, 0.32)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: previewUrl ? 'default' : 'pointer',
          bgcolor: 'transparent',
          transition: 'all 0.3s ease',
          position: 'relative',
          overflow: 'hidden',
          padding: '12px',
          boxSizing: 'border-box',
          minWidth: 'unset',
          textTransform: 'none',
          '&:hover': {
            borderColor:
              error || externalError
                ? 'error.main'
                : previewUrl
                  ? 'rgba(145, 158, 171, 0.32)'
                  : 'rgba(145, 158, 171, 0.5)',
            bgcolor: 'transparent',
          },
          '&.Mui-disabled': {
            bgcolor: 'transparent',
            borderColor: 'rgba(145, 158, 171, 0.32)',
          },
        }}
      >
        {!previewUrl && (
          <VisuallyHiddenInput accept={accept} type="file" onChange={handleInputChange} />
        )}
        <Box
          sx={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            bgcolor: isDragging ? 'rgba(145, 158, 171, 0.12)' : 'rgba(145, 158, 171, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {previewUrl ? (
            <Box
              component="img"
              src={previewUrl}
              alt="Preview"
              sx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          ) : (
            <>
              <Box
                component="img"
                src="/assets/Iconupload.png"
                alt="Upload"
                sx={{
                  width: 48,
                  height: 48,
                  mb: 1,
                }}
              />
              <Typography
                variant="body2"
                sx={{
                  color: error || externalError ? 'error.main' : 'text.secondary',
                  textAlign: 'center',
                  px: 2,
                }}
              >
                {label}
                {required && ' *'}
              </Typography>
            </>
          )}
        </Box>
      </Button>
      {previewUrl && (
        <IconButton
          onClick={handleRemoveFile}
          sx={{
            position: 'absolute',
            top: +15,
            right: +15,
            backgroundColor: 'error.main',
            color: 'white',
            width: 26,
            height: 26,
            zIndex: 10,
            '&:hover': {
              backgroundColor: 'error.dark',
            },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      )}
      {(error || helperText) && (
        <Typography
          variant="caption"
          sx={{
            color: 'error.main',
            mt: 1,
            display: 'block',
            textAlign: 'center',
          }}
        >
          {error || helperText}
        </Typography>
      )}
    </Box>
  );
}
