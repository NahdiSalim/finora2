import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  useTheme,
  alpha,
  Typography,
  Badge,
} from "@mui/material";
import { Info as InfoIcon, Message as MessageIcon } from "@mui/icons-material";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentsTabsProps {
  defaultValue?: number;
  onTabChange?: (tabIndex: number) => void;
  detailsContent?: React.ReactNode;
  chatContent?: React.ReactNode;
  unreadMessages?: number;
  disabledTabs?: number[];
  variant?: "standard" | "fullWidth" | "scrollable";
  centered?: boolean;
  /** Label du second onglet (défaut: "Chat") */
  secondTabLabel?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function a11yProps(index: number) {
  return {
    id: `documents-tab-${index}`,
    "aria-controls": `documents-tabpanel-${index}`,
  };
}

// ─── Tab Panel ────────────────────────────────────────────────────────────────

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`documents-tabpanel-${index}`}
      aria-labelledby={`documents-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentsTabs({
  defaultValue = 0,
  onTabChange,
  detailsContent,
  chatContent,
  unreadMessages = 0,
  disabledTabs = [],
  variant = "standard",
  centered = false,
  secondTabLabel = "Chat",
}: DocumentsTabsProps) {
  const theme = useTheme();
  const [value, setValue] = useState(defaultValue);

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    onTabChange?.(newValue);
  };

  const tabSx = {
    minHeight: 48,
    fontWeight: 600,
    fontSize: "0.95rem",
    textTransform: "none" as const, // ← typed correctly as const
    transition: "all 0.2s ease-in-out",
    "&.Mui-selected": {
      color: theme.palette.primary.main,
      fontWeight: 700,
    },
    "&:hover": {
      color: theme.palette.primary.main,
      backgroundColor: alpha(theme.palette.primary.main, 0.04),
    },
    "&.Mui-disabled": {
      opacity: 0.5,
    },
  };

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        overflow: "hidden",
        bgcolor: "background.paper",
      }}
    >
      {/* Tabs header */}
      <Box
        sx={{
          borderBottom: `1px solid ${theme.palette.divider}`,
          bgcolor: "background.paper",
          borderRadius: "12px 12px 0 0",
        }}
      >
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="documents tabs"
          variant={variant}
          centered={centered}
          TabIndicatorProps={{
            style: {
              height: 3,
              borderRadius: "3px 3px 0 0",
              backgroundColor: theme.palette.primary.main,
            },
          }}
          sx={{
            minHeight: 48,
            px: 2,
            "& .MuiTabs-flexContainer": { gap: 2 },
          }}
        >
          <Tab
            icon={<InfoIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label="Détails"
            disabled={disabledTabs.includes(0)}
            sx={tabSx}
            {...a11yProps(0)}
          />

          <Tab
            icon={
              <Badge
                badgeContent={unreadMessages}
                color="error"
                max={99}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: "0.7rem",
                    minWidth: 18,
                    height: 18,
                  },
                }}
              >
                <MessageIcon sx={{ fontSize: 20 }} />
              </Badge>
            }
            iconPosition="start"
            label={secondTabLabel}
            disabled={disabledTabs.includes(1)}
            sx={tabSx}
            {...a11yProps(1)}
          />
        </Tabs>
      </Box>

      {/* Tab content */}
      <Box sx={{ px: 3 }}>
        <TabPanel value={value} index={0}>
          {detailsContent ?? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Aucun détail disponible
            </Typography>
          )}
        </TabPanel>

        <TabPanel value={value} index={1}>
          {chatContent ?? (
            <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
              Aucun message disponible
            </Typography>
          )}
        </TabPanel>
      </Box>
    </Paper>
  );
}
