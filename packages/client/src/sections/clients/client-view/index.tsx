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
  Chip,
  alpha,
  Tooltip,
  Skeleton,
} from "@mui/material";
import { motion } from "framer-motion";

import { Scrollbar } from "src/components/scrollbar";
import { useTable } from "src/hooks/use-table";
import { usePermissions } from "src/hooks/usePermissions";
import { useGetClientsQuery } from "src/lib/services/clientApi";
import ClientModal from "./../modal/ClientModal";
import { PageHeader } from "src/layouts/components/page-header";
import { DataTable } from "src/layouts/components/custom-table";
import CustomInput from "src/components/common/CustomInput";
import { Eye, Power, Search, UserPlus } from "lucide-react";
import { CustomPagination } from "src/layouts/components/table-pagination";

// Animation variants pour les cartes
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function ClientView() {
  const theme = useTheme();
  const table = useTable();
  const { hasAction } = usePermissions();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [openModal, setOpenModal] = useState(false);
  /** En mode détail : id du client ; le client affiché est dérivé de la liste pour rester à jour. */
  const [selectedClientId, setSelectedClientId] = useState<
    string | number | null
  >(null);
  /** Snapshot au moment de l’ouverture (fallback si le client n’est plus sur la page après refetch). */
  const [selectedClientFallback, setSelectedClientFallback] =
    useState<any>(null);

  const handleOpenModal = (client: any = null) => {
    if (client) {
      setSelectedClientId(client.id);
      setSelectedClientFallback(client);
    } else {
      setSelectedClientId(null);
      setSelectedClientFallback(null);
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedClientId(null);
    setSelectedClientFallback(null);
  };

  const columns = [
    {
      id: "name",
      label: "Client",
      render: (row: any) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {row.fullName?.charAt(0)}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.fullName}
          </Typography>
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
      render: (row: any) => row.company?.name || "-",
    },
    {
      id: "status",
      label: "Statut",
      render: (row: any) => (
        <Chip
          label={row.status === "active" ? "Actif" : "Inactif"}
          size="small"
          sx={{
            bgcolor:
              row.status === "active"
                ? alpha(theme.palette.success.main, 0.12)
                : alpha(theme.palette.error.main, 0.12),
            color:
              row.status === "active"
                ? theme.palette.success.dark
                : theme.palette.error.dark,
            fontWeight: 600,
            borderRadius: 2,
            backdropFilter: "blur(4px)",
          }}
        />
      ),
    },
    {
      id: "Actions",
      label: "Actions",
      render: (row: any) => (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Tooltip title="Modifier" arrow>
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
          <Tooltip
            title={row.status === "active" ? "Désactiver" : "Activer"}
            arrow
          >
            <IconButton
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                backgroundColor: theme.palette.common.white,
                color:
                  row.status === "active"
                    ? theme.palette.error.main
                    : theme.palette.grey[500],
                transition: "all 0.2s ease",
                "&:hover": {
                  borderColor: theme.palette.error.main,
                  backgroundColor: alpha(theme.palette.error.main, 0.08),
                  color: theme.palette.error.main,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Power size={18} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ];

  const clientsResult = useGetClientsQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
  });
  const { data, isLoading, isError } = clientsResult;

  const clients = data?.data || [];
  const totalCount = data?.pagination?.total ?? 0;

  /** Client passé au modal : priorité à la liste (à jour), sinon fallback (ouverture). */
  const modalClient =
    selectedClientId != null
      ? (clients.find((c: any) => c.id === selectedClientId) ??
        selectedClientFallback)
      : null;

  // Rendu des cartes modernes pour mobile
  const renderMobileCards = () => (
    <Grid container spacing={2.5}>
      {clients.map((row: any, idx: number) => (
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
                  {/* En-tête : Avatar + Nom */}
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar
                      sx={{
                        width: 48,
                        height: 48,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                        fontSize: 18,
                        fontWeight: 700,
                      }}
                    >
                      {row.fullName?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {row.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.company?.name || "Sans entreprise"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Détails sous forme de grille */}
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
                      {columns[1].render(row)}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Téléphone
                    </Typography>
                    <Typography variant="body2">
                      {columns[2].render(row)}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Entreprise
                    </Typography>
                    <Typography variant="body2">
                      {columns[3].render(row)}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      Statut
                    </Typography>
                    <Box>{columns[4].render(row)}</Box>
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

  // État de chargement
  if (isLoading) {
    return (
      <PageHeader title="Clients" caption="Chargement en cours...">
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
      title="Clients"
      caption="Gérez vos clients et suivez leurs activités en temps réel."
      actions={[
        {
          label: "Ajouter un client",
          icon: <UserPlus size={18} />,
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
          placeholder="Rechercher un client..."
          startIcon={<Search size={20} />}
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
              {clients.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography color="text.secondary">
                    Aucun client trouvé
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
              <Box
                sx={{
                  "& .MuiTableRow-root": {
                    transition: "background 0.2s",
                    "&:hover": {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
                    },
                  },
                }}
              >
                <DataTable
                  columns={columns}
                  data={clients}
                  isLoading={isLoading}
                  isError={isError}
                  rowKey={(row) => row.id}
                />
              </Box>
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

      <ClientModal
        open={openModal}
        onClose={handleCloseModal}
        client={modalClient}
      />
    </PageHeader>
  );
}
