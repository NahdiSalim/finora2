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
import {
  Eye,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useTable } from "src/hooks/use-table";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import { useAlert } from "src/contexts/AlertContext";
import BonCommandeStatusChip from "src/components/bon-commande/BonCommandeStatusChip";
import { buildBonCommandeTemplate } from "src/components/bon-commande/BonCommandeTemplate";
import type { BonCommande, BonCommandeStatus } from "src/types/bon-commande";
import {
  useGetBonCommandeListQuery,
  useDeleteBonCommandeMutation,
} from "src/lib/services/bonCommandeApi";
import { useCreateBonLivraisonMutation } from "src/lib/services/bonLivraisonApi";
import BonCommandeModal from "../modal/BonCommandeModal";
import ConvertToBlModal from "../modal/ConvertToBlModal";
import ViewBonCommandeDrawer from "../drawer";

const PAGE_SIZE = 10;

const formatAmount = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + " DT";

const statusTabs: Array<{ id: "all" | BonCommandeStatus; label: string }> = [
  { id: "all", label: "Tous" },
  { id: "brouillon", label: "Brouillon" },
  { id: "confirme", label: "Confirmé" },
  { id: "annule", label: "Annulé" },
];

export default function BonCommandeView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const table = useTable();
  const { showAlert } = useAlert();

  const [openModal, setOpenModal] = useState(false);
  const [editTarget, setEditTarget] = useState<BonCommande | null>(null);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState<BonCommande | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | BonCommandeStatus>(
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

  const { data, isFetching, isError } = useGetBonCommandeListQuery({
    page: table.page + 1,
    limit: PAGE_SIZE,
    status: statusFilter === "all" ? undefined : statusFilter,
    search: debouncedSearch.trim() || undefined,
  });

  const [deleteBc, { isLoading: isDeleting }] = useDeleteBonCommandeMutation();
  const [createBonLivraison, { isLoading: isConverting }] =
    useCreateBonLivraisonMutation();

  const [convertTarget, setConvertTarget] = useState<BonCommande | null>(null);

  const list = data?.data || [];
  const totalCount = data?.pagination?.totalCount ?? 0;
  const counts = data?.counts;

  const getTabCount = (id: string) => {
    if (!counts) return undefined;
    if (id === "all")
      return (
        (counts.brouillon ?? 0) + (counts.confirme ?? 0) + (counts.annule ?? 0)
      );
    return counts[id as keyof typeof counts];
  };

  const handleConvertToBl = async () => {
    if (!convertTarget) return;
    try {
      const now = new Date();
      const timestamp = String(now.getTime()).slice(-5);
      const number = `BL-${now.getFullYear()}-${timestamp}`;
      const today = now.toISOString().slice(0, 10);

      await createBonLivraison({
        number,
        status: "en_attente",
        tvaRate: convertTarget.tvaRate,
        deliveryDate: today,
        lines: convertTarget.lines,
        notes: convertTarget.notes ?? "",
        supplierId: convertTarget.supplierId,
      }).unwrap();

      showAlert("Bon de livraison créé avec succès", "success");
      setConvertTarget(null);
    } catch {
      showAlert("Erreur lors de la création du bon de livraison", "error");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteBc(deleteId).unwrap();
      showAlert("Bon de commande supprimé", "success");
      setDeleteId(null);
    } catch {
      showAlert("Erreur lors de la suppression", "error");
    }
  };

  const handlePrint = (bc: BonCommande) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildBonCommandeTemplate(bc));
    win.document.close();
    win.focus();
    win.print();
  };

  const columns: Column<BonCommande>[] = [
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
      id: "createdAt",
      label: "Date de création",
      width: 130,
      render: (r) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
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
          <BonCommandeStatusChip status={r.status} />
        </Box>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 200,
      align: "right",
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <CustomButton
            size="small"
            variant="soft"
            onClick={() => setConvertTarget(r)}
            sx={{
              fontSize: "0.75rem",
              px: 1.25,
              py: 0.5,
              minWidth: 0,
              whiteSpace: "nowrap",
            }}
          >
            → Créer BL
          </CustomButton>
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
      title="Bons de commande"
      caption="Gérez vos bons de commande"
      actions={[
        {
          label: "Nouveau BC",
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
          setStatusFilter(id as "all" | BonCommandeStatus);
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
                  Aucun bon de commande trouvé
                </Typography>
              ) : (
                list.map((bc) => (
                  <Card
                    key={bc.id}
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
                          {bc.number}
                        </Typography>
                        <BonCommandeStatusChip status={bc.status} />
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
                            {bc.supplier?.name || "—"}
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
                            {formatAmount(bc.amountTTC)}
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
                        <CustomButton
                          size="small"
                          variant="soft"
                          onClick={() => setConvertTarget(bc)}
                          sx={{
                            fontSize: "0.72rem",
                            px: 1,
                            py: 0.5,
                            whiteSpace: "nowrap",
                            flex: "1 1 auto",
                          }}
                        >
                          → Créer BL
                        </CustomButton>
                        <IconButton
                          size="small"
                          onClick={() => {
                            setSelected(bc);
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
                            setEditTarget(bc);
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
                          onClick={() => handlePrint(bc)}
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
                          onClick={() => setDeleteId(bc.id)}
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
                emptyMessage="Aucun bon de commande trouvé"
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

      <BonCommandeModal
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
      <ViewBonCommandeDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        bonCommande={selected}
        onEdit={(bc) => {
          setEditTarget(bc);
          setOpenDrawer(false);
          setOpenModal(true);
        }}
      />
      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le bon de commande"
        message="Cette action est irréversible."
        isLoading={isDeleting}
      />
      <ConvertToBlModal
        open={!!convertTarget}
        bonCommande={convertTarget}
        isLoading={isConverting}
        onConfirm={handleConvertToBl}
        onClose={() => setConvertTarget(null)}
      />
    </PageHeader>
  );
}
