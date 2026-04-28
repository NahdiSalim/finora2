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
import { Package, Pencil, Plus, Search, Trash2 } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useTable } from "src/hooks/use-table";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import { useAlert } from "src/contexts/AlertContext";
import {
  useGetProductsQuery,
  useDeleteProductMutation,
  type Product,
} from "src/lib/services/productsApi";
import ProductModal from "../modal/ProductModal";

const PAGE_SIZE = 10;

const formatAmount = (v: number) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + " DT";

export default function ProductsView() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const table = useTable();
  const { showAlert } = useAlert();

  const [openModal, setOpenModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      table.onResetPage();
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const { data, isFetching, isError } = useGetProductsQuery({
    page: table.page + 1,
    limit: PAGE_SIZE,
    search: debouncedSearch.trim() || undefined,
  });

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

  const list = data?.data || [];
  const totalCount = data?.pagination?.totalCount ?? 0;

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId).unwrap();
      showAlert("Produit supprimé avec succès", "success");
      setDeleteId(null);
    } catch {
      showAlert("Erreur lors de la suppression", "error");
    }
  };

  const columns: Column<Product>[] = [
    {
      id: "name",
      label: "Nom du produit",
      render: (r) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Package size={16} />
          </Box>
          <Typography variant="body2" fontWeight={600}>
            {r.name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "unitPrice",
      label: "Prix unitaire",
      width: 160,
      align: "right",
      render: (r) => (
        <Typography variant="body2" fontWeight={700} sx={{ pr: 1.5 }}>
          {formatAmount(r.unitPrice)}
        </Typography>
      ),
    },
    {
      id: "createdAt",
      label: "Créé le",
      width: 130,
      render: (r) => (
        <Typography variant="body2" color="text.secondary">
          {new Date(r.createdAt).toLocaleDateString("fr-FR")}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      width: 100,
      align: "right",
      render: (r) => (
        <Stack direction="row" justifyContent="flex-end" spacing={1}>
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
      title="Gestion des produits"
      caption="Gérez votre catalogue de produits et services"
      actions={[
        {
          label: "Nouveau produit",
          icon: <Plus size={18} />,
          onClick: () => {
            setEditTarget(null);
            setOpenModal(true);
          },
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
      <Card
        sx={{
          bgcolor: alpha(theme.palette.background.paper, 0.9),
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          p: { xs: 1.5, sm: 2.5 },
        }}
      >
        <CustomInput
          fullWidth
          placeholder="Rechercher un produit..."
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
            Erreur lors du chargement des produits.
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
                  Aucun produit trouvé
                </Typography>
              ) : (
                list.map((product) => (
                  <Card
                    key={product.id}
                    variant="outlined"
                    sx={{ p: 2, borderRadius: 3 }}
                  >
                    <Stack spacing={1.5}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.5,
                          }}
                        >
                          <Box
                            sx={{
                              width: 36,
                              height: 36,
                              borderRadius: 2,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: "primary.main",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Package size={16} />
                          </Box>
                          <Typography fontWeight={700} noWrap>
                            {product.name}
                          </Typography>
                        </Box>
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          color="primary.main"
                        >
                          {formatAmount(product.unitPrice)}
                        </Typography>
                      </Stack>
                      <Stack
                        direction="row"
                        justifyContent="flex-end"
                        spacing={1}
                      >
                        <IconButton
                          size="small"
                          onClick={() => {
                            setEditTarget(product);
                            setOpenModal(true);
                          }}
                          sx={{
                            width: 34,
                            height: 34,
                            border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                            borderRadius: 2,
                          }}
                        >
                          <Pencil size={16} />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => setDeleteId(product.id)}
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
                data={list}
                isLoading={isFetching}
                isError={isError}
                rowKey={(r) => r.id}
                emptyMessage="Aucun produit trouvé"
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

      <ProductModal
        open={openModal}
        onClose={() => {
          setOpenModal(false);
          setEditTarget(null);
        }}
        product={editTarget}
      />

      <DeleteConfirmModal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Supprimer le produit"
        message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
        isLoading={isDeleting}
      />
    </PageHeader>
  );
}
