import { useState } from "react";
import {
  Box,
  Card,
  IconButton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Download, Eye, Plus, Search } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import DevisStatusChip from "src/components/devis/DevisStatusChip";
import type { Devis, DevisStatus } from "src/types/devis";
import { useTable } from "src/hooks/use-table";
import { CustomPagination } from "src/layouts/components/table-pagination";

import {
  useGetDevisListQuery,
  useDeleteDevisMutation,
  useDownloadDevisMutation,
} from "src/lib/services/devisApi";

import DevisModal from "../modal/DevisModal";
import ViewDevisDrawer from "../drawer/ViewDevisDrawer";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import { useAlert } from "src/contexts/AlertContext";

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const statusTabs: Array<{ id: "all" | DevisStatus; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "en_attente", label: "En attente" },
  { id: "accepte", label: "Accepté" },
  { id: "refuse", label: "Refusé" },
];

export default function DevisView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const table = useTable();
  const { showAlert } = useAlert();

  const [openModal, setOpenModal] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState<Devis | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | DevisStatus>("all");
  const [search, setSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [devisToDelete, setDevisToDelete] = useState<number | null>(null);

  // API hooks
  const {
    data: devisData,
    isLoading,
    isError,
  } = useGetDevisListQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: search.trim() || undefined,
  });

  const [deleteDevis, { isLoading: isDeleting }] = useDeleteDevisMutation();
  const [downloadDevis] = useDownloadDevisMutation();

  const devisList = devisData?.data || [];
  const pagination = devisData?.pagination;

  const openDetails = (devis: Devis) => {
    setSelected(devis);
    setOpenDrawer(true);
  };

  const handleDownloadPdf = async (devis: Devis) => {
    if (devis.pdfUrl) {
      try {
        const { blob, filename } = await downloadDevis(devis.id).unwrap();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      } catch (error) {
        showAlert("Erreur lors du téléchargement du PDF", "error");
      }
    } else {
      showAlert(
        "Le PDF est en cours de génération, veuillez réessayer dans quelques instants",
        "info",
      );
    }
  };

  const handleDeleteClick = (id: number) => {
    setDevisToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!devisToDelete) return;

    try {
      await deleteDevis(devisToDelete).unwrap();
      showAlert("Devis supprimé avec succès", "success");
      setShowDeleteModal(false);
      setDevisToDelete(null);
    } catch (error: any) {
      showAlert(
        error?.data?.message || "Erreur lors de la suppression du devis",
        "error",
      );
    }
  };

  const columns: Column<Devis>[] = [
    {
      id: "number",
      label: "Numéro",
      width: 140,
      render: (d) => (
        <Typography
          variant="body2"
          fontWeight={600}
          color="primary.main"
          noWrap
        >
          {d.number}
        </Typography>
      ),
    },
    {
      id: "createdAt",
      label: "Date de création",
      width: 140,
      render: (d) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {new Date(d.createdAt).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "validUntil",
      label: "Valide jusqu'au",
      width: 140,
      render: (d) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {new Date(d.validUntil).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "amountTTC",
      label: "TTC",
      width: 140,
      align: "right",
      render: (d) => (
        <Typography variant="body2" fontWeight={700} noWrap>
          {formatAmount(d.amountTTC)}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Statut",
      width: 130,
      align: "center",
      render: (d) => (
        <Box
          sx={{ display: "flex", justifyContent: "center", minWidth: "100px" }}
        >
          <DevisStatusChip status={d.status} />
        </Box>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 110,
      align: "right",
      render: (d) => (
        <Stack
          direction="row"
          justifyContent="flex-end"
          spacing={1}
          sx={{ minWidth: "80px" }}
        >
          <IconButton
            onClick={() => openDetails(d)}
            size="small"
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 1.5,
              "&:hover": {
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Eye size={16} />
          </IconButton>
          <IconButton
            onClick={() => handleDownloadPdf(d)}
            size="small"
            sx={{
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 1.5,
              "&:hover": {
                backgroundColor: alpha(theme.palette.success.main, 0.08),
              },
            }}
          >
            <Download size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <PageHeader
      title="Devis"
      caption="Créez et gérez vos devis commerciaux en toute simplicité"
      actions={[
        {
          label: "Nouveau devis",
          icon: <Plus size={18} />,
          onClick: () => setOpenModal(true),
          sx: {
            borderRadius: 2.5,
            px: 3,
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.3)}`,
            },
          },
        },
      ]}
    >
      <FolderTabNavigation
        tabs={statusTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count:
            tab.id === "all"
              ? devisList.length
              : devisList.filter((d) => d.status === tab.id).length,
        }))}
        activeTab={statusFilter}
        onTabChange={(id) => setStatusFilter(id as "all" | DevisStatus)}
      />

      <Card
        sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          borderTop: "none",
          p: { xs: 2, md: 3 },
          width: "100%",
          overflow: "hidden", // Prevents card from bleeding horizontally
        }}
      >
        <CustomInput
          placeholder="Rechercher par numéro ou description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startIcon={<Search size={18} />}
          sx={{ mb: 3 }}
        />

        {isMobile ? (
          <Stack spacing={2}>
            {isLoading ? (
              <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                Chargement...
              </Typography>
            ) : isError ? (
              <Typography color="error" align="center" sx={{ py: 6 }}>
                Erreur lors du chargement des devis
              </Typography>
            ) : devisList.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                Aucun devis trouvé
              </Typography>
            ) : (
              devisList.map((devis) => (
                <Card
                  key={devis.id}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700}>{devis.number}</Typography>
                      <DevisStatusChip status={devis.status} />
                    </Stack>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Valide jusqu&apos;au:{" "}
                        {new Date(devis.validUntil).toLocaleDateString("fr-FR")}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700}>
                        TTC: {formatAmount(devis.amountTTC)}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <CustomButton
                        fullWidth
                        variant="outlined"
                        size="small"
                        onClick={() => openDetails(devis)}
                      >
                        Détails
                      </CustomButton>
                      <CustomButton
                        fullWidth
                        variant="soft"
                        size="small"
                        onClick={() => handleDownloadPdf(devis)}
                      >
                        PDF
                      </CustomButton>
                    </Stack>
                  </Stack>
                </Card>
              ))
            )}
          </Stack>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={devisList}
              rowKey={(d) => d.id}
              emptyMessage={
                isLoading
                  ? "Chargement..."
                  : isError
                    ? "Erreur lors du chargement"
                    : "Aucun devis trouvé"
              }
            />

            {pagination && pagination.totalPages > 1 && (
              <CustomPagination
                count={pagination.totalCount}
                rowsPerPage={table.rowsPerPage}
                page={table.page}
                onPageChange={table.onChangePage}
              />
            )}
          </>
        )}
      </Card>

      <DevisModal open={openModal} onClose={() => setOpenModal(false)} />

      <ViewDevisDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        devis={selected}
        onDownloadPdf={handleDownloadPdf}
      />

      <DeleteConfirmModal
        open={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        title="Supprimer le devis"
        message="Êtes-vous sûr de vouloir supprimer ce devis ? Cette action est irréversible."
        isLoading={isDeleting}
      />
    </PageHeader>
  );
}
