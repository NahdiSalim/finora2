import { Box, Typography, useTheme, alpha } from "@mui/material";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface FolderTabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function FolderTabNavigation({
  tabs,
  activeTab,
  onTabChange,
}: FolderTabNavigationProps) {
  const theme = useTheme();

  // Find the index of the active tab
  const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-end",
        gap: 0,
        position: "relative",
        mb: 0,
        overflowX: "auto",
        overflowY: "hidden",
        "&::-webkit-scrollbar": {
          height: 6,
        },
        "&::-webkit-scrollbar-track": {
          bgcolor: alpha(theme.palette.grey[300], 0.3),
          borderRadius: 3,
        },
        "&::-webkit-scrollbar-thumb": {
          bgcolor: alpha(theme.palette.grey[400], 0.5),
          borderRadius: 3,
          "&:hover": {
            bgcolor: alpha(theme.palette.grey[500], 0.7),
          },
        },
      }}
    >
      {tabs.map((tab, index) => {
        const isActive = tab.id === activeTab;
        const isLast = index === tabs.length - 1;
        const isFirst = index === 0;
        const isMiddle = !isFirst && !isLast;

        // Calculate distance from active tab
        const distance = Math.abs(index - activeTabIndex);

        // Determine opacity based on distance
        // Distance 0 (active): white background
        // Distance 1: full opacity (1.0)
        // Distance 2: medium fade (0.7)
        // Distance 3+: more fade (0.5)
        const getOpacity = () => {
          if (isActive) return 1; // Active tab uses white, not blue
          if (distance === 1) return 1.0; // Full blue
          if (distance === 2) return 0.7; // Medium fade
          return 0.5; // More fade for distance 3+
        };

        const opacity = getOpacity();

        // Determine clip-path based on tab position with smooth rounded corners at transitions
        const getClipPath = () => {
          if (isFirst) {
            // First tab: pointed diagonal on right with smooth rounded corners
            return "polygon(0 0, calc(100% - 22px) 0, calc(100% - 20px) 3%, calc(100% - 18px) 8%, calc(100% - 16px) 15%, calc(100% - 14px) 25%, calc(100% - 12px) 40%, calc(100% - 10px) 60%, calc(100% - 8px) 80%, 100% 100%, 0 100%)";
          } else if (isLast) {
            // Last tab: pointed diagonal on left with smooth rounded corners
            return "polygon(22px 0, 100% 0, 100% 100%, 0 100%, 8px 80%, 10px 60%, 12px 40%, 14px 25%, 16px 15%, 18px 8%, 20px 3%)";
          } else {
            // Middle tabs: pointed diagonals on both sides with smooth rounded corners
            return "polygon(22px 0, calc(100% - 22px) 0, calc(100% - 20px) 3%, calc(100% - 18px) 8%, calc(100% - 16px) 15%, calc(100% - 14px) 25%, calc(100% - 12px) 40%, calc(100% - 10px) 60%, calc(100% - 8px) 80%, 100% 100%, 0 100%, 8px 80%, 10px 60%, 12px 40%, 14px 25%, 16px 15%, 18px 8%, 20px 3%)";
          }
        };

        return (
          <Box
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            sx={{
              position: "relative",
              cursor: "pointer",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              zIndex: isActive ? tabs.length + 1 : tabs.length - index,
              ml: index > 0 ? { xs: "-10px", sm: "-14px", md: "-18px" } : 0,
              // Active tab styling
              ...(isActive && {
                bgcolor: "white",
                color: theme.palette.text.primary,
                borderTopLeftRadius: isFirst ? "8px" : 0,
                borderTopRightRadius: isLast ? "8px" : 0,
                borderBottom: "none",
                borderLeft: "none",
                borderTop: "none",
                borderRight: "none",
                px: { xs: 3, sm: 5, md: 8 },
                py: 1.5,
                fontWeight: 600,
                fontSize: { xs: 13, sm: 14 },
                minHeight: { xs: 44, sm: 48 },
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "none",
                mb: "-1px",
                clipPath: getClipPath(),
              }),
              // Inactive tab styling
              ...(!isActive && {
                bgcolor: alpha(theme.palette.primary.main, opacity),
                color: "white",
                borderTopLeftRadius: isFirst ? "8px" : 0,
                borderTopRightRadius: isLast ? "8px" : 0,
                borderBottom: "none",
                borderLeft: "none",
                borderTop: "none",
                borderRight: "none",
                px: { xs: 2.5, sm: 4, md: 6 },
                py: 1.5,
                fontWeight: 600,
                fontSize: { xs: 13, sm: 14 },
                minHeight: { xs: 44, sm: 48 },
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                clipPath: getClipPath(),
                "&:hover": {
                  bgcolor: alpha(
                    theme.palette.primary.dark,
                    Math.min(opacity + 0.1, 1),
                  ),
                },
              }),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: { xs: 13, sm: 14 },
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
              {tab.count !== undefined && (
                <Box
                  component="span"
                  sx={{
                    display: { xs: "none", sm: "inline" },
                  }}
                >
                  {` (${tab.count})`}
                </Box>
              )}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
