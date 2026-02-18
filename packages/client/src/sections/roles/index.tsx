import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Add from '@mui/icons-material/Add';
import BorderColorIcon from '@mui/icons-material/BorderColor';
import {
  Box,
  Button,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  Typography,
} from '@mui/material';
import DotSpinner from 'src/components/common/DotSpinner';

import { useTable } from 'src/hooks/use-table';
import { useTableNavigation } from 'src/hooks/useTableNavigation';
import { buildEditUrl } from 'src/utils/navigationHelpers';
import { useAlert } from 'src/contexts/AlertContext';
import { usePermissions } from 'src/hooks/usePermissions';

import { DashboardContent } from 'src/layouts/dashboard';

import { Label } from 'src/components/label';
import { Scrollbar } from 'src/components/scrollbar';
import { DataTableRow } from 'src/components/table/table-row';

import { DataTableHead } from 'src/components/table/table-head';
import { TableNoData } from 'src/components/table/table-no-data';
import { DataTableToolbar } from 'src/components/table/table-toolbar';
import { TableEmptyRows } from 'src/components/table/table-empty-rows';
import { useGetRolesQuery, useDeleteRoleMutation } from 'src/lib/services/roleApi';

export default function RoleView() {
  const table = useTable();
  const { currentPage } = useTableNavigation(table);
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useAlert();
  const { hasAction } = usePermissions();

  const [filterName, setFilterName] = useState('');
  const [deleteRole] = useDeleteRoleMutation();

  const canCreate = hasAction('/roles', 'CREATE');
  const canUpdate = hasAction('/roles', 'UPDATE');
  const canDelete = hasAction('/roles', 'DELETE');

  const { data, isLoading, isError } = useGetRolesQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
    search: filterName,
  });

  const roles = data?.results || [];
  const totalCount = data?.total || 0;

  const notFound = !roles.length && !!filterName;

  const handleNewRole = () => {
    navigate('/role/new');
  };

  const handleDeleteClick = () => {
    showConfirm('Are you sure you want to delete this role?', async () => {
      try {
        await Promise.all(table.selected.map((roleId) => deleteRole(roleId).unwrap()));

        table.onSelectAllRows(false, []);
        showAlert('Role(s) deleted successfully', 'success');
      } catch (error: unknown) {
        const message =
          typeof error === 'object' &&
          error !== null &&
          'data' in error &&
          (error as { data?: { message?: string } })?.data?.message
            ? (error as { data: { message: string } }).data.message
            : 'Failed to delete role. Please try again.';

        showAlert(message, 'error');
      }
    });
  };

  const getRoleTypeColor = (code: string): 'success' | 'warning' | 'error' | 'default' => {
    const colors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
      ADMIN_TYPE: 'error',
      BUSINESS_TYPE: 'success',
    };
    return colors[code] || 'default';
  };

  return (
    <DashboardContent>
      <Box
        sx={{
          mb: 5,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Roles Management
        </Typography>
        {canCreate && (
          <Button variant="contained" color="primary" startIcon={<Add />} onClick={handleNewRole}>
            Add New Role
          </Button>
        )}
      </Box>

      <Card>
        <DataTableToolbar
          numSelected={table.selected.length}
          filterValue={filterName}
          onFilterChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
          }}
          onResetPage={table.onResetPage}
          placeholder="Search for a role..."
          onDelete={canDelete ? handleDeleteClick : undefined}
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: 'unset' }}>
            <Table sx={{ minWidth: 800 }}>
              <DataTableHead
                rowCount={totalCount}
                currentPageRowCount={roles.length}
                numSelected={table.selected.length}
                onSelectAllRows={(checked: boolean) =>
                  table.onSelectAllRows(
                    checked,
                    roles.map((role) => role.id)
                  )
                }
                headLabel={[
                  { id: 'name', label: 'Role Name' },
                  { id: 'description', label: 'Description' },
                  { id: 'role_type', label: 'Type' },
                  { id: 'created_at', label: 'Creation Date' },
                  { id: 'actions', label: 'Actions', align: 'center' },
                ]}
              />
              <TableBody>
                {isLoading ? (
                  <DataTableRow selected={false} onSelectRow={() => {}}>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <DotSpinner />
                      </Box>
                    </TableCell>
                  </DataTableRow>
                ) : isError ? (
                  <DataTableRow selected={false} onSelectRow={() => {}}>
                    <TableCell colSpan={5} align="center" sx={{ py: 10 }}>
                      <Typography color="error">Error loading roles</Typography>
                    </TableCell>
                  </DataTableRow>
                ) : (
                  <>
                    {roles.map((row) => (
                      <DataTableRow
                        key={row.id}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                      >
                        <TableCell component="th" scope="row">
                          <Box
                            sx={{
                              gap: 2,
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            {row.name}
                          </Box>
                        </TableCell>

                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography variant="body2" noWrap>
                            {row.description}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Label color={getRoleTypeColor(row.role_type?.code || '')}>
                            {row.role_type?.name || '-'}
                          </Label>
                        </TableCell>

                        <TableCell>
                          {new Date(row.created_at).toLocaleDateString('en-GB')}
                        </TableCell>

                        <TableCell align="center">
                          {canUpdate && (
                            <IconButton
                              onClick={() =>
                                navigate(buildEditUrl('/role/edit', row.id, currentPage))
                              }
                              sx={{ color: 'rgba(157, 179, 198, 1)' }}
                            >
                              <BorderColorIcon />
                            </IconButton>
                          )}
                        </TableCell>
                      </DataTableRow>
                    ))}

                    <TableEmptyRows
                      height={68}
                      emptyRows={
                        table.page > 0
                          ? Math.max(0, (1 + table.page) * table.rowsPerPage - totalCount)
                          : 0
                      }
                    />

                    {notFound && <TableNoData searchQuery={filterName} />}
                  </>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Scrollbar>

        <TablePagination
          component="div"
          page={table.page}
          count={totalCount}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          rowsPerPageOptions={[5, 10, 25]}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
        />
      </Card>
    </DashboardContent>
  );
}
