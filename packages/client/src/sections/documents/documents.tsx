import {
  alpha,
  Box,
  Grid,
  Skeleton,
  Typography,
  useTheme,
} from "@mui/material";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientCard from "src/components/common/ClientCard";
import CustomButton from "src/components/common/CustomButton";
import { PageHeader } from "src/layouts/components/page-header";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useGetClientsInvoiceStatsQuery } from "src/lib/services/relationshipsApi";

const ROWS_PER_PAGE = 8;
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85";

export default function DocumentsView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const theme = useTheme();
  const navigate = useNavigate();

  const uploadsUrl =
    import.meta.env.VITE_UPLOADS_URL || import.meta.env.VITE_API_URL || "";

  const { data, isLoading, isError } = useGetClientsInvoiceStatsQuery({
    page: page + 1,
    limit: ROWS_PER_PAGE,
  });

  const clients = data?.data ?? [];
  const totalCount = data?.pagination?.total ?? 0;

  const handleChat = (clientName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log(`Chat with ${clientName}`);
  };

  const handleDeactivate = (clientName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log(`Deactivate ${clientName}`);
  };

  const handleClientClick = (
    clientId: string | number,
    clientName: string,
    invoiceStats: { traite: number; pending: number; total: number },
  ) => {
    navigate(`/dashboard/documents/${clientId}`, {
      state: { clientName, invoiceStats },
    });
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const displayName = (item: (typeof clients)[0]) =>
    item.clientName?.trim() ||
    [item.ownerFirstName, item.ownerLastName].filter(Boolean).join(" ") ||
    "Client";

  return (
    <PageHeader
      title="Documents partagés"
      caption="Consultez les fichiers partagés avec vous."
      searchbar={{
        value: search,
        onChange: setSearch,
        placeholder: "Rechercher...",
      }}
    >
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          overflow: "hidden",
          p: 2,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Typography>{totalCount} clients</Typography>
          <CustomButton
            variant="outlined"
            sx={{
              position: "relative",
              minWidth: 44,
              height: 44,
              p: 0,
              borderRadius: 1.5,
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.grey[600],
              transition: theme.transitions.create([
                "border-color",
                "background-color",
                "color",
              ]),
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
            }}
          >
            <CalendarDays />
          </CustomButton>
        </Box>

        {isError && (
          <Typography color="error" sx={{ py: 2 }}>
            Impossible de charger les clients.
          </Typography>
        )}

        {isLoading && (
          <Grid container spacing={3}>
            {Array.from({ length: ROWS_PER_PAGE }).map((_, i) => (
              <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <Skeleton
                  variant="rectangular"
                  height={320}
                  sx={{ borderRadius: 3 }}
                />
              </Grid>
            ))}
          </Grid>
        )}

        {!isLoading && !isError && (
          <>
            <Grid container spacing={3}>
              {clients.map((client) => (
                <Grid
                  key={client.clientId}
                  size={{ xs: 12, sm: 6, md: 4, lg: 3 }}
                >
                  <ClientCard
                    id={client.clientId}
                    cover={DEFAULT_COVER}
                    avatar={
                      client.clientLogo
                        ? `${uploadsUrl}/${client.clientLogo}`
                        : `https://i.pravatar.cc/150?u=${client.clientId}`
                    }
                    name={displayName(client)}
                    email={client.clientEmail ?? ""}
                    processedDocs={client.invoiceStats.traite}
                    pendingDocs={client.invoiceStats.pending}
                    onChat={(e) => handleChat(displayName(client), e)}
                    onDeactivate={(e) =>
                      handleDeactivate(displayName(client), e)
                    }
                    onCardClick={() =>
                      handleClientClick(
                        client.clientId,
                        displayName(client),
                        client.invoiceStats,
                      )
                    }
                  />
                </Grid>
              ))}
            </Grid>

            {clients.length === 0 && (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="h6" color="text.secondary">
                  Aucun client pour le moment.
                </Typography>
              </Box>
            )}

            {totalCount > 0 && (
              <CustomPagination
                page={page}
                count={totalCount}
                rowsPerPage={ROWS_PER_PAGE}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </Box>
    </PageHeader>
  );
}
