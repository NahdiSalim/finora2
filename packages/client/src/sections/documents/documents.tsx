import {
  alpha,
  Box,
  Grid,
  IconButton,
  Popover,
  Skeleton,
  Typography,
  useTheme,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { CalendarDays } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientCard from "src/components/common/ClientCard";
import CustomButton from "src/components/common/CustomButton";
import { PageHeader } from "src/layouts/components/page-header";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { useGetClientsInvoiceStatsQuery } from "src/lib/services/relationshipsApi";
import type { Dayjs } from "dayjs";

const ROWS_PER_PAGE = 8;
const SEARCH_DEBOUNCE_MS = 300;
const DEFAULT_COVER =
  "https://images.unsplash.com/photo-1557682250-33bd709cbe85";

export default function DocumentsView() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [startDate, setStartDate] = useState<Dayjs | null>(null);
  const [endDate, setEndDate] = useState<Dayjs | null>(null);
  const [dateAnchor, setDateAnchor] = useState<HTMLElement | null>(null);
  const theme = useTheme();
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, startDate, endDate]);

  const uploadsUrl =
    import.meta.env.VITE_UPLOADS_URL || import.meta.env.VITE_API_URL || "";

  const { data, isLoading, isError } = useGetClientsInvoiceStatsQuery({
    page: page + 1,
    limit: ROWS_PER_PAGE,
    search: debouncedSearch || undefined,
    startDate: startDate ? startDate.format("YYYY-MM-DD") : undefined,
    endDate: endDate ? endDate.format("YYYY-MM-DD") : undefined,
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
          <IconButton
            onClick={(e) => setDateAnchor(e.currentTarget)}
            sx={{
              border: "1px solid",
              borderColor: theme.palette.divider,
              borderRadius: 1.5,
              color:
                dateAnchor || startDate || endDate
                  ? theme.palette.primary.main
                  : theme.palette.grey[600],
              backgroundColor:
                dateAnchor || startDate || endDate
                  ? alpha(theme.palette.primary.main, 0.08)
                  : theme.palette.background.paper,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
            }}
            aria-label="Filtrer par date"
          >
            <CalendarDays size={20} />
          </IconButton>
          <Popover
            open={Boolean(dateAnchor)}
            anchorEl={dateAnchor}
            onClose={() => setDateAnchor(null)}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
            slotProps={{ paper: { sx: { p: 2, minWidth: 280 } } }}
          >
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Filtrer par date de relation
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <DatePicker
                  label="Du"
                  value={startDate}
                  onChange={(v: Dayjs | null) => setStartDate(v)}
                  maxDate={endDate ?? undefined}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <DatePicker
                  label="Au"
                  value={endDate}
                  onChange={(v: Dayjs | null) => setEndDate(v)}
                  minDate={startDate ?? undefined}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
                <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                  <CustomButton
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      setStartDate(null);
                      setEndDate(null);
                    }}
                  >
                    Réinitialiser
                  </CustomButton>
                  <CustomButton
                    size="small"
                    variant="contained"
                    onClick={() => setDateAnchor(null)}
                  >
                    Appliquer
                  </CustomButton>
                </Box>
              </Box>
            </LocalizationProvider>
          </Popover>
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
