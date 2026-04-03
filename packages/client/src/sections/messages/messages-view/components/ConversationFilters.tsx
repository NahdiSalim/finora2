import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import { useTheme, alpha } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { Users, Briefcase, UserCog, Bell } from "lucide-react";

import type { ConversationCategory } from "../data/types";

type FilterOption = {
  value: ConversationCategory | "unread";
  label: string;
  icon: React.ReactNode;
  color: string;
};

type ConversationFiltersProps = {
  activeFilters: (ConversationCategory | "unread")[];
  onFiltersChange: (filters: (ConversationCategory | "unread")[]) => void;
  badgeCounts?: Record<string, number>;
  userRole: "comptable" | "client" | "collaborateur" | "other";
};

export default function ConversationFilters({
  activeFilters,
  onFiltersChange,
  badgeCounts = {},
  userRole,
}: ConversationFiltersProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // Define available filters based on user role
  const getFilterOptions = (): FilterOption[] => {
    const baseFilters: FilterOption[] = [];

    if (userRole === "comptable") {
      baseFilters.push(
        {
          value: "client" as const,
          label: "Clients",
          icon: <Users size={isMobile ? 15 : 16} />,
          color: "#3B82F6",
        },
        {
          value: "collaborateur" as const,
          label: "Collaborateurs",
          icon: <UserCog size={isMobile ? 15 : 16} />,
          color: "#14B8A6",
        },
      );
    } else if (userRole === "client") {
      baseFilters.push({
        value: "comptable" as const,
        label: "Comptables",
        icon: <Briefcase size={isMobile ? 15 : 16} />,
        color: "#8B5CF6",
      });
    } else if (userRole === "collaborateur") {
      baseFilters.push(
        {
          value: "comptable" as const,
          label: "Comptables",
          icon: <Briefcase size={isMobile ? 15 : 16} />,
          color: "#8B5CF6",
        },
        {
          value: "collaborateur" as const,
          label: "Collaborateurs",
          icon: <UserCog size={isMobile ? 15 : 16} />,
          color: "#14B8A6",
        },
      );
    } else {
      baseFilters.push({
        value: "collaborateur" as const,
        label: "Collaborateurs",
        icon: <UserCog size={isMobile ? 15 : 16} />,
        color: "#14B8A6",
      });
    }

    // Add Groups filter
    baseFilters.push({
      value: "group" as const,
      label: "Groupes",
      icon: <Users size={isMobile ? 15 : 16} />,
      color: "#10B981",
    });

    // Add Unread filter
    baseFilters.push({
      value: "unread" as const,
      label: "Non lus",
      icon: <Bell size={isMobile ? 15 : 16} />,
      color: "#EF4444",
    });

    return baseFilters;
  };

  const filterOptions = getFilterOptions();

  const handleFilterToggle = (filterValue: ConversationCategory | "unread") => {
    const isUnread = filterValue === "unread";
    const categoryFilters = activeFilters.filter((f) => f !== "unread");
    const hasUnread = activeFilters.includes("unread");

    if (isUnread) {
      // Toggle unread filter
      if (hasUnread) {
        onFiltersChange(categoryFilters);
      } else {
        onFiltersChange([...activeFilters, "unread"]);
      }
    } else {
      // Toggle category filter
      const isActive = activeFilters.includes(filterValue);

      if (isActive) {
        // Don't allow deselecting the last category filter
        if (categoryFilters.length <= 1 && categoryFilters[0] === filterValue) {
          return;
        }
        const newFilters = activeFilters.filter((f) => f !== filterValue);
        onFiltersChange(newFilters);
      } else {
        onFiltersChange([...activeFilters, filterValue]);
      }
    }
  };

  return (
    <Box
      sx={{
        flexShrink: 0,
      }}
    >
      <Box
        sx={{
          display: "flex",
          gap: isMobile ? 1 : 1.25,
          mb: isMobile ? 1.25 : 1.5,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {filterOptions.map((filter) => {
          const isActive = activeFilters.includes(filter.value);
          const count = badgeCounts[filter.value] || 0;
          const isUnread = filter.value === "unread";
          const categoryFilters = activeFilters.filter((f) => f !== "unread");
          const isLastCategory =
            !isUnread &&
            categoryFilters.length === 1 &&
            categoryFilters[0] === filter.value;

          return (
            <Tooltip
              key={filter.value}
              title={filter.label}
              arrow
              placement="top"
            >
              <Box
                onClick={() =>
                  !isLastCategory && handleFilterToggle(filter.value)
                }
                sx={{
                  position: "relative",
                  width: isMobile ? 38 : 42,
                  height: isMobile ? 38 : 42,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: isLastCategory ? "not-allowed" : "pointer",
                  userSelect: "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  backgroundColor: isActive
                    ? filter.color
                    : theme.palette.common.white,
                  color: isActive ? theme.palette.common.white : filter.color,
                  border: `2px solid ${isActive ? filter.color : alpha(filter.color, 0.2)}`,
                  opacity: isLastCategory ? 0.5 : 1,
                  boxShadow: isActive
                    ? `0 4px 12px ${alpha(filter.color, 0.3)}`
                    : "0 1px 3px rgba(16, 24, 40, 0.04)",
                  transform: isActive ? "scale(1.05)" : "scale(1)",
                  "&:hover": isLastCategory
                    ? {}
                    : {
                        transform: isActive ? "scale(1.08)" : "scale(1.1)",
                        boxShadow: `0 6px 16px ${alpha(filter.color, 0.25)}`,
                        backgroundColor: isActive
                          ? filter.color
                          : alpha(filter.color, 0.08),
                      },
                  "&:active": isLastCategory
                    ? {}
                    : {
                        transform: "scale(0.95)",
                      },
                }}
              >
                <Box sx={{ display: "flex", fontSize: isMobile ? 16 : 17 }}>
                  {filter.icon}
                </Box>

                {/* Badge count */}
                {count > 0 && (
                  <Box
                    sx={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      minWidth: 16,
                      height: 16,
                      px: 0.4,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: "8px",
                      bgcolor: theme.palette.error.main,
                      color: theme.palette.common.white,
                      fontSize: 9,
                      fontWeight: 700,
                      boxShadow: `0 2px 6px ${alpha(theme.palette.error.main, 0.4)}`,
                      border: `2px solid ${theme.palette.common.white}`,
                    }}
                  >
                    {count > 99 ? "99+" : count}
                  </Box>
                )}
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* Separator line */}
      <Box
        sx={{
          width: "100%",
          height: "1px",
          backgroundColor: theme.palette.grey[200],
          mb: isMobile ? 1.25 : 1.5,
        }}
      />
    </Box>
  );
}
