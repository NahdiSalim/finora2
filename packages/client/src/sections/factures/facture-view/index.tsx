import { useMemo, useState } from "react";
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
import FactureStatusChip from "src/components/facture/FactureStatusChip";
import type { Facture, FactureStatus } from "src/types/facture";

// Import the logic you moved to the separate file
import { buildFactureTemplate } from "src/components/facture/FactureTemplate";

import FactureModal from "../modal/FactureModal";
import ViewFactureDrawer from "../drawer/ViewFactureDrawer";

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

export default function FactureView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [openModal, setOpenModal] = useState(false);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [selected, setSelected] = useState<Facture | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | FactureStatus>(
    "all",
  );
  const [search, setSearch] = useState("");
  const [factures, setFactures] = useState<Facture[]>([]);

  const filtered = useMemo(
    () =>
      factures.filter((f) => {
        const statusOk = statusFilter === "all" || f.status === statusFilter;
        const searchOk =
          !search ||
          f.number.toLowerCase().includes(search.toLowerCase()) ||
          f.lines.some((line) =>
            line.description.toLowerCase().includes(search.toLowerCase()),
          );
        return statusOk && searchOk;
      }),
    [factures, statusFilter, search],
  );

  const openDetails = (facture: Facture) => {
    setSelected(facture);
    setOpenDrawer(true);
  };

  const handleDownloadPdf = (facture: Facture) => {
    const win = window.open("", "_blank");
    if (!win) return;
    // Using the imported template logic
    win.document.write(buildFactureTemplate(facture));
    win.document.close();
    win.focus();
    win.print();
  };

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
      <FolderTabNavigation
        tabs={statusTabs.map((tab) => ({
          id: tab.id,
          label: tab.label,
          count:
            tab.id === "all"
              ? factures.length
              : factures.filter((f) => f.status === tab.id).length,
        }))}
        activeTab={statusFilter}
        onTabChange={(id) => setStatusFilter(id as "all" | FactureStatus)}
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
          onChange={(e) => setSearch(e.target.value)}
          startIcon={<Search size={18} />}
          sx={{ mb: 3 }}
        />

        {isMobile ? (
          <Stack spacing={2}>
            {filtered.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
                Aucune facture trouvée
              </Typography>
            ) : (
              filtered.map((facture) => (
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
          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(f) => f.id}
            emptyMessage="Aucune facture trouvée"
          />
        )}
      </Card>

      <FactureModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onCreate={(facture) => setFactures((prev) => [facture, ...prev])}
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
