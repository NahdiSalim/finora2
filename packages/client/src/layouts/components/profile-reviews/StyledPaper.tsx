import type { SxProps, Theme } from "@mui/material";
import { Paper } from "@mui/material";

export function StyledPaper({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) {
  return (
    <Paper
      sx={{
        p: 3,
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
        ...sx,
      }}
    >
      {children}
    </Paper>
  );
}
