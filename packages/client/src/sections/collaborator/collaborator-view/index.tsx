import { useState } from "react";
import {
  Box,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  Typography,
  IconButton,
  TableRow,
  TableHead,
  useTheme,
  Avatar,
  alpha,
} from "@mui/material";
import Add from "@mui/icons-material/Add";

import { Scrollbar } from "src/components/scrollbar";
import { TableEmptyRows } from "src/components/table/table-empty-rows";
import { TableNoData } from "src/components/table/table-no-data";
import DotSpinner from "src/components/common/DotSpinner";

import { useTable } from "src/hooks/use-table";
import { usePermissions } from "src/hooks/usePermissions";

import { useGetCollaboratorsQuery } from "src/lib/services/collaboratorsApi";
import CollaboratorModal from "../modal/collaborator-modal";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import { Eye, Power, Search } from "lucide-react";

export default function CollaboratorView() {
  const theme = useTheme();
  const table = useTable();
  const { hasAction } = usePermissions();

  const [openModal, setOpenModal] = useState(false);

  //const canCreate = hasAction("/collaborators", "WRITE");

  const { data, isLoading, isError } = useGetCollaboratorsQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const collaborators = data?.data || [];
  console.log(collaborators);
  const totalCount = data?.total || 0;

  const notFound = !collaborators.length;

  return (
    <PageHeader
      title="Mes collaborateurs"
      caption="Gérez votre equipe et suivez leurs performances ."
      actions={[
        {
          label: "Ajouter un collaborateur",
          icon: <Add />,
          onClick: () => setOpenModal(true),
          variant: "contained",
          color: "primary",
        },
      ]}
    >
      <Card
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: 2,
        }}
      >
        <CustomInput
          fullWidth
          placeholder="Rechercher un collaborateur..."
          startIcon={<Search size={20} />}
          sx={{ mb: 1.5 }}
        />

        <Scrollbar>
          <TableContainer
            sx={{
              overflow: "unset",
              border: 1,
              borderColor: theme.palette.grey[100],
              borderRadius: 2,
            }}
          >
            <Table sx={{ minWidth: 800 }}>
              <TableHead
                sx={{
                  backgroundColor: theme.palette.grey[100],
                }}
              >
                <TableRow>
                  <TableCell sx={{ p: 1, fontWeight: 600 }}>
                    <Typography fontSize={14}>Collaborateurs</Typography>
                  </TableCell>
                  <TableCell sx={{ p: 1, fontWeight: 600 }}>
                    <Typography fontSize={14}> Date Aajout</Typography>
                  </TableCell>
                  <TableCell sx={{ p: 1, fontWeight: 600 }}>Position</TableCell>
                  <TableCell sx={{ p: 1, fontWeight: 600 }}>
                    <Typography fontSize={14}> Nom Utilisateur</Typography>
                  </TableCell>
                  <TableCell sx={{ p: 1, fontWeight: 600 }}>Statut</TableCell>
                  <TableCell sx={{ p: 1, fontWeight: 600 }} align="center">
                    <Typography fontSize={14}> Actions </Typography>
                  </TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 10 }}>
                      <DotSpinner />
                    </TableCell>
                  </TableRow>
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography color="error">
                        Error loading collaborators
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  <>
                    {collaborators.map((row, index) => (
                      <TableRow
                        key={row.id}
                        sx={{
                          backgroundColor:
                            index % 2 === 0
                              ? theme.palette.background.paper
                              : theme.palette.grey[50],
                          "&:hover": {
                            backgroundColor: theme.palette.action.hover,
                          },
                        }}
                      >
                        {/* Collaborateurs - Avatar + Name */}
                        <TableCell sx={{ p: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                            }}
                          >
                            <Avatar
                              sx={{
                                width: 36,
                                height: 36,
                                backgroundColor: theme.palette.primary.main,
                                fontSize: 14,
                                fontWeight: 600,
                              }}
                            >
                              {row.firstName?.charAt(0)}
                              {row.lastName?.charAt(0)}
                            </Avatar>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 500 }}
                            >
                              {row.firstName} {row.lastName}
                            </Typography>
                          </Box>
                        </TableCell>

                        {/* Date d'ajout */}
                        <TableCell sx={{ p: 1 }}>
                          <Typography variant="body2">
                            {row.createdAt
                              ? new Date(row.createdAt).toLocaleDateString(
                                  "fr-FR",
                                )
                              : "-"}
                          </Typography>
                        </TableCell>

                        {/* Position */}
                        <TableCell sx={{ p: 1 }}>
                          <Typography variant="body2">
                            {row.position || "-"}
                          </Typography>
                        </TableCell>

                        {/* Nom d'utilisateur (login) */}
                        <TableCell sx={{ p: 1 }}>
                          <Typography variant="body2">
                            {row.email || row.username || "-"}
                          </Typography>
                        </TableCell>

                        {/* Statut - Chip */}
                        <TableCell sx={{ p: 1 }}>
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              px: 1.5,
                              py: 0.5,
                              borderRadius: 2,
                              border: 1,
                              borderColor: row.isActive
                                ? theme.palette.success.light
                                : theme.palette.error.light,
                              backgroundColor: row.isActive
                                ? theme.palette.success.lighter
                                : theme.palette.error.lighter,
                              color: row.isActive
                                ? theme.palette.success.dark
                                : theme.palette.error.dark,
                              fontWeight: 600,
                              fontSize: 12,
                            }}
                          >
                            {row.isActive ? "Actif" : "Inactif"}
                          </Box>
                        </TableCell>

                        {/* Actions - Two Icon Buttons */}
                        <TableCell align="center" sx={{ p: 1 }}>
                          <Box
                            sx={{
                              display: "flex",
                              gap: 0.5,
                              justifyContent: "center",
                            }}
                          >
                            {/* Edit Button */}
                            <IconButton
                              size="small"
                              sx={{
                                minWidth: 32,
                                height: 32,
                                p: 0,
                                borderRadius: 1.5,
                                border: 1,
                                borderColor: theme.palette.divider,
                                backgroundColor: theme.palette.background.paper,
                                color: theme.palette.text.secondary,
                                transition: theme.transitions.create([
                                  "border-color",
                                  "background-color",
                                  "color",
                                ]),
                                "&:hover": {
                                  borderColor: theme.palette.primary.main,
                                  backgroundColor: alpha(
                                    theme.palette.primary.main,
                                    0.08,
                                  ),
                                  color: theme.palette.primary.main,
                                },
                              }}
                            >
                              <Eye size={18} />
                            </IconButton>

                            {/* Power/Delete Button */}
                            <IconButton
                              size="small"
                              sx={{
                                minWidth: 32,
                                height: 32,
                                p: 0,
                                borderRadius: 1.5,
                                border: 1,
                                borderColor: theme.palette.divider,
                                backgroundColor: theme.palette.common.white,
                                color: row.isActive
                                  ? theme.palette.error.main
                                  : theme.palette.grey[500],
                                transition: theme.transitions.create([
                                  "border-color",
                                  "background-color",
                                  "color",
                                ]),
                                "&:hover": {
                                  borderColor: theme.palette.error.main,
                                  backgroundColor: alpha(
                                    theme.palette.error.main,
                                    0.08,
                                  ),
                                  color: theme.palette.error.main,
                                },
                              }}
                            >
                              <Power size={18} />
                            </IconButton>
                          </Box>
                        </TableCell>
                      </TableRow>
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
    </PageHeader>
  );
}
