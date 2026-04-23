import { useState, useEffect } from "react";
import {
  Box,
  Card,
  IconButton,
  Stack,
  Typography,
  alpha,
  useMediaQuery,
  useTheme,
  Skeleton,
} from "@mui/material";
import { Download, Eye, Plus, Search } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useTable } from "src/hooks/use-table";
import FactureStatusChip from "src/components/facture/FactureStatusChip";
import FacturePaymentChip from "src/components/facture/FacturePaymentChip";
import FactureAnalyticsCards from "src/components/facture/FactureAnalyticsCards";
import type { Facture, DiscountType, FactureStatus } from "src/types/facture";
import {
  useGetInvoicesQuery,
  type Invoice,
} from "src/lib/services/invoicesApi";
import { buildFactureTemplate } from "src/components/facture/FactureTemplate";
import FactureModal from "../modal/FactureModal";
import ViewFactureDrawer from "../drawer/ViewFactureDrawer";

// ─── Status mappings ──────────────────────────────────────────────────────────

const backendStatusMap: Record<string, FactureStatus> = {
  draft: "draft",
  sent: "sent",
  paid: "paid",
  partial: "partial",
  overdue: "overdue",
  cancelled: "cancelled",
};

const uiStatusToBackend: Record<string, string | undefined> = {
  all: undefined,
  draft: "draft",
  sent: "sent",
  overdue: "overdue",
  paid: "paid",
  partial: "partial",
};

const PAGE_SIZE = 10;

// ─── Mapper ───────────────────────────────────────────────────────────────────

function invoiceToFacture(inv: Invoice): Facture {
  return {
    id: inv.id,
    number: inv.invoiceNumber,
    invoiceNumber: inv.invoiceNumber,
    status: backendStatusMap[inv.status] ?? "draft",
    tvaRate: Number(inv.vatRate),
    dueDate: inv.dueDate,
    discountType: (inv.discountType ?? "percentage") as DiscountType,
    discountValue: Number(inv.discountValue ?? 0),
    discountAmount:
      inv.discountAmount != null ? Number(inv.discountAmount) : null,
    supplierId: inv.supplierId,
    supplier: (inv as any).supplier ?? null,
    company: inv.company ?? undefined,
    lines: inv.lines.map((l) => ({
      id: l.id,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
    })),
    notes: inv.notes ?? "",
    amountHT: Number(inv.subtotal),
    amountTVA: Number(inv.vatAmount),
    amountTTC: Number(inv.total),
    amountPaid: Number(inv.amountPaid),
    amountRemaining: Number(inv.remainingAmount),
    createdAt: inv.createdAt,
  };
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const statusTabs: Array<{ id: "all" | FactureStatus; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "draft", label: "Brouillon" },
  { id: "sent", label: "Envoyée" },
  { id: "overdue", label: "En retard" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FactureView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const table = useTable();

  const [openModal, setOpenModal] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState<Facture | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | FactureStatus>(
    "all",
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      table.onResetPage();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const {
    data: apiResponse,
    isFetching,
    isError,
  } = useGetInvoicesQuery({
    page: table.page + 1,
    limit: PAGE_SIZE,
    status: uiStatusToBackend[statusFilter],
    search: debouncedSearch || undefined,
  });

  const invoices: Facture[] = (apiResponse?.data ?? []).map(invoiceToFacture);
  const totalCount = apiResponse?.pagination?.totalCount ?? 0;
  const counts = apiResponse?.counts;
  const analytics = apiResponse?.analytics;

  const getTabCount = (tabId: string): number | undefined => {
    if (!counts) return undefined;
    if (tabId === "all") {
      return (
        (counts.draft ?? 0) +
        (counts.paid ?? 0) +
        (counts.partial ?? 0) +
        (counts.overdue ?? 0) +
        (counts.cancelled ?? 0)
      );
    }
    // "sent" is grouped into draft count on backend — show separately if available
    return counts[tabId as keyof typeof counts];
  };

  const handleStatusChange = (id: string) => {
    setStatusFilter(id as "all" | FactureStatus);
    table.onResetPage();
  };

  const openDetails = (facture: Facture) => {
    setSelected(facture);
    setOpenDrawer(true);
  };

  const handleDownloadPdf = (facture: Facture) => {
    // Build the HTML with a self-executing print script inside the child.
    // Use a Blob URL + noopener so the child opens in a separate renderer
    // process — this is the only way to guarantee the parent's JS thread
    // is never blocked by the child's print dialog.
    const html = buildFactureTemplate(facture).replace(
      "</body>",
      "<script>window.onload=function(){window.focus();window.print();}</script></body>",
    );
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    // Revoke after a short delay — the browser has already started loading it
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  // Called after a draft is published — close drawer and refresh
  const handlePublished = () => {
    setOpenDrawer(false);
    setSelected(null);
    table.onResetPage();
  };

  // ── Desktop columns ───────────────────────────────────────────────────────
  const columns: Column<Facture>[] = [
    {
      id: "number",
      label: "Numéro",
      width: 140,
      render: (f) => (
        <Typography variant="body2" fontWeight={600} color="primary.main">
          {f.number}
        </Typography>
      ),
    },
    {
      id: "createdAt",
      label: "Création",
      width: 110,
      render: (f) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(f.createdAt).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "supplier",
      label: "Fournisseur",
      width: 180,
      render: (f) => (
        <Box>
          {f.supplier ? (
            <>
              <Typography variant="body2" fontWeight={600} noWrap>
                {f.supplier.name}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                display="block"
              >
                {f.supplier.company}
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
      id: "amountTTC",
      label: "Montant TTC",
      width: 140,
      align: "right",
      render: (f) => (
        <Typography variant="body2" fontWeight={700} sx={{ pr: 1.5 }}>
          {formatAmount(f.amountTTC ?? 0)}
        </Typography>
      ),
    },
    {
      // Invoice status: Brouillon / Envoyée / En retard
      id: "status",
      label: "Statut",
      width: 120,
      align: "center",
      render: (f) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <FactureStatusChip status={f.status} />
        </Box>
      ),
    },
    {
      // Payment status: Payée / Partiel / Reste à payer
      id: "amountRemaining",
      label: "Paiement",
      width: 130,
      align: "center",
      render: (f) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <FacturePaymentChip
            amountPaid={f.amountPaid ?? 0}
            amountRemaining={f.amountRemaining ?? 0}
          />
        </Box>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 90,
      align: "right",
      render: (f) => (
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
          <IconButton
            onClick={() => openDetails(f)}
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
          {/* Only show download for non-draft invoices */}
          {f.status !== "draft" && (
            <IconButton
              onClick={() => handleDownloadPdf(f)}
              size="small"
              sx={{
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                borderRadius: 1.5,
                "&:hover": {
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                },
              }}
            >
              <Download size={16} />
            </IconButton>
          )}
        </Stack>
      ),
    },
  ];

  const isInitialLoad = isFetching && invoices.length === 0;

  return (
    <PageHeader
      title="Factures"
      caption="Gérez vos documents financiers en toute simplicité"
      actions={[
        {
          label: "Nouvelle facture",
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
      <FactureAnalyticsCards analytics={analytics} isLoading={isInitialLoad} />

      <FolderTabNavigation
        tabs={statusTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: getTabCount(tab.id),
        }))}
        activeTab={statusFilter}
        onTabChange={handleStatusChange}
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
            Impossible de charger les factures.
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
              {invoices.length === 0 ? (
                <Typography
                  color="text.secondary"
                  align="center"
                  sx={{ py: 6 }}
                >
                  Aucune facture trouvée
                </Typography>
              ) : (
                invoices.map((facture) => (
                  <Card
                    key={facture.id}
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
                          {facture.number}
                        </Typography>
                        <FactureStatusChip status={facture.status} />
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
                            Montant TTC
                          </Typography>
                          <Typography variant="body2" fontWeight={700}>
                            {formatAmount(facture.amountTTC ?? 0)}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            display="block"
                          >
                            Paiement
                          </Typography>
                          <FacturePaymentChip
                            amountPaid={facture.amountPaid ?? 0}
                            amountRemaining={facture.amountRemaining ?? 0}
                          />
                        </Box>
                      </Box>
                      <Stack direction="row" spacing={1}>
                        <CustomButton
                          fullWidth
                          variant="outlined"
                          size="small"
                          onClick={() => openDetails(facture)}
                        >
                          Détails
                        </CustomButton>
                        {facture.status !== "draft" && (
                          <CustomButton
                            fullWidth
                            variant="soft"
                            size="small"
                            onClick={() => handleDownloadPdf(facture)}
                          >
                            PDF
                          </CustomButton>
                        )}
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
                data={invoices}
                isLoading={isFetching}
                isError={isError}
                emptyMessage="Aucune facture trouvée"
                rowKey={(f) => f.id}
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

      <FactureModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={() => table.onResetPage()}
      />

      <ViewFactureDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        facture={selected}
        onDownloadPdf={handleDownloadPdf}
        onPublished={handlePublished}
      />
    </PageHeader>
  );
}
