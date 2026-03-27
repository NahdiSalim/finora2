import { Box, Typography, useTheme, alpha } from "@mui/material";
import type { ReactNode } from "react";

export interface SimpleTabItem {
  id: string;
  label: string;
  icon?: ReactNode;
}

interface SimpleTabsProps {
  tabs: SimpleTabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function SimpleTabs({ tabs, activeTab, onTabChange }: SimpleTabsProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        gap: 0,
        position: "relative",
        mb: 0,
        borderBottom: `1px solid ${theme.palette.grey[200]}`,
        borderTopLeftRadius: 1.5,
        borderTopRightRadius: 1.5,
        overflow: "hidden",
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;

        return (
          <Box
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            sx={{
              position: "relative",
              cursor: "pointer",
              transition: "all 0.2s ease",
              px: { xs: 2, sm: 3 },
              py: 1.5,
              minHeight: 48,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              flex: 1,
              ...(isActive && {
                bgcolor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
                fontWeight: 600,
                borderBottom: `2px solid ${theme.palette.primary.main}`,
                mb: "-1px",
              }),
              ...(!isActive && {
                bgcolor: theme.palette.grey[100],
                color: theme.palette.text.secondary,
                fontWeight: 500,
                "&:hover": {
                  bgcolor: theme.palette.grey[200],
                },
              }),
            }}
          >
            {tab.icon && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  "& svg": {
                    width: 18,
                    height: 18,
                  },
                }}
              >
                {tab.icon}
              </Box>
            )}
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 600 : 500,
                fontSize: { xs: 14, sm: 16 },
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
