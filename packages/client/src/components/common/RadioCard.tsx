import { memo, useCallback } from "react";
import { Box, Typography, Radio, useTheme, alpha } from "@mui/material";
import type { UseFormSetValue } from "react-hook-form";

interface RadioCardProps {
  value: string;
  label: string;
  selectedValue: string;
  onSelect: UseFormSetValue<any>;
  fieldName?: string;
  disabled?: boolean;
  description?: string;
}

const RadioCard = memo<RadioCardProps>(
  ({
    value,
    label,
    selectedValue,
    onSelect,
    fieldName = "role",
    disabled = false,
    description,
  }) => {
    const theme = useTheme();
    const isSelected = selectedValue === value;

    const handleSelect = useCallback(() => {
      if (!disabled) {
        onSelect(fieldName, value);
      }
    }, [disabled, onSelect, fieldName, value]);

    const handleKeyDown = useCallback(
      (event: React.KeyboardEvent) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleSelect();
        }
      },
      [handleSelect],
    );

    return (
      <Box
        role="radio"
        aria-checked={isSelected}
        aria-disabled={disabled}
        tabIndex={disabled ? -1 : 0}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          p: 1.5,
          borderRadius: 2,
          border: 2,
          borderColor: isSelected
            ? theme.palette.primary.main
            : theme.palette.divider,
          backgroundColor: isSelected
            ? alpha(theme.palette.primary.main, 0.05)
            : theme.palette.background.paper,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          transition: theme.transitions.create(
            ["border-color", "background-color", "box-shadow"],
            { duration: theme.transitions.duration.shorter },
          ),
          ...(!disabled && {
            "&:hover": {
              borderColor: isSelected
                ? theme.palette.primary.main
                : theme.palette.action.hover,
              backgroundColor: isSelected
                ? alpha(theme.palette.primary.main, 0.08)
                : alpha(theme.palette.action.hover, 0.04),
            },
            "&:focus-visible": {
              outline: "none",
              boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.2)}`,
            },
          }),
        }}
      >
        {/* Custom Radio Button */}
        <Radio
          checked={isSelected}
          disabled={disabled}
          tabIndex={-1}
          disableRipple
          size="small"
          icon={
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: 2,
                borderColor: theme.palette.divider,
                backgroundColor: theme.palette.background.paper,
              }}
            />
          }
          checkedIcon={
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                border: 2,
                borderColor: theme.palette.primary.main,
                backgroundColor: theme.palette.background.paper,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&::after": {
                  content: '""',
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: theme.palette.primary.main,
                },
              }}
            />
          }
          sx={{
            p: 0,
            "&.Mui-disabled .MuiBox-root": {
              borderColor: theme.palette.action.disabled,
              backgroundColor: theme.palette.action.disabledBackground,
            },
          }}
        />

        {/* Label and Description */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="body2"
            component="span"
            sx={{
              fontWeight: theme.typography.fontWeightMedium,
              color: disabled
                ? theme.palette.text.disabled
                : theme.palette.text.primary,
              display: "block",
            }}
          >
            {label}
          </Typography>

          {description && (
            <Typography
              variant="caption"
              sx={{
                mt: 0.5,
                color: theme.palette.text.secondary,
                display: "block",
                lineHeight: 1.5,
              }}
            >
              {description}
            </Typography>
          )}
        </Box>
      </Box>
    );
  },
);

RadioCard.displayName = "RadioCard";

export default RadioCard;
