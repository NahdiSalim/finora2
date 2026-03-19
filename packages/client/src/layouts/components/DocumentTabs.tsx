import React, { useState } from "react";
import {
  Box,
  Tabs,
  Tab,
  Paper,
  useTheme,
  alpha,
  Typography,
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
  secondTabLabel?: string;
  hideChat?: boolean;
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
      {value === index && (
        <Box
          sx={{
            py: 3,
            animation: "fadeSlideIn 0.22s cubic-bezier(0.4, 0, 0.2, 1)",
            "@keyframes fadeSlideIn": {
              from: { opacity: 0, transform: "translateY(6px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          {children}
        </Box>
      )}
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
  hideChat = false,
}: DocumentsTabsProps) {
  const theme = useTheme();
  const [value, setValue] = useState(defaultValue);

  const resolvedValue = hideChat && value === 1 ? 0 : value;

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
    onTabChange?.(newValue);
  };

  const isSelected = (index: number) => resolvedValue === index;

  const tabSx = (index: number) => ({
    flex: 1,
    minHeight: 40,
    maxHeight: 40,
    fontWeight: 500,
    fontSize: theme.typography.body2,
    textTransform: "none" as const,
    borderRadius: "8px",
    color: isSelected(index)
      ? theme.palette.primary.contrastText
      : theme.palette.text.secondary,
    background: isSelected(index)
      ? "linear-gradient(to bottom, #155DFC, #5389FF)"
      : "transparent",
    zIndex: 1,
    transition:
      "color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
    "&:hover": {
      backgroundColor: isSelected(index)
        ? theme.palette.primary.dark
        : alpha(theme.palette.primary.main, 0.07),
      color: isSelected(index)
        ? theme.palette.primary.contrastText
        : theme.palette.primary.main,
    },
    "&.Mui-selected": {
      color: theme.palette.primary.contrastText,
      fontWeight: 600,
      boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.35)}`,
    },
    "&.Mui-disabled": {
      opacity: 0.4,
    },
  });

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        overflow: "hidden",
        bgcolor: "transparent",
      }}
    >
      {/* ── Segmented tab strip ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          bgcolor: alpha(theme.palette.action.hover, 0.5),
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          p: 0.5,
          gap: 1,
          backdropFilter: "blur(8px)",
          backgroundColor: theme.palette.grey[50],
        }}
      >
        <Tabs
          value={resolvedValue}
          onChange={handleChange}
          aria-label="documents tabs"
          variant={variant}
          centered={centered}
          TabIndicatorProps={{ style: { display: "none" } }}
          sx={{
            flex: 1,
            minHeight: 40,
            "& .MuiTabs-flexContainer": {
              gap: "4px",
            },
            "& .MuiTabs-root": {
              overflow: "visible",
            },
          }}
        >
          <Tab
            label="Détails"
            disabled={disabledTabs.includes(0)}
            sx={tabSx(0)}
            {...a11yProps(0)}
          />

          {!hideChat && (
            <Tab
              label={secondTabLabel}
              disabled={disabledTabs.includes(1)}
              sx={tabSx(1)}
              {...a11yProps(1)}
            />
          )}
        </Tabs>
      </Box>

      {/* ── Divider ── */}
      <Box
        sx={{
          height: "1px",
          mx: 1,
          mt: 2,
          background: `linear-gradient(to right, transparent, ${alpha(theme.palette.divider, 0.8)}, transparent)`,
        }}
      />

      {/* ── Tab content ── */}
      <Box sx={{ px: 1 }}>
        <TabPanel value={resolvedValue} index={0}>
          {detailsContent ?? (
            <Box
              sx={{
                py: 5,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <InfoIcon
                sx={{
                  fontSize: 32,
                  color: alpha(theme.palette.text.secondary, 0.3),
                }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ opacity: 0.6, fontSize: "0.8rem" }}
              >
                Aucun détail disponible
              </Typography>
            </Box>
          )}
        </TabPanel>

        {!hideChat && (
          <TabPanel value={resolvedValue} index={1}>
            {chatContent ?? (
              <Box
                sx={{
                  py: 5,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <MessageIcon
                  sx={{
                    fontSize: 32,
                    color: alpha(theme.palette.text.secondary, 0.3),
                  }}
                />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ opacity: 0.6, fontSize: "0.8rem" }}
                >
                  Aucun message disponible
                </Typography>
              </Box>
            )}
          </TabPanel>
        )}
      </Box>
    </Paper>
  );
}
