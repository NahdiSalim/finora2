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
        mb: 0, // No margin bottom to merge with content
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
              zIndex: isActive ? tabs.length + 1 : tabs.length - index, // Active tab on top, others stack behind
              ml: index > 0 ? "-18px" : 0, // Overlap tabs by shifting left (except first tab)
              // Active tab styling
              ...(isActive && {
                bgcolor: "white",
                color: theme.palette.text.primary,
                borderTopLeftRadius: isFirst ? "8px" : 0, // Only first tab has rounded left corner
                borderTopRightRadius: isLast ? "8px" : 0, // Only last tab has rounded right corner
                borderBottom: "none", // No bottom border to merge with content
                borderLeft: "none",
                borderTop: "none",
                borderRight: "none",
                px: 8,
                py: 1.5,
                fontWeight: 600,
                fontSize: 14,
                minHeight: 48,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "none", // No shadow to merge seamlessly
                // Extend slightly below to overlap content border and create seamless merge
                mb: "-1px",
                // Keep the same slanted shape as inactive tabs
                clipPath: getClipPath(),
              }),
              // Inactive tab styling
              ...(!isActive && {
                bgcolor: alpha(theme.palette.primary.main, opacity), // Faded blue based on distance
                color: "white",
                borderTopLeftRadius: isFirst ? "8px" : 0, // Only first tab has rounded left corner
                borderTopRightRadius: isLast ? "8px" : 0, // Only last tab has rounded right corner
                borderBottom: "none",
                borderLeft: "none",
                borderTop: "none",
                borderRight: "none",
                px: 6,
                py: 1.5,
                fontWeight: 600,
                fontSize: 14,
                minHeight: 48,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                // Slanted edges using clip-path based on tab position
                clipPath: getClipPath(),
                "&:hover": {
                  bgcolor: alpha(
                    theme.palette.primary.dark,
                    Math.min(opacity + 0.1, 1),
                  ), // Slightly darker on hover
                },
              }),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                fontSize: 14,
                whiteSpace: "nowrap",
              }}
            >
              {tab.label}
              {tab.count !== undefined && ` (${tab.count})`}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
