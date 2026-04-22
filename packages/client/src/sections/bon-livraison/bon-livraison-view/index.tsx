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
import { Eye, Pencil, Plus, Printer, Search, Trash2 } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import CustomInput from "src/components/common/CustomInput";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useTable } from "src/hooks/use-table";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import { useAlert } from "src/contexts/AlertContext";
import BonLivraisonStatusChip from "src/components/bon-livraison/BonLivraisonStatusChip";
import { buildBonLivraisonTemplate } from "src/components/bon-livraison/BonLivraisonTemplate";
import type { BonLivraison, BonLivraisonStatus } from "src/types/bon-livraison";
import {
  useGetBonLivraisonListQuery,
  useDeleteBonLivraisonMutation,
} from "src/lib/services/bonLivraisonApi";
import BonLivraisonModal from "../modal/BonLivraisonModal";
import ViewBonLivraisonDrawer from "../drawer";

const PAGE_SIZE = 10;

const formatAmount = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + " DT";

const statusTabs: Array<{ id: "all" | BonLivraisonStatus; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "en_attente", label: "En attente" },
  { id: "livre", label: "Livré" },
  { id: "annule", label: "Annulé" },
];

export default function BonLivraisonView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const table = useTable();
  const { showAlert } = useAlert();

  const [openModal, setOpenModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BonLivraison | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState<BonLivraison | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | BonLivraisonStatus>(
    "all",
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      table.onResetPage();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, isFetching, isError } = useGetBonLivraisonListQuery({
    page: table.page + 1,
    limit: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch.trim() || undefined,
  });

  const [deleteBl, { isLoading: isDeleting }] = useDeleteBonLivraisonMutation();

  const list = data?.data || [];
  const totalCount = data?.pagination?.totalCount ?? 0;
  const counts = data?.counts;

  const getTabCount = (id: string) => {
    if (!counts) return undefined;
    if (id === "all")
      return (
        (counts.en_attente ?? 0) + (counts.livre ?? 0) + (counts.annule ?? 0)
      );
    return counts[id as keyof typeof counts];
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBl(deleteId).unwrap();
      showAlert("Bon de livraison supprimé", "success");
      setDeleteId(null);
    } catch {
      showAlert("Erreur lors de la suppression", "error");
    }
  };

  const handlePrint = (bl: BonLivraison) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildBonLivraisonTemplate(bl));
    win.document.close();
    win.focus();
    win.print();
  };

  const columns: Column<BonLivraison>[] = [
    {
      id: "number",
      label: "Numéro",
      width: 140,
      render: (r) => (
        <Typography
          variant="body2"
          fontWeight={600}
          color="primary.main"
          noWrap
        >
          {r.number}
        </Typography>
      ),
    },
    {
      id: "supplier",
      label: "Fournisseur",
      width: 200,
      render: (r) =>
        r.supplier ? (
          <Box>
            <Typography variant="body2" fontWeight={600} noWrap>
              {r.supplier.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              noWrap
              display="block"
            >
              {r.supplier.company}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" color="text.disabled" fontStyle="italic">
            —
          </Typography>
        ),
    },
    {
      id: "deliveryDate",
      label: "Date de livraison",
      width: 140,
      render: (r) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {new Date(r.deliveryDate).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "amountTTC",
      label: "TTC",
      width: 130,
      align: "right",
      render: (r) => (
        <Typography variant="body2" fontWeight={700} noWrap sx={{ pr: 1.5 }}>
          {formatAmount(r.amountTTC)}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Statut",
      width: 120,
      align: "center",
      render: (r) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <BonLivraisonStatusChip status={r.status} />
        </Box>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 160,
      align: "right",
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <IconButton
            size="small"
            onClick={() => {
              setSelected(r);
              setOpenDrawer(true);
            }}
            sx={{
              width: 34,
              height: 34,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 2,
              color: "text.secondary",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Eye size={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setEditTarget(r);
              setOpenModal(true);
            }}
            sx={{
              width: 34,
              height: 34,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 2,
              color: "text.secondary",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Pencil size={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handlePrint(r)}
            sx={{
              width: 34,
              height: 34,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 2,
              color: "text.secondary",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: "primary.main",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Printer size={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => setDeleteId(r.id)}
            sx={{
              width: 34,
              height: 34,
              border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              borderRadius: 2,
              color: "text.secondary",
              transition: "all 0.2s",
              "&:hover": {
                borderColor: theme.palette.error.main,
                backgroundColor: alpha(theme.palette.error.main, 0.08),
                color: "error.main",
                transform: "translateY(-2px)",
              },
            }}
          >
            <Trash2 size={16} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  const isInitialLoad = isFetching && list.length === 0;

  return (
    <PageHeader
      title="Bons de livraison"
      caption="Gérez vos bons de livraison"
      actions={[
        {
          label: "Nouveau BL",
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
        tabs={statusTabs.map((t) => ({
          id: t.id,
          label: t.label,
          count: getTabCount(t.id),
        }))}
        activeTab={statusFilter}
        onTabChange={(id) => {
          setStatusFilter(id as "all" | BonLivraisonStatus);
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
          placeholder="Rechercher par fournisseur..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startIcon={<Search size={18} />}
          sx={{
            mb: 2.5,
            "& .MuiOutlinedInput-root": {
              borderRadius: 3,
              backgroundColor: alpha(theme.palette.common.white, 0.8),
            },
          }}
        />

        {isError && !isFetching ? (
          <Typography color="error" align="center" sx={{ py: 6 }}>
            Erreur lors du chargement.
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
              {list.length === 0 ? (
                <Typography
                  color="text.secondary"
                  align="center"
                  sx={{ py: 6 }}
                >
                  Aucun bon de livraison trouvé
                </Typography>
              ) : (
                list.map((bl) => (
                  <Card
                    key={bl.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 3 }}
                  >
                    <Stack spacing={1.5}>
                      {/* Header */}
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Typography fontWeight={700} color="primary.main">
                          {bl.number}
                        </Typography>
                        <BonLivraisonStatusChip status={bl.status} />
                      </Stack>
                      {/* Info grid */}
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
                            {bl.supplier?.name || "—"}
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
                            {formatAmount(bl.amountTTC)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Date livraison
                          </Typography>
                          <Typography variant="body2" fontWeight={500}>
                            {new Date(bl.deliveryDate).toLocaleDateString(
                              "fr-FR",
                            )}
                          </Typography>
                        </Box>
                      </Box>
                      {/* Actions row */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                          pt: 0.5,
                          borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelected(bl);
                            setOpenDrawer(true);
                          }}
                          sx={{
                            width: 34,
                            height: 34,
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                            borderRadius: 2,
                            color: "text.secondary",
                          }}
                        >
                          <Eye size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditTarget(bl);
                            setOpenModal(true);
                          }}
                          sx={{
                            width: 34,
                            height: 34,
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                            borderRadius: 2,
                            color: "text.secondary",
                          }}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => handlePrint(bl)}
                          sx={{
                            width: 34,
                            height: 34,
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                            borderRadius: 2,
                            color: "text.secondary",
                          }}
                        >
                          <Printer size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteId(bl.id)}
                          sx={{
                            width: 34,
                            height: 34,
                            border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                            borderRadius: 2,
                            color: "error.main",
                          }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </Box>
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
                data={list}
                isLoading={isFetching}
                isError={isError}
                rowKey={(r) => r.id}
                emptyMessage="Aucun bon de livraison trouvé"
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

      <BonLivraisonModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditTarget(null);
        }}
        onCreate={() => {
          table.onResetPage();
          setEditTarget(null);
        }}
        initialData={editTarget}
      />
      <ViewBonLivraisonDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        bonLivraison={selected}
        onEdit={(bl) => {
          setEditTarget(bl);
          setOpenDrawer(false);
          setOpenModal(true);
        }}
      />
      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le bon de livraison"
        message="Cette action est irréversible."
        isLoading={isDeleting}
      />
    </PageHeader>
  );
}
