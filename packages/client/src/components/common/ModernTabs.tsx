import { Box, Typography, useTheme, alpha } from "@mui/material";

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface ModernTabsProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function ModernTabs({
  tabs,
  activeTab,
  onTabChange,
}: ModernTabsProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        p: 1,
        bgcolor: alpha(theme.palette.grey[200], 0.5),
        borderRadius: 2,
        width: "100%",
      }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Box
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              py: { xs: 1.5, sm: 1.75 },
              px: { xs: 2, sm: 3 },
              borderRadius: 1.5,
              cursor: "pointer",
              transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
              bgcolor: isActive ? "white" : "transparent",
              boxShadow: isActive
                ? "0 2px 4px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.04)"
                : "none",
              transform: isActive ? "translateY(-1px)" : "none",
              "&:hover": {
                bgcolor: isActive
                  ? "white"
                  : alpha(theme.palette.grey[100], 0.8),
              },
              "&:active": {
                transform: isActive ? "translateY(0)" : "translateY(0)",
              },
            }}
          >
            {tab.icon && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  color: isActive
                    ? theme.palette.primary.main
                    : theme.palette.text.secondary,
                  transition: "color 0.2s",
                }}
              >
                {tab.icon}
              </Box>
            )}
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 600 : 500,
                color: isActive
                  ? theme.palette.text.primary
                  : theme.palette.text.secondary,
                transition: "all 0.2s",
                fontSize: { xs: "0.875rem", sm: "0.9375rem" },
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
