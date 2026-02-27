import { useState } from "react";
import {
  Avatar,
  Box,
  Card,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import Add from "@mui/icons-material/Add";

import { Scrollbar } from "src/components/scrollbar";

import { useTable } from "src/hooks/use-table";
import { usePermissions } from "src/hooks/usePermissions";

import { useGetCollaboratorsQuery } from "src/lib/services/collaboratorsApi";
import CollaboratorModal from "../modal/collaborator-modal";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import { Eye, Power, Search } from "lucide-react";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { DataTable } from "src/layouts/components/custom-table";

export default function CollaboratorView() {
  const theme = useTheme();
  const table = useTable();
  const { hasAction } = usePermissions();

  const [openModal, setOpenModal] = useState(false);

  const columns = [
    {
      id: "name",
      label: "Collaborateurs",
      render: (row: any) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {" "}
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
            {row.lastName?.charAt(0)}{" "}
          </Avatar>{" "}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {" "}
            {row.firstName} {row.lastName}{" "}
          </Typography>{" "}
        </Box>
      ),
    },
    {
      id: "createdAt",
      label: "Date Ajout",
      render: (row: any) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("fr-FR")
          : "-",
    },
    {
      id: "position",
      label: "Position",
    },
    {
      id: "email",
      label: "Nom Utilisateur",
      render: (row: any) => row.email || row.username || "-",
    },
    {
      id: "status",
      label: "Statut",
      render: (row: any) => (
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
          {" "}
          {row.isActive ? "Actif" : "Inactif"}{" "}
        </Box>
      ),
    },
    {
      id: "Actions",
      label: "Actions",
      render: (row: any) => (
        <Box sx={{ display: "flex", gap: 0.5, justifyContent: "center" }}>
          {/* Edit Button */}{" "}
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
                backgroundColor: (theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
            }}
          >
            {" "}
            <Eye size={18} />{" "}
          </IconButton>{" "}
          {/* Power/Delete Button */}{" "}
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
                backgroundColor: theme.palette.error.lighter,
                color: theme.palette.error.main,
              },
            }}
          >
            {" "}
            <Power size={18} />{" "}
          </IconButton>{" "}
        </Box>
      ),
    },
  ];

  //const canCreate = hasAction("/collaborators", "WRITE");

  const { data, isLoading, isError } = useGetCollaboratorsQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const collaborators = data?.data || [];
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
          <DataTable
            columns={columns}
            data={collaborators}
            isLoading={isLoading}
            isError={isError}
            rowKey={(row) => row.id}
          />
        </Scrollbar>

        <CustomPagination
          page={table.page}
          count={totalCount}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
        />
      </Card>

      <CollaboratorModal open={openModal} onClose={() => setOpenModal(false)} />
    </PageHeader>
  );
}
