import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";

import BorderColorIcon from "@mui/icons-material/BorderColor";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import type { SelectChangeEvent } from "@mui/material";
import {
  Box,
  Card,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  Typography,
} from "@mui/material";
import DotSpinner from "src/components/common/DotSpinner";

import { PageHeader } from "src/layouts/components/page-header";

import { useTable } from "src/hooks/use-table";
import { useTableNavigation } from "src/hooks/useTableNavigation";
import { buildEditUrl } from "src/utils/navigationHelpers";
import {
  useGetUsersQuery,
  useManageUserStatusMutation,
} from "src/lib/services/usersApi";
import { useAlert } from "src/contexts/AlertContext";
import { usePermissions } from "src/hooks/usePermissions";

import { Label } from "src/components/label";
import { Scrollbar } from "src/components/scrollbar";
import { DataTableRow } from "src/components/table/table-row";

import { DataTableHead } from "src/components/table/table-head";
import { TableNoData } from "src/components/table/table-no-data";
import { DataTableToolbar } from "src/components/table/table-toolbar";
import { TableEmptyRows } from "src/components/table/table-empty-rows";
import { PageTitleHeader } from "src/layouts/components/page-title-header";

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    ACTIVE: "Active",
    PENDING: "Pending",
    BLOCKED: "Blocked",
    DELETED: "Deleted",
  };
  return statusLabels[status] || status;
};

const getStatusColor = (
  status: string,
): "success" | "warning" | "error" | "default" => {
  const statusColors: Record<
    string,
    "success" | "warning" | "error" | "default"
  > = {
    ACTIVE: "success",
    PENDING: "warning",
    BLOCKED: "error",
    DELETED: "default",
    VERIFIED: "success",
    REJECTED: "error",
  };
  return statusColors[status] || "default";
};

export default function UserView() {
  const table = useTable();
  const { currentPage } = useTableNavigation(table);
  const navigate = useNavigate();
  const { showConfirm, showAlert } = useAlert();
  const { hasAction } = usePermissions();
  const [searchValue, setSearchValue] = useState("");

  const [filterName, setFilterName] = useState("");
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("");

  const canCreate = hasAction("/users", "WRITE");
  const canUpdate = hasAction("/users", "UPDATE");
  const canDelete = hasAction("/users", "DELETE");

  const { data, isLoading, isError } = useGetUsersQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
    search: filterName,
    clientVerificationStatus: verificationStatusFilter || undefined,
    isActiveStatus: activeStatusFilter || undefined,
  });

  const [manageUserStatus] = useManageUserStatusMutation();

  const users = data?.data || [];
  const totalCount = data?.pagination?.total || 0;

  const notFound = !users.length && !!filterName;

  const handleNewUser = () => {
    navigate("/user/new");
  };

  const handleDeleteClick = useCallback(() => {
    showConfirm("Are you sure you want to delete this user?", async () => {
      try {
        await Promise.all(
          table.selected.map((userId) =>
            manageUserStatus({ userId, status: "DELETED" }).unwrap(),
          ),
        );

        table.onSelectAllRows(false, []);
        showAlert("Users deleted successfully", "success");
      } catch {
        showAlert("Error deleting users", "error");
      }
    });
  }, [table, manageUserStatus, showConfirm, showAlert]);

  return (
    <PageHeader title="Users List">
      <PageTitleHeader
        title="Users List"
        caption="Manage user information and permissions"
      />

      <Card>
        <DataTableToolbar
          numSelected={table.selected.length}
          filterValue={filterName}
          onFilterChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setFilterName(event.target.value);
          }}
          onResetPage={table.onResetPage}
          placeholder="Search for a user..."
          onDelete={canDelete ? handleDeleteClick : undefined}
          filters={
            table.selected.length === 0 ? (
              <>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Verification Status</InputLabel>
                  <Select
                    value={verificationStatusFilter}
                    label="Verification Status"
                    onChange={(e: SelectChangeEvent) => {
                      setVerificationStatusFilter(e.target.value);
                      table.onResetPage();
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="PENDING">Pending</MenuItem>
                    <MenuItem value="VERIFIED">Verified</MenuItem>
                    <MenuItem value="REJECTED">Rejected</MenuItem>
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={activeStatusFilter}
                    label="Status"
                    onChange={(e: SelectChangeEvent) => {
                      setActiveStatusFilter(e.target.value);
                      table.onResetPage();
                    }}
                  >
                    <MenuItem value="">All</MenuItem>
                    <MenuItem value="true">Active</MenuItem>
                    <MenuItem value="false">Blocked</MenuItem>
                  </Select>
                </FormControl>
              </>
            ) : null
          }
        />

        <Scrollbar>
          <TableContainer sx={{ overflow: "unset" }}>
            <Table sx={{ minWidth: 800 }}>
              <DataTableHead
                rowCount={totalCount}
                currentPageRowCount={users.length}
                numSelected={table.selected.length}
                onSelectAllRows={(checked: boolean) =>
                  table.onSelectAllRows(
                    checked,
                    users.map((user) => user.id),
                  )
                }
                headLabel={[
                  { id: "full_name", label: "Full Name" },
                  { id: "email", label: "Email" },
                  { id: "role", label: "Role" },
                  { id: "verification_status", label: "Verification Status" },
                  { id: "status", label: "Status" },
                  { id: "actions", label: "Actions", align: "center" },
                ]}
              />
              <TableBody>
                {isLoading ? (
                  <DataTableRow selected={false} onSelectRow={() => {}}>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Box sx={{ display: "flex", justifyContent: "center" }}>
                        <DotSpinner />
                      </Box>
                    </TableCell>
                  </DataTableRow>
                ) : isError ? (
                  <DataTableRow selected={false} onSelectRow={() => {}}>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <Typography color="error">Error loading users</Typography>
                    </TableCell>
                  </DataTableRow>
                ) : (
                  <>
                    {users.map((row) => (
                      <DataTableRow
                        key={row.id}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                      >
                        <TableCell component="th" scope="row">
                          <Box
                            sx={{
                              gap: 2,
                              display: "flex",
                              alignItems: "center",
                            }}
                          >
                            {/* <Avatar alt={row.full_name}>
                              {row.full_name.charAt(0).toUpperCase()}
                            </Avatar> */}
                            {row.full_name}
                          </Box>
                        </TableCell>

                        <TableCell>{row.email || "-"}</TableCell>

                        <TableCell>
                          {typeof row.role === "string"
                            ? row.role
                            : row.role.code}
                        </TableCell>

                        <TableCell>
                          {typeof row.role === "object" &&
                          row.role.code === "CLIENT" &&
                          row.client?.residencyDocuments?.[0] ? (
                            <Label
                              color={getStatusColor(
                                row.client.residencyDocuments[0]
                                  .verification_status,
                              )}
                            >
                              {
                                row.client.residencyDocuments[0]
                                  .verification_status
                              }
                            </Label>
                          ) : (
                            "-"
                          )}
                        </TableCell>

                        <TableCell>
                          <Label
                            color={getStatusColor(
                              row.status ||
                                (row.is_active ? "ACTIVE" : "BLOCKED"),
                            )}
                          >
                            {getStatusLabel(
                              row.status ||
                                (row.is_active ? "ACTIVE" : "BLOCKED"),
                            )}
                          </Label>
                        </TableCell>

                        <TableCell align="center">
                          {canUpdate && (
                            <>
                              <IconButton
                                onClick={() =>
                                  navigate(
                                    buildEditUrl(
                                      "/user/edit",
                                      row.id,
                                      currentPage,
                                    ),
                                  )
                                }
                                sx={{ color: "rgba(157, 179, 198, 1)" }}
                              >
                                <BorderColorIcon />
                              </IconButton>
                              {typeof row.role === "object" &&
                                row.role.code === "CLIENT" && (
                                  <IconButton
                                    onClick={() =>
                                      navigate(`/user/${row.id}/documents`)
                                    }
                                    sx={{ color: "rgba(76, 175, 80, 1)" }}
                                    title="Validate Documents"
                                  >
                                    <VerifiedUserIcon />
                                  </IconButton>
                                )}
                            </>
                          )}
                        </TableCell>
                      </DataTableRow>
                    ))}

                    <TableEmptyRows
                      height={68}
                      emptyRows={
                        table.page > 0
                          ? Math.max(
                              0,
                              (1 + table.page) * table.rowsPerPage - totalCount,
                            )
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
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count}`
          }
        />
      </Card>
    </PageHeader>
  );
}
