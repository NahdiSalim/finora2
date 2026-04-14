import { useState } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  IconButton,
  Typography,
  useTheme,
  useMediaQuery,
  Stack,
  alpha,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { motion } from "framer-motion";

import { Scrollbar } from "src/components/scrollbar";
import { useTable } from "src/hooks/use-table";
import { useGetSuppliersQuery } from "src/lib/services/suppliersApi";
import type { Supplier } from "src/lib/services/suppliersApi";
import SupplierModal from "../modal/supplier-modal";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import { Eye, Search, Store } from "lucide-react";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { DataTable } from "src/layouts/components/custom-table";

// ----------------------------------------------------------------

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

// ----------------------------------------------------------------

export default function SuppliersView() {
  const theme = useTheme();
  const table = useTable();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [openModal, setOpenModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [search, setSearch] = useState("");

  const handleOpenModal = (supplier: Supplier | null = null) => {
    setSelectedSupplier(supplier);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedSupplier(null);
  };

  const columns = [
    {
      id: "name",
      label: "Fournisseur",
      render: (row: Supplier) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            src={row.logoUrl}
            variant="rounded"
            sx={{
              width: 40,
              height: 40,
              background: row.logoUrl
                ? undefined
                : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            {!row.logoUrl && row.name?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "company",
      label: "Société",
      render: (row: Supplier) => (
        <Typography variant="body2">{row.company || "-"}</Typography>
      ),
    },
    {
      id: "email",
      label: "Email",
      render: (row: Supplier) => (
        <Typography variant="body2" color="text.secondary">
          {row.email || "-"}
        </Typography>
      ),
    },
    {
      id: "phone",
      label: "Téléphone",
      render: (row: Supplier) => (
        <Typography variant="body2">{row.phone || "-"}</Typography>
      ),
    },
    {
      id: "taxId",
      label: "Matricule fiscal",
      render: (row: Supplier) => (
        <Typography variant="body2" color="text.secondary">
          {row.taxId || "-"}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (row: Supplier) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Voir les détails" arrow>
            <IconButton
              size="small"
              onClick={() => handleOpenModal(row)}
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                backgroundColor: theme.palette.background.paper,
                color: theme.palette.text.secondary,
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Eye size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const { data, isLoading, isError } = useGetSuppliersQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
    search: search || undefined,
  });

  const suppliers = data?.data || [];
  const totalCount = data?.pagination?.totalCount || 0;

  // Mobile card rendering
  const renderMobileCards = () => (
    <Grid container spacing={2.5}>
      {suppliers.map((row, idx) => (
        <Grid size={{ xs: 12 }} key={row.id}>
          <motion.div
            custom={idx}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card
              sx={{
                borderRadius: 4,
                backdropFilter: "blur(10px)",
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 16px 32px ${alpha(theme.palette.common.black, 0.12)}`,
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  {/* Header: Avatar + Name */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      src={row.logoUrl}
                      variant="rounded"
                      sx={{
                        width: 48,
                        height: 48,
                        background: row.logoUrl
                          ? undefined
                          : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        fontSize: 18,
                        fontWeight: 700,
                        borderRadius: 2,
                      }}
                    >
                      {!row.logoUrl && row.name?.charAt(0).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {row.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.company || "Société non renseignée"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Details grid */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Email
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.email || "-"}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Téléphone
                    </Typography>
                    <Typography variant="body2">{row.phone || "-"}</Typography>

                    <Typography variant="caption" color="text.secondary">
                      Matricule fiscal
                    </Typography>
                    <Typography variant="body2">{row.taxId || "-"}</Typography>
                  </Box>
                </Stack>
              </CardContent>

              <CardActions sx={{ justifyContent: "flex-end", p: 2, pt: 0 }}>
                {columns[5].render(row)}
              </CardActions>
            </Card>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );

  if (isLoading) {
    return (
      <PageHeader title="Mes fournisseurs" caption="Chargement en cours...">
        <Card sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={60} />
            ))}
          </Stack>
        </Card>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title="Mes fournisseurs"
      caption="Gérez vos fournisseurs et leurs informations."
      actions={[
        {
          label: "Ajouter un fournisseur",
          icon: <Store size={18} />,
          onClick: () => handleOpenModal(),
          variant: "contained",
          color: "primary",
          sx: {
            borderRadius: 3,
            textTransform: "none",
            fontWeight: 600,
            boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
            },
          },
        },
      ]}
    >
      <Card
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(12px)",
          borderRadius: 4,
          p: { xs: 1.5, sm: 2.5 },
          boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        }}
      >
        <CustomInput
          fullWidth
          placeholder="Rechercher un fournisseur..."
          startIcon={<Search size={20} />}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            table.onChangePage(null, 0);
          }}
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

        {isMobile ? (
          <>
            <Scrollbar sx={{ maxHeight: "calc(100vh - 280px)", px: 0.5 }}>
              {suppliers.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography color="text.secondary">
                    {isError
                      ? "Erreur lors du chargement des fournisseurs"
                      : "Aucun fournisseur trouvé"}
                  </Typography>
                </Box>
              ) : (
                renderMobileCards()
              )}
            </Scrollbar>
            <CustomPagination
              page={table.page}
              count={totalCount}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
            />
          </>
        ) : (
          <>
            <Scrollbar>
              <DataTable
                columns={columns}
                data={suppliers}
                isLoading={isLoading}
                isError={isError}
                rowKey={(row) => row.id}
                emptyMessage="Aucun fournisseur trouvé"
              />
            </Scrollbar>
            <CustomPagination
              page={table.page}
              count={totalCount}
              rowsPerPage={table.rowsPerPage}
              onPageChange={table.onChangePage}
            />
          </>
        )}
      </Card>

      <SupplierModal
        open={openModal}
        onClose={handleCloseModal}
        supplier={selectedSupplier}
      />
    </PageHeader>
  );
}
