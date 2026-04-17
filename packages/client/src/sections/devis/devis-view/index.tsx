import { useState, useEffect } from "react";
import {
  Box,
  Card,
  IconButton,
  Skeleton,
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
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useTable } from "src/hooks/use-table";
import DevisStatusChip from "src/components/devis/DevisStatusChip";
import type { Devis, DevisStatus } from "src/types/devis";

import {
  useGetDevisListQuery,
  useDeleteDevisMutation,
  useDownloadDevisMutation,
} from "src/lib/services/devisApi";

import DevisModal from "../modal/DevisModal";
import ViewDevisDrawer from "../drawer/ViewDevisDrawer";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import { useAlert } from "src/contexts/AlertContext";

const PAGE_SIZE = 10;

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
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [devisToDelete, setDevisToDelete] = useState<number | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      table.onResetPage();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const {
    data: devisData,
    isFetching,
    isError,
  } = useGetDevisListQuery({
    page: table.page + 1,
    limit: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch.trim() || undefined,
  });

  const [deleteDevis, { isLoading: isDeleting }] = useDeleteDevisMutation();
  const [downloadDevis] = useDownloadDevisMutation();

  const devisList = devisData?.data || [];
  const pagination = devisData?.pagination;
  const counts = devisData?.counts;
  const totalCount = pagination?.totalCount ?? 0;

  const getTabCount = (tabId: string): number | undefined => {
    if (!counts) return undefined;
    if (tabId === "all")
      return (
        (counts.en_attente ?? 0) + (counts.accepte ?? 0) + (counts.refuse ?? 0)
      );
    return counts[tabId as keyof typeof counts];
  };

  const openDetails = (devis: Devis) => {
    setSelected(devis);
    setOpenDrawer(true);
  };

  const handleDownloadPdf = async (devis: Devis) => {
    if (devis.pdfUrl) {
      try {
        await downloadDevis(devis.id).unwrap();
      } catch {
        showAlert("Erreur lors du téléchargement du PDF", "error");
      }
    } else {
      showAlert(
        "Le PDF est en cours de génération, veuillez réessayer dans quelques instants",
        "info",
      );
    }
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

  const isInitialLoad = isFetching && devisList.length === 0;

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
      id: "supplier",
      label: "Fournisseur",
      width: 200,
      render: (d) => (
        <Box>
          {d.supplier ? (
            <>
              <Typography variant="body2" fontWeight={600} noWrap>
                {d.supplier.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                display="block"
              >
                {d.supplier.company}
              </Typography>
            </>
          ) : (
            <Typography
              variant="body2"
              color="text.disabled"
              fontStyle="italic"
            >
              —
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: "createdAt",
      label: "Date de création",
      width: 130,
      render: (d) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {new Date(d.createdAt).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "amountTTC",
      label: "TTC",
      width: 130,
      align: "right",
      render: (d) => (
        <Typography variant="body2" fontWeight={700} noWrap sx={{ pr: 1.5 }}>
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
        <Box sx={{ display: "flex", justifyContent: "center" }}>
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
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
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
          count: getTabCount(tab.id),
        }))}
        activeTab={statusFilter}
        onTabChange={(id) => {
          setStatusFilter(id as "all" | DevisStatus);
          table.onResetPage();
        }}
      />

      <Card
        sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          borderTop: "none",
          p: { xs: 1.5, sm: 2.5 },
        }}
      >
        <CustomInput
          fullWidth
          placeholder="Rechercher par fournisseur, société ou matricule..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startIcon={<Search size={18} />}
          sx={{
            mb: 2.5,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.common.white, 0.8),
              transition: "all 0.2s",
              "&:hover, &.Mui-focused": {
                backgroundColor: theme.palette.common.white,
                boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
              },
            },
          }}
        />

        {isError && !isFetching ? (
          <Typography color="error" align="center" sx={{ py: 6 }}>
            Erreur lors du chargement des devis.
          </Typography>
        ) : isInitialLoad ? (
          <Stack spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={52} />
            ))}
          </Stack>
        ) : isMobile ? (
          <>
            <Stack spacing={2}>
              {devisList.length === 0 ? (
                <Typography
                  color="text.secondary"
                  align="center"
                  sx={{ py: 6 }}
                >
                  Aucun devis trouvé
                </Typography>
              ) : (
                devisList.map((devis) => (
                  <Card
                    key={devis.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      transition: "transform 0.2s, box-shadow 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                      },
                    }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography fontWeight={700} color="primary.main">
                          {devis.number}
                        </Typography>
                        <DevisStatusChip status={devis.status} />
                      </Stack>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 1,
                        }}
                      >
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Fournisseur
                          </Typography>
                          <Typography variant="body2" fontWeight={500} noWrap>
                            {devis.supplier?.name || "—"}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Montant TTC
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {formatAmount(devis.amountTTC)}
                          </Typography>
                        </Box>
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
            <Box
              sx={{
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                mt: 2,
              }}
            >
              <CustomPagination
                page={table.page}
                count={totalCount}
                rowsPerPage={PAGE_SIZE}
                onPageChange={table.onChangePage}
              />
            </Box>
          </>
        ) : (
          <>
            <Box sx={{ width: "100%", overflow: "auto" }}>
              <DataTable
                columns={columns}
                data={devisList}
                isLoading={isFetching}
                isError={isError}
                rowKey={(d) => d.id}
                emptyMessage="Aucun devis trouvé"
              />
            </Box>
            {!isError && (
              <Box
                sx={{
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                  mt: 2,
                }}
              >
                <CustomPagination
                  page={table.page}
                  count={totalCount}
                  rowsPerPage={PAGE_SIZE}
                  onPageChange={table.onChangePage}
                />
              </Box>
            )}
          </>
        )}
      </Card>

      <DevisModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={() => table.onResetPage()}
      />

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
