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
import { useGetCollaboratorsQuery } from "src/lib/services/collaboratorsApi";
import CollaboratorModal from "../modal/collaborator-modal";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import { Eye, Power, Search, UserPlus } from "lucide-react";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { DataTable } from "src/layouts/components/custom-table";

// Animation variants pour les cartes
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function CollaboratorView() {
  const theme = useTheme();
  const table = useTable();
  const { hasAction } = usePermissions();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [openModal, setOpenModal] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<any>(null);

  const handleOpenModal = (collaborator: any = null) => {
    setSelectedCollaborator(collaborator);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedCollaborator(null);
  };

  // Colonnes modernisées
  const columns = [
    {
      id: "name",
      label: "Collaborateur",
      render: (row: any) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
              fontSize: 15,
              fontWeight: 600,
            }}
          >
            {row.firstName?.charAt(0)}
            {row.lastName?.charAt(0)}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {row.firstName} {row.lastName}
          </Typography>
        </Box>
      ),
    },
    {
      id: "createdAt",
      label: "Date d'ajout",
      render: (row: any) =>
        row.createdAt
          ? new Date(row.createdAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          : "-",
    },
    {
      id: "position",
      label: "Poste",
      render: (row: any) => row.position || "-",
    },
    {
      id: "email",
      label: "Nom d'utilisateur",
      render: (row: any) => row.email || row.username || "-",
    },
    {
      id: "status",
      label: "Statut",
      render: (row: any) => (
        <Chip
          label={row.isActive ? "Actif" : "Inactif"}
          size="small"
          sx={{
            bgcolor: row.isActive
              ? alpha(theme.palette.success.main, 0.12)
              : alpha(theme.palette.error.main, 0.12),
            color: row.isActive
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
          <Tooltip title={row.isActive ? "Désactiver" : "Activer"} arrow>
            <IconButton
              size="small"
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                backgroundColor: theme.palette.common.white,
                color: row.isActive
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

  const { data, isLoading, isError } = useGetCollaboratorsQuery({
    page: table.page + 1,
    limit: table.rowsPerPage,
  });

  const collaborators = data?.data || [];
  const totalCount = data?.total || 0;

  // Rendu des cartes modernes pour mobile
  const renderMobileCards = () => (
    <Grid container spacing={2.5}>
      {collaborators.map((row, idx) => (
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
                      {row.firstName?.charAt(0)}
                      {row.lastName?.charAt(0)}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {row.firstName} {row.lastName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {row.position || "Sans poste"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Détails sous forme de lignes élégantes */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr",
                      gap: 1,
                      mt: 1,
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {columns[1].label}
                    </Typography>
                    <Typography variant="body2">
                      {columns[1].render(row)}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                      {columns[3].label}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
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
      <PageHeader title="Mes collaborateurs" caption="Chargement en cours...">
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
      title="Mes collaborateurs"
      caption="Gérez votre équipe et suivez leurs performances en temps réel."
      actions={[
        {
          label: "Ajouter un collaborateur",
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
          placeholder="Rechercher un collaborateur..."
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
              {collaborators.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography color="text.secondary">
                    Aucun collaborateur trouvé
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
                data={collaborators}
                isLoading={isLoading}
                isError={isError}
                rowKey={(row) => row.id}
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

      <CollaboratorModal
        open={openModal}
        onClose={handleCloseModal}
        collaborator={selectedCollaborator}
      />
    </PageHeader>
  );
}
