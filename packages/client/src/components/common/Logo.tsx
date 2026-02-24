import React from "react";
import { Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";

interface LogoProps {
  variant?: "primary" | "symbol" | "text-only";
  isOnDark?: boolean;
  size?: number;
  brandName?: string;
}

const Logo: React.FC<LogoProps> = ({
  variant = "primary",
  isOnDark = false,
  size = 160,
  brandName = "FINORA",
}) => {
  const theme = useTheme();

  // Use theme colors or fallback
  const iconColor = theme.palette.secondary?.main || "#FF7D0D";
  const textColor = isOnDark
    ? theme.palette.common?.white || "#FFFFFF"
    : theme.palette.text?.primary || "#1A1A1A";

  // Symbol variant - Icon only
  if (variant === "symbol") {
    const symbolSize = size * 0.4;

    return (
      <svg
        width={symbolSize}
        height={symbolSize}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        style={{ display: "block" }}
      >
        <path
          d="M20.1424 0.843087L16.9853 0L14.3248 9.89565L11.9228 0.961791L8.76555 1.80488L11.3608 11.4573L4.8967 5.01518L2.58549 7.31854L9.67576 14.3848L0.845959 12.0269L0 15.1733L9.64767 17.7496C9.53721 17.2748 9.47877 16.7801 9.47877 16.2717C9.47877 12.6737 12.4055 9.75685 16.0159 9.75685C19.6262 9.75685 22.5529 12.6737 22.5529 16.2717C22.5529 16.7768 22.4952 17.2685 22.3861 17.7405L31.1541 20.0818L32 16.9354L22.314 14.3489L31.1444 11.9908L30.2984 8.84437L20.6128 11.4308L27.0768 4.98873L24.7656 2.68538L17.7737 9.65357L20.1424 0.843087Z"
          fill={iconColor}
        />
        <path
          d="M22.3776 17.7769C22.1069 18.9173 21.5354 19.9419 20.7513 20.7628L27.1033 27.0933L29.4145 24.7899L22.3776 17.7769Z"
          fill={iconColor}
        />
        <path
          d="M20.6871 20.8291C19.8936 21.6369 18.8907 22.2397 17.7661 22.5503L20.0775 31.1471L23.2346 30.304L20.6871 20.8291Z"
          fill={iconColor}
        />
        <path
          d="M17.6481 22.5818C17.1264 22.7155 16.5795 22.7866 16.0159 22.7866C15.4121 22.7866 14.8273 22.705 14.2723 22.5522L11.9588 31.1569L15.1159 31.9999L17.6481 22.5818Z"
          fill={iconColor}
        />
        <path
          d="M14.1607 22.5206C13.0533 22.1945 12.0683 21.584 11.2909 20.7739L4.92328 27.1199L7.23448 29.4233L14.1607 22.5206Z"
          fill={iconColor}
        />
        <path
          d="M11.2378 20.718C10.4737 19.9028 9.91721 18.8919 9.65231 17.769L0.855743 20.1181L1.7017 23.2645L11.2378 20.718Z"
          fill={iconColor}
        />
      </svg>
    );
  }

  // Text-only variant
  if (variant === "text-only") {
    return (
      <Typography
        variant="h5"
        component="span"
        sx={{
          fontWeight: 700,
          color: textColor,
          letterSpacing: "-0.03em",
          fontFamily: theme.typography.fontFamily,
        }}
      >
        {brandName}
      </Typography>
    );
  }

  // Primary variant - Icon + Text with Box layout
  const iconSize = size * 0.2;
  const fontSize = size * 0.15;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
      }}
    >
      {/* Logo Icon */}
      <Box
        component="svg"
        width={iconSize}
        height={iconSize}
        viewBox="0 0 32 32"
        xmlns="http://www.w3.org/2000/svg"
        sx={{ flexShrink: 0 }}
      >
        <path
          d="M20.1424 0.843087L16.9853 0L14.3248 9.89565L11.9228 0.961791L8.76555 1.80488L11.3608 11.4573L4.8967 5.01518L2.58549 7.31854L9.67576 14.3848L0.845959 12.0269L0 15.1733L9.64767 17.7496C9.53721 17.2748 9.47877 16.7801 9.47877 16.2717C9.47877 12.6737 12.4055 9.75685 16.0159 9.75685C19.6262 9.75685 22.5529 12.6737 22.5529 16.2717C22.5529 16.7768 22.4952 17.2685 22.3861 17.7405L31.1541 20.0818L32 16.9354L22.314 14.3489L31.1444 11.9908L30.2984 8.84437L20.6128 11.4308L27.0768 4.98873L24.7656 2.68538L17.7737 9.65357L20.1424 0.843087Z"
          fill={iconColor}
        />
        <path
          d="M22.3776 17.7769C22.1069 18.9173 21.5354 19.9419 20.7513 20.7628L27.1033 27.0933L29.4145 24.7899L22.3776 17.7769Z"
          fill={iconColor}
        />
        <path
          d="M20.6871 20.8291C19.8936 21.6369 18.8907 22.2397 17.7661 22.5503L20.0775 31.1471L23.2346 30.304L20.6871 20.8291Z"
          fill={iconColor}
        />
        <path
          d="M17.6481 22.5818C17.1264 22.7155 16.5795 22.7866 16.0159 22.7866C15.4121 22.7866 14.8273 22.705 14.2723 22.5522L11.9588 31.1569L15.1159 31.9999L17.6481 22.5818Z"
          fill={iconColor}
        />
        <path
          d="M14.1607 22.5206C13.0533 22.1945 12.0683 21.584 11.2909 20.7739L4.92328 27.1199L7.23448 29.4233L14.1607 22.5206Z"
          fill={iconColor}
        />
        <path
          d="M11.2378 20.718C10.4737 19.9028 9.91721 18.8919 9.65231 17.769L0.855743 20.1181L1.7017 23.2645L11.2378 20.718Z"
          fill={iconColor}
        />
      </Box>

      {/* Brand Text */}
      <Typography
        component="span"
        sx={{
          fontSize: `${fontSize}px`,
          fontWeight: 600,
          color: textColor,
          letterSpacing: "-0.02em",
          fontFamily: theme.typography.fontFamily,
          lineHeight: 1,
        }}
      >
        {brandName}
      </Typography>
    </Box>
  );
};

export default Logo;
