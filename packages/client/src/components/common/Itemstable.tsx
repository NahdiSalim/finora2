import { Box, IconButton, Tooltip, Typography, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { List, Trash2 } from "lucide-react";
import CustomInput from "src/components/common/CustomInput";

export interface LineItem {
  id: string;
  date: string;
  description: string;
  qty: string;
  unit: string;
  unitPrice: string;
  discount: string;
  total: string;
}

interface ItemsTableProps {
  lineItems: LineItem[];
  isViewMode?: boolean;
  updateLineItem: (id: string, field: keyof LineItem, value: string) => void;
  removeLineItem: (id: string) => void;
}

const COLUMNS = [
  { key: "date", label: "Date", width: 130 },
  { key: "description", label: "Description", width: "auto" },
  { key: "qty", label: "Qté", width: 90 },
  { key: "unit", label: "Unité", width: 100 },
  { key: "unitPrice", label: "Prix unitaire", width: 130 },
  { key: "discount", label: "Remise (%)", width: 110 },
  { key: "total", label: "Total", width: 120 },
] as const;

export default function ItemsTable({
  lineItems,
  isViewMode = false,
  updateLineItem,
  removeLineItem,
}: ItemsTableProps) {
  const theme = useTheme();

  // ── Empty state ──────────────────────────────────────────────────────────
  if (lineItems.length === 0) {
    return (
      <Box
        sx={{
          py: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1.5,
          borderRadius: 2,
          border: `1.5px dashed ${alpha(theme.palette.divider, 0.7)}`,
          bgcolor: alpha(theme.palette.action.hover, 0.2),
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <List size={20} color={theme.palette.primary.main} />
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: "text.disabled",
            fontSize: "0.82rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
          }}
        >
          Aucun article pour le moment
        </Typography>
      </Box>
    );
  }

  // ── Table ────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        overflowX: "auto",
        borderRadius: 2,
        border: `1px solid ${theme.palette.info.lighter}`,
      }}
    >
      <Box sx={{ minWidth: 980 }}>
        {/* ── Header ── */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: buildGridTemplate(),
            bgcolor: theme.palette.info.lighter,
            borderBottom: `1.5px solid ${alpha(theme.palette.divider, 0.7)}`,
            px: 1,
          }}
        >
          {COLUMNS.map((col) => (
            <Box key={col.key} sx={{ px: 1, py: 1.25 }}>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: theme.palette.info.main,
                }}
              >
                {col.label}
              </Typography>
            </Box>
          ))}

          {/* Action column header */}
          <Box
            sx={{
              px: 1,
              py: 1.25,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.68rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "text.secondary",
              }}
            >
              Action
            </Typography>
          </Box>
        </Box>

        {/* ── Rows ── */}
        {lineItems.map((row, idx) => (
          <Box
            key={row.id}
            sx={{
              height: 45,
              display: "grid",
              gridTemplateColumns: buildGridTemplate(),
              px: 1,
              bgcolor:
                idx % 2 === 0
                  ? "transparent"
                  : alpha(theme.palette.action.hover, 0.2),
              borderBottom:
                idx < lineItems.length - 1
                  ? `1px solid ${theme.palette.info.lighter}`
                  : "none",
              transition: "background-color 0.15s ease",
              "&:hover": {
                bgcolor: alpha(theme.palette.primary.main, 0.03),
              },
            }}
          >
            {/* Date */}
            <Cell>
              <CustomInput
                fullWidth
                size="small"
                value={row.date}
                placeholder="jj/mm/aaaa"
                onChange={(e) => updateLineItem(row.id, "date", e.target.value)}
                disabled={isViewMode}
                border={false}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              />
            </Cell>

            {/* Description */}
            <Cell>
              <Tooltip title={row.description || ""} arrow>
                <CustomInput
                  size="small"
                  value={row.description}
                  placeholder="Description"
                  onChange={(e) =>
                    updateLineItem(row.id, "description", e.target.value)
                  }
                  disabled={isViewMode}
                  border={false}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      backgroundColor: "transparent",
                      borderRadius: 0,
                      fontSize: 15,
                      fontWeight: 400,
                      color: theme.palette.info.dark,
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      border: "none",
                    },
                    "& .MuiOutlinedInput-input": {
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    },
                  }}
                />
              </Tooltip>
            </Cell>

            {/* Qty */}
            <Cell>
              <CustomInput
                fullWidth
                size="small"
                value={row.qty}
                onChange={(e) => updateLineItem(row.id, "qty", e.target.value)}
                disabled={isViewMode}
                border={false}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              />
            </Cell>

            {/* Unit */}
            <Cell>
              <CustomInput
                fullWidth
                size="small"
                value={row.unit}
                onChange={(e) => updateLineItem(row.id, "unit", e.target.value)}
                disabled={isViewMode}
                border={false}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              />
            </Cell>

            {/* Unit price */}
            <Cell>
              <CustomInput
                fullWidth
                size="small"
                value={row.unitPrice}
                onChange={(e) =>
                  updateLineItem(row.id, "unitPrice", e.target.value)
                }
                disabled={isViewMode}
                border={false}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              />
            </Cell>

            {/* Discount */}
            <Cell>
              <CustomInput
                fullWidth
                size="small"
                value={row.discount}
                onChange={(e) =>
                  updateLineItem(row.id, "discount", e.target.value)
                }
                disabled={isViewMode}
                border={false}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    backgroundColor: "transparent",
                    borderRadius: 0,
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    border: "none",
                  },
                }}
              />
            </Cell>

            {/* Total — read-only, styled differently */}
            <Cell>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.6,
                  borderRadius: 1,
                  bgcolor: alpha(theme.palette.success.main, 0.07),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.18)}`,
                  display: "inline-flex",
                  alignItems: "center",
                  minWidth: 80,
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: theme.palette.success.dark,
                    letterSpacing: "0.01em",
                  }}
                >
                  {row.total || "—"}
                </Typography>
              </Box>
            </Cell>

            {/* Action */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                px: 1,
                py: 0.75,
              }}
            >
              <IconButton
                size="small"
                onClick={() => removeLineItem(row.id)}
                disabled={isViewMode}
                sx={{
                  color: "text.disabled",
                  width: 30,
                  height: 30,
                  borderRadius: 1,
                  transition: "color 0.15s ease, background-color 0.15s ease",
                  "&:hover": {
                    color: "error.main",
                    bgcolor: alpha(theme.palette.error.main, 0.08),
                  },
                }}
              >
                <Trash2 size={14} />
              </IconButton>
            </Box>
          </Box>
        ))}

        {/* ── Footer totals hint ── */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            px: 2,
            py: 1,
            borderTop: `1.5px solid ${alpha(theme.palette.divider, 0.6)}`,
            bgcolor: alpha(theme.palette.action.hover, 0.15),
          }}
        >
          <Typography
            sx={{
              fontSize: "0.72rem",
              color: "text.disabled",
              fontWeight: 500,
              letterSpacing: "0.02em",
            }}
          >
            {lineItems.length} article{lineItems.length > 1 ? "s" : ""}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Inner cell wrapper — consistent vertical padding */
function Cell({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ px: 1, py: 0.75, display: "flex", alignItems: "center" }}>
      {children}
    </Box>
  );
}

/** CSS grid template matching COLUMNS widths + action column */
function buildGridTemplate() {
  const cols = [130, "1fr", 90, 100, 130, 110, 120, 52];
  return cols.map((w) => (typeof w === "number" ? `${w}px` : w)).join(" ");
}
