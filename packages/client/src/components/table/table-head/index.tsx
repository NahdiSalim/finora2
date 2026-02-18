import Box from '@mui/material/Box';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableHead from '@mui/material/TableHead';
import TableCell from '@mui/material/TableCell';
import TableSortLabel from '@mui/material/TableSortLabel';

const visuallyHidden = {
  border: 0,
  margin: -1,
  padding: 0,
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  position: 'absolute',
  whiteSpace: 'nowrap',
  clip: 'rect(0 0 0 0)',
} as const;

export interface HeadLabel {
  id: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  width?: string | number;
  minWidth?: string | number;
}

interface TableHeadProps {
  order?: 'asc' | 'desc';
  orderBy?: string;
  rowCount?: number;
  currentPageRowCount?: number; // Nombre d'éléments sur la page actuelle
  numSelected?: number;
  onSort?: (id: string) => void;
  headLabel: HeadLabel[];
  onSelectAllRows?: (checked: boolean) => void;
  showCheckbox?: boolean;
}

export function DataTableHead({
  order = 'asc',
  onSort,
  orderBy = '',
  rowCount = 0,
  currentPageRowCount,
  headLabel,
  numSelected = 0,
  onSelectAllRows,
  showCheckbox = true,
}: TableHeadProps) {
  // Utiliser currentPageRowCount si fourni, sinon rowCount pour rétrocompatibilité
  const effectiveRowCount = currentPageRowCount ?? rowCount;
  return (
    <TableHead>
      <TableRow>
        {showCheckbox && (
          <TableCell padding="checkbox">
            <Checkbox
              indeterminate={numSelected > 0 && numSelected < effectiveRowCount}
              checked={effectiveRowCount > 0 && numSelected === effectiveRowCount}
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                onSelectAllRows?.(event.target.checked)
              }
            />
          </TableCell>
        )}

        {headLabel.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.align || 'left'}
            sortDirection={orderBy === headCell.id ? order : false}
            sx={{ width: headCell.width, minWidth: headCell.minWidth }}
          >
            {onSort ? (
              <TableSortLabel
                hideSortIcon
                active={orderBy === headCell.id}
                direction={orderBy === headCell.id ? order : 'asc'}
                onClick={() => onSort(headCell.id)}
              >
                {headCell.label}
                {orderBy === headCell.id ? (
                  <Box sx={{ ...visuallyHidden }}>
                    {order === 'desc' ? 'sorted descending' : 'sorted ascending'}
                  </Box>
                ) : null}
              </TableSortLabel>
            ) : (
              headCell.label
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}
