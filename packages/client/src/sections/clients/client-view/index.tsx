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

import { useGetClientsQuery } from "src/lib/services/clientApi";
import ClientModal from "./../modal/ClientModal";
import { PageHeader } from "src/layouts/components/page-header";
import { DataTable } from "src/layouts/components/custom-table";
import CustomInput from "src/components/common/CustomInput";
import { Eye, Power, Search } from "lucide-react";
import { CustomPagination } from "src/layouts/components/table-pagination";

export default function ClientView() {
  const theme = useTheme();
  const table = useTable();
  const { hasAction } = usePermissions();
  const [openModal, setOpenModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const handleOpenModal = (client: any = null) => {
    setSelectedClient(client);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedClient(null);
  };

  const columns = [
    {
      id: "name",
      label: "Clients",
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
            {row.fullName?.charAt(0)}
          </Avatar>{" "}
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {" "}
            {row.fullName}{" "}
          </Typography>{" "}
        </Box>
      ),
    },
    {
      id: "email",
      label: "Email",
      render: (row: any) => row.email || "-",
    },
    {
      id: "phone",
      label: "Téléphone",
      render: (row: any) => row.phone || "-",
    },
    {
      id: "company",
      label: "Entreprise",
      render: (row: any) => row.company.name || "-",
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
            borderColor:
              row.status === "active"
                ? theme.palette.success.light
                : theme.palette.error.light,
            backgroundColor:
              row.status === "active"
                ? theme.palette.success.lighter
                : theme.palette.error.lighter,
            color:
              row.status === "active"
                ? theme.palette.success.dark
                : theme.palette.error.dark,
            fontWeight: 600,
            fontSize: 12,
          }}
        >
          {row.status === "active" ? "Actif" : "Inactif"}{" "}
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
            onClick={() => handleOpenModal(row)}
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

  // const canCreate = hasAction("/clients", "WRITE");

  const { data, isLoading, isError } = useGetClientsQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const clients = data?.data || [];
  const totalCount = data?.pagination?.total ?? 0;

  const notFound = !clients.length;

  return (
    <PageHeader
      title="Clients"
      caption="Gérez vos clients et suivez leurs activités."
      actions={[
        {
          label: "Ajouter un client",
          icon: <Add />,
          onClick: () => handleOpenModal(),
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
          placeholder="Rechercher un client..."
          startIcon={<Search size={20} />}
          sx={{ mb: 1.5 }}
        />

        <Scrollbar>
          <DataTable
            columns={columns}
            data={clients}
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

      <ClientModal
        open={openModal}
        onClose={handleCloseModal}
        client={selectedClient}
      />
    </PageHeader>
  );
}
