import { TextField, IconButton, InputAdornment, useTheme } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import type { InputLabelProps } from "@mui/material/InputLabel";
import { forwardRef, useState } from "react";
import type { ReactNode } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface CustomInputProps extends Omit<TextFieldProps, "slotProps"> {
  isEdit?: boolean;
  isPassword?: boolean;
  showPasswordToggle?: boolean;
  slotProps?: Omit<TextFieldProps["slotProps"], "inputLabel"> & {
    inputLabel?: InputLabelProps;
    input?: Record<string, unknown> & {
      endAdornment?: ReactNode;
    };
  };
  InputProps?: Record<string, unknown>;
}

// ─── Component ────────────────────────────────────────────────────────────────
const CustomInput = forwardRef<HTMLDivElement, CustomInputProps>(
  (
    {
      isEdit = false,
      isPassword = false,
      showPasswordToggle = true,
      slotProps,
      InputProps,
      type,
      sx,
      ...props
    },
    ref,
  ) => {
    const theme = useTheme();
    const [showPassword, setShowPassword] = useState(false);

    const shouldShowToggle = isPassword && showPasswordToggle;
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    const endAdornment: ReactNode = shouldShowToggle ? (
      <InputAdornment position="end">
        <IconButton
          onClick={() => setShowPassword(!showPassword)}
          edge="end"
          size="small"
          aria-label={
            showPassword
              ? "Masquer le mot de passe"
              : "Afficher le mot de passe"
          }
          sx={{
            color: theme.palette.grey[500],
            mr: "-4px",
            "&:hover": {
              color: theme.palette.grey[800],
              backgroundColor: "transparent",
            },
          }}
        >
          {showPassword ? (
            <Icon icon="solar:eye-bold" sx={{ size: 20 }} />
          ) : (
            <Icon icon="solar:eye-closed-bold" sx={{ size: 20 }} />
          )}
        </IconButton>
      </InputAdornment>
    ) : (
      slotProps?.input?.endAdornment
    );

    return (
      <TextField
        ref={ref}
        variant="outlined"
        {...props}
        type={inputType}
        InputProps={InputProps}
        slotProps={{
          ...slotProps,
          inputLabel: {
            ...slotProps?.inputLabel,
            shrink: true,
            required: false,
            sx: {
              ...slotProps?.inputLabel?.sx,
              // Red asterisk via ::after when required
              ...(props.required && {
                "&::after": {
                  content: '" *"',
                  color: theme.palette.error.main,
                  fontWeight: theme.typography.fontWeightBold,
                  marginLeft: "2px",
                },
              }),
            },
          },
          input: {
            ...slotProps?.input,
            endAdornment,
          },
        }}
        sx={{
          width: "100%",

          // ── Label ─────────────────────────────────────────────────────────
          "& .MuiInputLabel-root": {
            fontFamily: theme.typography.caption.fontFamily,
            fontSize: theme.typography.caption.fontSize,
            fontWeight: theme.typography.fontWeightSemiBold,
            color: theme.palette.grey[800],
            lineHeight: theme.typography.caption.lineHeight,
            marginBottom: "6px",

            position: "static",
            transform: "none",
            maxWidth: "100%",

            "&.Mui-focused": { color: theme.palette.grey[800] },
            "&.Mui-error": { color: theme.palette.error.main },
            "&.Mui-disabled": { color: theme.palette.grey[500] },

            // Red asterisk after label text when required
            '&[data-required="true"]::after': {
              content: '" *"',
              color: theme.palette.error.main,
              fontWeight: theme.typography.fontWeightBold,
              marginLeft: "2px",
            },
          },

          // Remove notch gap
          "& .MuiOutlinedInput-notchedOutline legend": {
            width: "0 !important",
          },

          // ── Input root ────────────────────────────────────────────────────
          "& .MuiOutlinedInput-root": {
            fontFamily: theme.typography.body2.fontFamily,
            fontSize: theme.typography.body2.fontSize,
            fontWeight: theme.typography.fontWeightRegular,
            color: theme.palette.grey[900],
            backgroundColor: theme.palette.common.white,
            borderRadius: "10px",
            transition: "box-shadow 0.2s ease, border-color 0.2s ease",

            "& .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.grey[300],
              borderWidth: "1.5px",
            },

            "&:hover:not(.Mui-disabled):not(.Mui-error) .MuiOutlinedInput-notchedOutline":
              {
                borderColor: theme.palette.grey[600],
              },

            "&.Mui-focused:not(.Mui-error) .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.primary.main,
              borderWidth: "1.5px",
            },
            "&.Mui-focused:not(.Mui-error)": {
              boxShadow: `0px 0px 0px 3px ${theme.palette.primary.lighter}`,
            },

            "&.Mui-error .MuiOutlinedInput-notchedOutline": {
              borderColor: theme.palette.error.main,
              borderWidth: "1.5px",
            },
            "&.Mui-error": {
              boxShadow: `0px 0px 0px 3px ${theme.palette.error.lighter}`,
            },

            "&.Mui-disabled": {
              backgroundColor: theme.palette.grey[200],
              boxShadow: "none",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.grey[200],
              },
            },
          },

          // ── Native <input> / <textarea> ───────────────────────────────────
          "& .MuiOutlinedInput-input": {
            fontFamily: theme.typography.body2.fontFamily,
            fontSize: theme.typography.body2.fontSize,
            fontWeight: theme.typography.fontWeightRegular,
            color: theme.palette.grey[900],
            padding: "11px 14px",
            lineHeight: theme.typography.body2.lineHeight,

            "&::placeholder": {
              color: theme.palette.grey[500],
              opacity: 1,
            },

            "&.Mui-disabled": {
              WebkitTextFillColor: theme.palette.grey[400],
              cursor: "not-allowed",
            },
          },

          // ── Helper / error text ────────────────────────────────────────────
          "& .MuiFormHelperText-root": {
            fontFamily: theme.typography.overline.fontFamily,
            fontSize: theme.typography.overline.fontSize,
            fontWeight: theme.typography.fontWeightRegular,
            color: theme.palette.grey[600],
            marginLeft: 0,
            marginTop: "6px",
            lineHeight: theme.typography.overline.lineHeight,

            "&.Mui-error": {
              color: theme.palette.error.main,
            },
          },

          // ── Adornments ────────────────────────────────────────────────────
          "& .MuiInputAdornment-root": {
            color: theme.palette.grey[500],
            "& .MuiSvgIcon-root": { fontSize: 18 },
          },

          ...sx,
        }}
      />
    );
  },
);

CustomInput.displayName = "CustomInput";

export default CustomInput;
