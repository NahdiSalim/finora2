import { Box, Typography, useTheme, alpha } from "@mui/material";

export interface SimpleTabItem {
  id: string;
  label: string;
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
        borderTopLeftRadius: 1.5, // Match parent container rounded corners
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
              flex: 1, // Full width tabs
              // Active tab styling
              ...(isActive && {
                bgcolor: alpha(theme.palette.primary.main, 0.08), // Faded blue background
                color: theme.palette.primary.main,
                fontWeight: 600,
                borderBottom: `2px solid ${theme.palette.primary.main}`,
                mb: "-1px", // Overlap border
              }),
              // Inactive tab styling
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
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 600 : 500,
                fontSize: { xs: 13, sm: 14 },
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
