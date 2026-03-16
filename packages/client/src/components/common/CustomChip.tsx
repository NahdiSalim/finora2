import { memo } from "react";
import { Box, useTheme, type SxProps, type Theme } from "@mui/material";

type ChipVariant =
  | "primary"
  | "secondary"
  | "success"
  | "error"
  | "purple"
  | "brown";

interface CustomChipProps {
  label: string;
  variant?: ChipVariant;
  icon?: React.ReactNode;
  sx?: SxProps<Theme>;
}

const CustomChip = memo(
  ({ label, variant = "primary", icon, sx }: CustomChipProps) => {
    const theme = useTheme();

    const customColors = {
      purple: { light: "#F4F3FF", dark: "#5925DC" },
      brown: { light: "#FFF6ED", dark: "#C4320A" },
    };

    const isThemeVariant =
      variant === "primary" ||
      variant === "secondary" ||
      variant === "success" ||
      variant === "error";

    const lightColor = isThemeVariant
      ? theme.palette[variant].light
      : customColors[variant].light;

    const darkColor = isThemeVariant
      ? theme.palette[variant].dark
      : customColors[variant].dark;

    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 0.5,
          borderRadius: 2,
          fontSize: 13,
          fontWeight: 500,
          backgroundColor: lightColor,
          color: darkColor,
          whiteSpace: "nowrap",
          ...(sx as object),
        }}
      >
        {icon && <Box sx={{ display: "flex" }}>{icon}</Box>}
        {label}
      </Box>
    );
  },
);

CustomChip.displayName = "CustomChip";

export { type CustomChipProps };
export default CustomChip;
