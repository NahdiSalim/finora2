import Box from "@mui/material/Box";

type SpreadsheetTableProps = {
  /** Header row (column names). If empty, first data row is used as header. */
  headers?: string[];
  /** Data rows (header excluded). */
  rows: string[][];
  /** compact = card thumbnail (tiny font), full = modal (readable font) */
  variant: "compact" | "full";
};

export default function SpreadsheetTable({
  headers,
  rows,
  variant,
}: SpreadsheetTableProps) {
  const isCompact = variant === "compact";

  // Build the full 2-D array: header row first, then data rows
  const allRows: string[][] =
    headers && headers.length > 0 ? [headers, ...rows] : rows;

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        overflow: isCompact ? "hidden" : "auto",
        ...(isCompact && { position: "absolute", inset: 0, p: "3px" }),
      }}
    >
      <Box
        component="table"
        sx={{
          width: "100%",
          borderCollapse: "collapse",
          tableLayout: isCompact ? "fixed" : "auto",
          fontSize: isCompact ? 5.5 : 12,
        }}
      >
        <tbody>
          {allRows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <Box
                  component="td"
                  key={ci}
                  sx={{
                    border: `${isCompact ? 0.5 : 1}px solid #D1FAE5`,
                    px: isCompact ? "2px" : 1.25,
                    py: isCompact ? "1px" : 0.75,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    ...(isCompact && { maxWidth: 0 }),
                    lineHeight: isCompact ? 1.3 : 1.5,
                    backgroundColor:
                      ri === 0
                        ? "#DCFCE7"
                        : ri % 2 === 0
                          ? "#F0FDF4"
                          : "#FFFFFF",
                    color: ri === 0 ? "#166534" : "#374151",
                    fontWeight: ri === 0 ? 600 : 400,
                  }}
                >
                  {cell}
                </Box>
              ))}
            </tr>
          ))}
        </tbody>
      </Box>
    </Box>
  );
}
