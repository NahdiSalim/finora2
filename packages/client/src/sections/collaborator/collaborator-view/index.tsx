import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  Typography,
  IconButton,
} from "@mui/material";
import Add from "@mui/icons-material/Add";
import BorderColorIcon from "@mui/icons-material/BorderColor";

import { DashboardContent } from "src/layouts/dashboard";
import { Scrollbar } from "src/components/scrollbar";
import { DataTableHead } from "src/components/table/table-head";
import { DataTableRow } from "src/components/table/table-row";
import { TableEmptyRows } from "src/components/table/table-empty-rows";
import { TableNoData } from "src/components/table/table-no-data";
import DotSpinner from "src/components/common/DotSpinner";

import { useTable } from "src/hooks/use-table";
import { usePermissions } from "src/hooks/usePermissions";

import { useGetCollaboratorsQuery } from "src/lib/services/collaboratorsApi";
import CollaboratorModal from "../modal/collaborator-modal";

export default function CollaboratorView() {
  const table = useTable();
  const { hasAction } = usePermissions();

  const [openModal, setOpenModal] = useState(false);

  const canCreate = hasAction("/collaborators", "WRITE");

  const { data, isLoading, isError } = useGetCollaboratorsQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const collaborators = data?.data || [];
  const totalCount = data?.total || 0;

  const notFound = !collaborators.length;

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: "flex", alignItems: "center" }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>
          Collaborators
        </Typography>

        {canCreate && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenModal(true)}
          >
            Add Collaborator
          </Button>
        )}
      </Box>

      <Card>
        <Scrollbar>
          <TableContainer sx={{ overflow: "unset" }}>
            <Table sx={{ minWidth: 800 }}>
              <DataTableHead
                rowCount={totalCount}
                currentPageRowCount={collaborators.length}
                numSelected={0}
                headLabel={[
                  { id: "fullName", label: "Full Name" },
                  { id: "email", label: "Email" },
                  { id: "phone", label: "Phone" },
                  { id: "position", label: "Position" },
                  { id: "department", label: "Department" },
                  { id: "actions", label: "Actions", align: "center" },
                ]}
              />

              <TableBody>
                {isLoading ? (
                  <DataTableRow selected={false} onSelectRow={() => {}}>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <DotSpinner />
                    </TableCell>
                  </DataTableRow>
                ) : isError ? (
                  <DataTableRow selected={false} onSelectRow={() => {}}>
                    <TableCell colSpan={6} align="center">
                      <Typography color="error">
                        Error loading collaborators
                      </Typography>
                    </TableCell>
                  </DataTableRow>
                ) : (
                  <>
                    {collaborators.map((row) => (
                      <DataTableRow
                        key={row.id}
                        selected={false}
                        onSelectRow={() => {}}
                      >
                        <TableCell>
                          {row.firstName} {row.lastName}
                        </TableCell>

                        <TableCell>{row.email}</TableCell>
                        <TableCell>{row.phone}</TableCell>
                        <TableCell>{row.position || "-"}</TableCell>
                        <TableCell>{row.department || "-"}</TableCell>

                        <TableCell align="center">
                          <IconButton>
                            <BorderColorIcon />
                          </IconButton>
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

                    {notFound && <TableNoData />}
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
        />
      </Card>

      <CollaboratorModal open={openModal} onClose={() => setOpenModal(false)} />
    </DashboardContent>
  );
}
