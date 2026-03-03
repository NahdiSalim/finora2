import {
  FormControl,
  Select,
  FormHelperText,
  InputLabel,
  useTheme,
  type SelectProps,
} from "@mui/material";
import { forwardRef } from "react";

export type CustomSelectProps = SelectProps & {
  label?: string;
  helperText?: string;
};

const CustomSelect = forwardRef<HTMLDivElement, CustomSelectProps>(
  ({ label, helperText, required, error, sx, children, ...props }, ref) => {
    const theme = useTheme();

    return (
      <FormControl
        ref={ref}
        fullWidth
        error={error}
        required={required}
        sx={{
          width: "100%",
          ...sx,
        }}
      >
        {label ? (
          <InputLabel
            shrink
            sx={{
              fontFamily: theme.typography.caption.fontFamily,
              fontSize: theme.typography.caption.fontSize,
              fontWeight: theme.typography.fontWeightSemiBold,
              color: theme.palette.grey[800],
              lineHeight: theme.typography.caption.lineHeight,
              marginBottom: "6px",
              position: "static",
              transform: "none",

              "& .MuiFormLabel-asterisk": {
                color: theme.palette.error.main,
                fontWeight: theme.typography.fontWeightBold,
              },

              "&.Mui-error": {
                color: theme.palette.error.main,
              },
            }}
          >
            {label}
          </InputLabel>
        ) : null}

        <Select
          {...props}
          displayEmpty
          sx={{
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

            "& .MuiSelect-select": {
              padding: "11px 14px",
              lineHeight: theme.typography.body2.lineHeight,
            },

            "&.Mui-disabled": {
              backgroundColor: theme.palette.grey[200],
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: theme.palette.grey[200],
              },
            },
          }}
        >
          {children}
        </Select>

        {helperText && (
          <FormHelperText
            sx={{
              fontFamily: theme.typography.overline.fontFamily,
              fontSize: theme.typography.overline.fontSize,
              marginLeft: 0,
              marginTop: "6px",
              color: error ? theme.palette.error.main : theme.palette.grey[600],
            }}
          >
            {helperText}
          </FormHelperText>
        )}
      </FormControl>
    );
  },
);

CustomSelect.displayName = "CustomSelect";

export default CustomSelect;
