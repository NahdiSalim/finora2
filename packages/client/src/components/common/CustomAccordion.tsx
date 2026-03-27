import type { ReactNode } from "react";
import { Box, Typography } from "@mui/material";

type MeetingType = "in_person" | "online" | "phone";

interface CustomAccordionProps {
  id: MeetingType;
  icon: ReactNode;
  title: string;
  subtitle: string;
  expanded: boolean;
  onChange: (id: MeetingType) => void;
  children?: ReactNode;
}

export default function CustomAccordion({
  id,
  icon,
  title,
  subtitle,
  expanded,
  onChange,
  children,
}: CustomAccordionProps) {
  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: expanded ? "primary.main" : "divider",
        backgroundColor: expanded ? "primary.light" : "transparent",
        borderRadius: 3,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <Box
        onClick={() => onChange(id)}
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 1,
          p: 1.5,
          cursor: "pointer",
        }}
      >
        {icon}
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography variant="caption" fontWeight={600}>
            {title}
          </Typography>
          <Typography variant="caption" color="info.main">
            {subtitle}
          </Typography>
        </Box>
      </Box>

      {/* Content */}
      {expanded && <Box sx={{ p: 2, pt: 0 }}>{children}</Box>}
    </Box>
  );
}
