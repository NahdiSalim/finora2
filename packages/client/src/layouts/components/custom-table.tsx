import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  useTheme,
} from "@mui/material";

export interface Column<T> {
  id: string;
  label: string;
  align?: "left" | "right" | "center";
  width?: number | string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  isError?: boolean;
  emptyMessage?: string;
  minWidth?: number;
  rowKey: (row: T) => string | number;
}

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  isError = false,
  emptyMessage = "No data available",
  minWidth = 800,
  rowKey,
}: DataTableProps<T>) {
  const theme = useTheme();

  return (
    <TableContainer
      sx={{
        overflow: "auto",
      }}
    >
      <Table sx={{ minWidth }}>
        {/* HEADER */}
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell
                key={col.id}
                align={col.align || "left"}
                sx={{
                  p: 1,
                  fontWeight: 600,
                  width: col.width,
                  backgroundColor: "#f5f5f5",
                }}
              >
                <Typography fontSize={14}>{col.label}</Typography>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        {/* BODY */}
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                align="center"
                sx={{ py: 10 }}
              >
                Loading...
              </TableCell>
            </TableRow>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                <Typography color="error">Error loading data</Typography>
              </TableCell>
            </TableRow>
          ) : data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, index) => (
              <TableRow
                key={rowKey(row)}
                sx={{
                  backgroundColor:
                    index % 2 === 0
                      ? theme.palette.common.white
                      : theme.palette.grey[50],
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                  },
                }}
              >
                {columns.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align || "left"}
                    sx={{ p: 1 }}
                  >
                    {col.render ? col.render(row, index) : (row as any)[col.id]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
