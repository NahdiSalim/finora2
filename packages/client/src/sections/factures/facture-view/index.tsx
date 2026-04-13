import { useState, useEffect, useRef } from "react";
import {
  Box,
  Card,
  CircularProgress,
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
import FactureStatusChip from "src/components/facture/FactureStatusChip";
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
  draft: "brouillon",
  sent: "brouillon",
  paid: "payee",
  partial: "partiel",
  overdue: "en_retard",
  cancelled: "annulee",
};

const uiStatusToBackend: Record<string, string | undefined> = {
  all: undefined,
  brouillon: "draft,sent",
  payee: "paid",
  partiel: "partial",
  en_retard: "overdue",
};

// ─── Mapper ───────────────────────────────────────────────────────────────────

function invoiceToFacture(inv: Invoice): Facture {
  return {
    id: inv.id,
    number: inv.invoiceNumber,
    status: backendStatusMap[inv.status] ?? "brouillon",
    tvaRate: Number(inv.vatRate),
    dueDate: inv.dueDate,
    discountType: (inv.discountType ?? "percentage") as DiscountType,
    discountValue: Number(inv.discountValue ?? 0),
    discountAmount:
      inv.discountAmount != null ? Number(inv.discountAmount) : null,
    clientName: inv.clientName ?? null,
    clientAddress: inv.clientAddress ?? null,
    company: inv.company ?? null,
    lines: inv.lines.map((l) => ({
      id: String(l.id),
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

// ─── Constants ────────────────────────────────────────────────────────────────

/** Number of invoices fetched per page. Kept small so each batch is fast. */
const PAGE_SIZE = 10;

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

const statusTabs: Array<{ id: "all" | FactureStatus; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "brouillon", label: "Brouillon" },
  { id: "payee", label: "Payée" },
  { id: "partiel", label: "Partiel" },
  { id: "en_retard", label: "En retard" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function FactureView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ── Modal / drawer state ──────────────────────────────────────────────────
  const [openModal, setOpenModal] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState<Facture | null>(null);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [statusFilter, setStatusFilter] = useState<"all" | FactureStatus>(
    "all",
  );
  /** Raw value bound to the input — updates on every keystroke. */
  const [search, setSearch] = useState("");
  /**
   * Debounced value sent to the backend — only updates 400 ms after the user
   * stops typing. This prevents a network request on every keystroke and avoids
   * resetting the accumulated list mid-typing.
   */
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // ── Infinite-scroll state ─────────────────────────────────────────────────
  /**
   * currentPage: which backend page we last requested.
   * allInvoices: accumulated list across all fetched pages.
   *
   * These two always move forward together — they reset together when
   * statusFilter or search changes.
   */
  const [currentPage, setCurrentPage] = useState(1);
  const [allInvoices, setAllInvoices] = useState<Facture[]>([]);

  // ── Debounce search → resets list and page after typing stops ────────────
  /**
   * Fires 400 ms after the user stops typing.
   *
   * prevSearchRef is initialized to the same value as `search` ("").
   * On mount — including React Strict Mode's double-invocation — prevSearch
   * equals search so the effect exits early without scheduling a timer.
   * This replaces the previous isMountedRef pattern, which broke under Strict
   * Mode: the second invocation saw isMounted=true and scheduled a ghost timer
   * that cleared allInvoices 400 ms after mount.
   */
  const prevSearchRef = useRef(search);
  useEffect(() => {
    if (prevSearchRef.current === search) return () => {};
    prevSearchRef.current = search;
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setCurrentPage(1);
      setAllInvoices([]);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  // ── RTK Query ─────────────────────────────────────────────────────────────
  const {
    data: apiResponse,
    isFetching,
    error: invoiceError,
  } = useGetInvoicesQuery({
    page: currentPage,
    pageSize: PAGE_SIZE,
    status: uiStatusToBackend[statusFilter],
    search: debouncedSearch || undefined,
  });

  // Total count for the current filter (used for "has more" check and tab badge).
  const total = apiResponse?.total ?? 0;
  const hasMore = allInvoices.length < total;

  // ── Refs — kept in sync every render so observer callbacks are never stale ─
  /**
   * currentPageRef: lets the data-append effect know which page just arrived
   * without adding currentPage as a dependency (which would cause the effect
   * to fire before the new data arrives and re-append the old page's items).
   */
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  // Used by the IntersectionObserver callback instead of closing over the state
  // values (which would be stale after the observer is set up).
  const isFetchingRef = useRef(isFetching);
  isFetchingRef.current = isFetching;
  const hasMoreRef = useRef(hasMore);
  hasMoreRef.current = hasMore;

  /**
   * isIntersectingRef: tracks whether the sentinel is currently inside the
   * viewport (including the 200 px rootMargin pre-fire zone).
   *
   * The IntersectionObserver only fires on *changes* to intersection state —
   * it does NOT re-fire while the sentinel stays visible. So we keep this ref
   * updated in the observer callback and read it in the data-append effect to
   * decide whether to immediately request the next page after a batch arrives.
   */
  const isIntersectingRef = useRef(false);

  /** Invisible 1px div placed at the bottom of the list — the scroll trigger. */
  const sentinelRef = useRef<HTMLDivElement>(null);

  // ── Append new page data when it arrives ──────────────────────────────────
  /**
   * Runs whenever RTK Query delivers new data for the current query args.
   *
   * Page accumulation logic:
   *   - page 1  → replace allInvoices entirely (handles filter/search resets)
   *   - page N  → append only items whose id is not already in the list
   *               (duplicate guard: covers edge cases where the observer fires
   *               twice before isFetching flips to true)
   *
   * After appending, if the sentinel is still in the viewport and there are
   * more pages to load, we immediately increment the page counter here.
   * This is the fix for the core bug: because the sentinel never *exits* the
   * viewport when the list is short, the IntersectionObserver never re-fires,
   * so without this explicit check only the first page would ever be loaded.
   */
  useEffect(() => {
    if (!apiResponse?.data) return;
    const page = currentPageRef.current;
    const responseTotal = apiResponse.total ?? 0;
    const newItems = apiResponse.data.map(invoiceToFacture);

    setAllInvoices((prev) => {
      if (page === 1) {
        console.debug("[InfiniteScroll] page 1 — replacing list", {
          fetched: newItems.length,
          total: responseTotal,
        });
        return newItems;
      }

      const existingIds = new Set(prev.map((f) => f.id));
      const unique = newItems.filter((f) => !existingIds.has(f.id));
      const updated = unique.length > 0 ? [...prev, ...unique] : prev;

      console.debug("[InfiniteScroll] append", {
        page,
        added: unique.length,
        accumulated: updated.length,
        total: responseTotal,
        hasMore: updated.length < responseTotal,
      });

      return updated;
    });

    // page * PAGE_SIZE is the maximum number of items that could have been
    // fetched through the current page. If that is less than the server total,
    // at least one more page exists.
    //
    // We cannot read allInvoices.length here (it reflects the pre-update value),
    // so we use the page-based arithmetic instead — it gives the same answer
    // without requiring a second render cycle.
    if (isIntersectingRef.current && page * PAGE_SIZE < responseTotal) {
      console.debug(
        "[InfiniteScroll] sentinel still visible — auto-loading next page",
        {
          nextPage: page + 1,
        },
      );
      setCurrentPage((p) => p + 1);
    }
  }, [apiResponse]);

  // ── IntersectionObserver — triggers next page load ────────────────────────
  /**
   * Set up once on mount. Watches the sentinel div at the bottom of the list.
   * rootMargin: "200px" pre-fires 200px before the sentinel enters the
   * viewport, giving the next batch time to load before the user reaches the
   * very end of the list.
   *
   * Responsibility: keep isIntersectingRef up-to-date AND handle the
   * scroll-triggered case (user scrolled far enough to bring the sentinel into
   * view after it had previously exited).
   *
   * The "sentinel always visible" case (short list) is handled in the
   * data-append effect above.
   */
  useEffect(() => {
    const sentinel = sentinelRef.current;

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries[0].isIntersecting;
        isIntersectingRef.current = intersecting;

        console.debug("[InfiniteScroll] observer fired", {
          intersecting,
          isFetching: isFetchingRef.current,
          hasMore: hasMoreRef.current,
        });

        if (intersecting && !isFetchingRef.current && hasMoreRef.current) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { rootMargin: "200px" },
    );

    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, []); // mount-only — all runtime checks go through refs

  // ── Filter / search change → full reset ───────────────────────────────────
  /**
   * Inline in the handlers so React batches all three state updates in the
   * same render cycle, avoiding an intermediate render with stale data.
   */
  const handleStatusChange = (id: string) => {
    setStatusFilter(id as "all" | FactureStatus);
    setCurrentPage(1);
    setAllInvoices([]);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only update the raw input value here.
    // The debounce effect watches `search` and will reset the page + list
    // and update `debouncedSearch` after 400 ms of inactivity.
    setSearch(e.target.value);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const openDetails = (facture: Facture) => {
    setSelected(facture);
    setOpenDrawer(true);
  };

  const handleDownloadPdf = (facture: Facture) => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(buildFactureTemplate(facture));
    win.document.close();
    win.focus();
    win.print();
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
      width: 120,
      render: (f) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(f.createdAt).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "dueDate",
      label: "Échéance",
      width: 120,
      render: (f) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(f.dueDate).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "amountHT",
      label: "Montant HT",
      width: 140,
      align: "right",
      render: (f) => (
        <Typography variant="body2" fontWeight={500} sx={{ pr: 1.5 }}>
          {formatAmount(f.amountHT)}
        </Typography>
      ),
    },
    {
      id: "amountTTC",
      label: "Montant TTC",
      width: 140,
      align: "right",
      render: (f) => (
        <Typography variant="body2" fontWeight={700} sx={{ pr: 1.5 }}>
          {formatAmount(f.amountTTC)}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Statut",
      width: 130,
      align: "center",
      render: (f) => (
        <Box sx={{ display: "flex", justifyContent: "center" }}>
          <FactureStatusChip status={f.status} />
        </Box>
      ),
    },
    {
      id: "amountRemaining",
      label: "Reste à payer",
      width: 150,
      align: "right",
      render: (f) => (
        <Typography
          variant="body2"
          fontWeight={700}
          color={f.amountRemaining > 0 ? "error.main" : "success.main"}
          sx={{ pr: 1.5 }}
        >
          {formatAmount(f.amountRemaining)}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 110,
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
          <IconButton
            onClick={() => handleDownloadPdf(f)}
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

  // ── Derived render helpers ────────────────────────────────────────────────

  /** True only during the very first fetch (list is still empty). */
  const isInitialLoad = isFetching && allInvoices.length === 0;

  /** True while fetching a subsequent page (list already has content). */
  const isFetchingMore = isFetching && allInvoices.length > 0;

  // ── Render ────────────────────────────────────────────────────────────────

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
      {/* Active tab shows the total for the current filter. Inactive tabs have
          no badge — counting them would require extra queries. */}
      <FolderTabNavigation
        tabs={statusTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count: tab.id === statusFilter ? total : undefined,
        }))}
        activeTab={statusFilter}
        onTabChange={handleStatusChange}
      />

      <Card
        sx={{
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
          border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          borderTop: "none",
          p: { xs: 2, md: 3 },
        }}
      >
        <CustomInput
          placeholder="Rechercher par numéro ou description..."
          value={search}
          onChange={handleSearchChange}
          startIcon={<Search size={18} />}
          sx={{ mb: 3 }}
        />

        {/* ── API error (e.g. user has no company) ── */}
        {invoiceError && !isFetching ? (
          <Typography color="error" align="center" sx={{ py: 6 }}>
            Impossible de charger les factures. Vérifiez que votre compte est
            bien associé à une entreprise.
          </Typography>
        ) : /* ── Initial load spinner (empty list + first fetch in progress) ── */
        isInitialLoad ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={32} />
          </Box>
        ) : isMobile ? (
          /* ── Mobile: card list ─────────────────────────────────────────── */
          <Stack spacing={2}>
            {allInvoices.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                Aucune facture trouvée
              </Typography>
            ) : (
              allInvoices.map((facture) => (
                <Card
                  key={facture.id}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Stack spacing={1.5}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography fontWeight={700}>{facture.number}</Typography>
                      <FactureStatusChip status={facture.status} />
                    </Stack>
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        Échéance:{" "}
                        {new Date(facture.dueDate).toLocaleDateString("fr-FR")}
                      </Typography>
                      <Typography variant="subtitle2" fontWeight={700}>
                        TTC: {formatAmount(facture.amountTTC)}
                      </Typography>
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
                      <CustomButton
                        fullWidth
                        variant="soft"
                        size="small"
                        onClick={() => handleDownloadPdf(facture)}
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
          /* ── Desktop: data table ───────────────────────────────────────── */
          <DataTable
            columns={columns}
            data={allInvoices}
            rowKey={(f) => f.id}
            emptyMessage="Aucune facture trouvée"
          />
        )}

        {/*
         * Sentinel — invisible 1px element watched by IntersectionObserver.
         * Placed inside the Card so it scrolls with the page content.
         * rootMargin: "200px" means the observer fires when this div is
         * within 200px of the viewport bottom, pre-loading the next batch.
         */}
        <div ref={sentinelRef} style={{ height: 1 }} />

        {/* Bottom loader — shown while a subsequent page is being fetched. */}
        {isFetchingMore && (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}
      </Card>

      <FactureModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={() => {
          // createInvoice mutation invalidates "Invoices LIST" → RTK Query
          // auto-refetches page 1. Reset local accumulator so the new invoice
          // (sorted by createdAt desc) appears at the top of the list.
          setCurrentPage(1);
          setAllInvoices([]);
        }}
      />

      <ViewFactureDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        facture={selected}
        onDownloadPdf={handleDownloadPdf}
      />
    </PageHeader>
  );
}
