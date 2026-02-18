import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableCell from '@mui/material/TableCell';

interface DataTableRowProps {
  selected?: boolean;
  onSelectRow?: () => void;
  showCheckbox?: boolean;
  children: React.ReactNode;
  hover?: boolean;
  disabled?: boolean;
}

export function DataTableRow({
  selected = false,
  onSelectRow,
  showCheckbox = true,
  children,
  hover = true,
  disabled = false,
}: DataTableRowProps) {
  return (
    <TableRow hover={hover} tabIndex={-1} role="checkbox" selected={selected}>
      {showCheckbox && (
        <TableCell padding="checkbox">
          <Checkbox disableRipple checked={selected} onChange={onSelectRow} disabled={disabled} />
        </TableCell>
      )}
      {children}
    </TableRow>
  );
}
