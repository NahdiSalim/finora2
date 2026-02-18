import { useState, useEffect } from 'react';
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';

import { Iconify } from 'src/components/iconify';

interface TableToolbarProps {
  numSelected?: number;
  filterValue?: string;
  onFilterChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onDelete?: () => void;
  deleteButtonText?: string;
  maxWidth?: number;
  debounceDelay?: number;
  onResetPage?: () => void;

  actions?: React.ReactNode;
  filters?: React.ReactNode;
}

export function DataTableToolbar({
  numSelected = 0,
  filterValue = '',
  onFilterChange,
  placeholder = 'Search...',
  onDelete,
  deleteButtonText,
  maxWidth = 320,
  debounceDelay = 500,
  onResetPage,
  actions,
  filters,
}: TableToolbarProps) {
  const [localValue, setLocalValue] = useState(filterValue);

  useEffect(() => {
    setLocalValue(filterValue);
  }, [filterValue]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== filterValue && onFilterChange) {
        const syntheticEvent = {
          target: { value: localValue },
        } as React.ChangeEvent<HTMLInputElement>;
        onFilterChange(syntheticEvent);
        if (onResetPage) {
          onResetPage();
        }
      }
    }, debounceDelay);

    return () => clearTimeout(timer);
  }, [localValue, debounceDelay, filterValue, onFilterChange, onResetPage]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(event.target.value);
  };
  return (
    <Toolbar
      sx={{
        height: '110px',
        display: 'flex',
        justifyContent: 'space-between',
        p: (theme) => theme.spacing(0, 1, 0, 3),
        ...(numSelected > 0 && {
          color: 'primary.main',
          bgcolor: 'primary.lighter',
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography component="div" variant="subtitle1">
          {numSelected} {numSelected > 1 ? 'sélectionnés' : 'sélectionné'}
        </Typography>
      ) : (
        <>
          {onFilterChange && (
            <OutlinedInput
              fullWidth
              value={localValue}
              onChange={handleInputChange}
              placeholder={placeholder}
              startAdornment={
                <InputAdornment position="start">
                  <Iconify width={20} icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              }
              sx={{ maxWidth }}
            />
          )}
          {filters}
        </>
      )}

      {numSelected > 0 && (
        <>
          {onDelete && (
            <>
              {deleteButtonText ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={onDelete}
                  startIcon={<CurrencyExchangeIcon />}
                >
                  {deleteButtonText}
                </Button>
              ) : (
                <Tooltip title="supprimer">
                  <IconButton onClick={onDelete}>
                    <Iconify icon="solar:trash-bin-trash-bold" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
          {actions}
        </>
      )}
    </Toolbar>
  );
}
