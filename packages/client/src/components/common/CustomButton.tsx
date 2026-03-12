import { forwardRef, memo } from "react";
import {
  Button,
  CircularProgress,
  useTheme,
  alpha,
  type ButtonProps as MuiButtonProps,
} from "@mui/material";

type ButtonVariant = "contained" | "outlined" | "text" | "soft";
type ButtonColor =
  | "primary"
  | "secondary"
  | "error"
  | "warning"
  | "info"
  | "success";
type ButtonSize = "small" | "medium" | "large";

interface CustomButtonProps extends Omit<
  MuiButtonProps,
  "variant" | "color" | "size"
> {
  variant?: ButtonVariant;
  color?: ButtonColor;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  children: React.ReactNode;
}

const CustomButton = memo(
  forwardRef<HTMLButtonElement, CustomButtonProps>(
    (
      {
        variant = "contained",
        color = "primary",
        size = "medium",
        loading = false,
        disabled = false,
        fullWidth = false,
        startIcon,
        endIcon,
        children,
        sx,
        ...props
      },
      ref,
    ) => {
      const theme = useTheme();

      // Size configurations
      const sizeConfig = {
        small: {
          height: 28, // Extra compact
          px: 1.25,
          fontSize: 13,
          iconSize: 14,
        },
        medium: {
          height: 36, // Compact
          px: 2,
          fontSize: 14,
          iconSize: 16,
        },
        large: {
          height: 44, // Standard
          px: 3,
          fontSize: 15,
          iconSize: 20,
        },
      };

      const currentSize = sizeConfig[size];
      const paletteColor = theme.palette[color];

      // Variant styles
      const variantStyles = {
        contained: {
          backgroundColor: paletteColor.main,
          color: paletteColor.contrastText,
          border: "none",
          "&:hover": {
            backgroundColor: paletteColor.dark,
            boxShadow: theme.shadows[4],
          },
          "&:active": {
            backgroundColor: paletteColor.dark,
            boxShadow: theme.shadows[2],
          },
        },
        outlined: {
          backgroundColor: "transparent",
          color: color === "info" ? theme.palette.info.main : paletteColor.main,
          border: 1.5,
          borderColor:
            color === "info" ? theme.palette.info.lighter : paletteColor.main,

          "&:hover": {
            backgroundColor:
              color === "info"
                ? alpha(theme.palette.info.main, 0.08)
                : alpha(paletteColor.main, 0.08),

            borderColor:
              color === "info" ? theme.palette.grey[100] : paletteColor.dark,
          },

          "&:active": {
            backgroundColor:
              color === "info"
                ? alpha(theme.palette.info.main, 0.12)
                : alpha(paletteColor.main, 0.12),
          },
        },
        text: {
          backgroundColor: "transparent",
          color: paletteColor.main,
          border: "none",
          "&:hover": {
            backgroundColor: alpha(paletteColor.main, 0.08),
          },
          "&:active": {
            backgroundColor: alpha(paletteColor.main, 0.12),
          },
        },
        soft: {
          backgroundColor: alpha(paletteColor.main, 0.12),
          color: paletteColor.main,
          border: "none",
          "&:hover": {
            backgroundColor: alpha(paletteColor.main, 0.2),
          },
          "&:active": {
            backgroundColor: alpha(paletteColor.main, 0.24),
          },
        },
      };

      const isDisabled = disabled || loading;

      return (
        <Button
          ref={ref}
          disabled={isDisabled}
          fullWidth={fullWidth}
          startIcon={
            loading ? (
              <CircularProgress
                size={currentSize.iconSize}
                sx={{ color: "inherit" }}
              />
            ) : (
              startIcon
            )
          }
          endIcon={!loading ? endIcon : undefined}
          sx={{
            height: currentSize.height,
            px: currentSize.px,
            fontSize: currentSize.fontSize,
            fontWeight: theme.typography.fontWeightMedium,
            textTransform: "none",
            borderRadius: 2,
            boxShadow: variant === "contained" ? theme.shadows[2] : "none",
            transition: theme.transitions.create(
              ["background-color", "box-shadow", "border-color", "transform"],
              {
                duration: theme.transitions.duration.short,
              },
            ),
            ...variantStyles[variant],
            "&.Mui-disabled": {
              backgroundColor:
                variant === "contained"
                  ? theme.palette.action.disabledBackground
                  : "transparent",
              color: theme.palette.action.disabled,
              borderColor:
                variant === "outlined"
                  ? theme.palette.action.disabled
                  : "transparent",
              boxShadow: "none",
            },
            "&:focus-visible": {
              outline: "none",
              boxShadow: `0 0 0 3px ${alpha(paletteColor.main, 0.25)}`,
            },
            // Icon sizing
            "& .MuiButton-startIcon, & .MuiButton-endIcon": {
              "& > svg": {
                fontSize: currentSize.iconSize,
              },
            },
            ...sx,
          }}
          {...props}
        >
          {children}
        </Button>
      );
    },
  ),
);

CustomButton.displayName = "CustomButton";

export default CustomButton;
