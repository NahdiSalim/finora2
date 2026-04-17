import {
  Box,
  Card,
  Skeleton,
  Typography,
  alpha,
  useTheme,
} from "@mui/material";
import {
  TrendingUp,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import type { InvoiceAnalytics } from "src/lib/services/invoicesApi";

interface Props {
  analytics?: InvoiceAnalytics;
  isLoading?: boolean;
}

const formatAmount = (value: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value) + " DT";

export default function FactureAnalyticsCards({ analytics, isLoading }: Props) {
  const theme = useTheme();

  const cards = [
    {
      label: "Chiffre d'affaires total",
      value: analytics ? formatAmount(analytics.totalRevenue) : "—",
      sub: `${analytics?.totalInvoices ?? 0} facture(s)`,
      icon: <TrendingUp size={22} />,
      color: theme.palette.primary.main,
      bg: alpha(theme.palette.primary.main, 0.1),
    },
    {
      label: "Montant encaissé",
      value: analytics ? formatAmount(analytics.totalPaid) : "—",
      sub: analytics
        ? `${analytics.totalRevenue > 0 ? Math.round((analytics.totalPaid / analytics.totalRevenue) * 100) : 0}% du total`
        : "—",
      icon: <CheckCircle size={22} />,
      color: "#10B981",
      bg: alpha("#10B981", 0.1),
    },
    {
      label: "Reste à encaisser",
      value: analytics ? formatAmount(analytics.totalRemaining) : "—",
      sub: `${analytics?.counts.partial ?? 0} partielle(s)`,
      icon: <Wallet size={22} />,
      color: "#F59E0B",
      bg: alpha("#F59E0B", 0.1),
    },
    {
      label: "Factures en retard",
      value: String(analytics?.counts.overdue ?? 0),
      sub: `${analytics?.counts.draft ?? 0} brouillon(s)`,
      icon: <AlertCircle size={22} />,
      color: "#EF4444",
      bg: alpha("#EF4444", 0.1),
    },
    {
      label: "Factures payées",
      value: String(analytics?.counts.paid ?? 0),
      sub: `sur ${analytics?.totalInvoices ?? 0} au total`,
      icon: <Clock size={22} />,
      color: "#6366F1",
      bg: alpha("#6366F1", 0.1),
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: {
          xs: "1fr 1fr",
          sm: "repeat(3, 1fr)",
          lg: "repeat(5, 1fr)",
        },
        gap: { xs: 1.5, sm: 2 },
        mb: 2.5,
      }}
    >
      {cards.map((card, i) => (
        <Card
          key={i}
          sx={{
            p: { xs: 1.5, sm: 2 },
            borderRadius: 3,
            border: `1px solid ${alpha(card.color, 0.15)}`,
            boxShadow: `0 2px 12px ${alpha(card.color, 0.08)}`,
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": {
              transform: "translateY(-2px)",
              boxShadow: `0 8px 24px ${alpha(card.color, 0.15)}`,
            },
            // Make the last card span 2 cols on xs (5 cards: 2+2+1)
            ...(i === 4 && { gridColumn: { xs: "span 2", sm: "span 1" } }),
          }}
        >
          {isLoading ? (
            <Box>
              <Skeleton
                variant="circular"
                width={40}
                height={40}
                sx={{ mb: 1.5 }}
              />
              <Skeleton variant="text" width="60%" height={28} />
              <Skeleton variant="text" width="80%" height={18} />
            </Box>
          ) : (
            <Box>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 2,
                  bgcolor: card.bg,
                  color: card.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1.5,
                }}
              >
                {card.icon}
              </Box>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  fontSize: { xs: "0.95rem", sm: "1.1rem" },
                  color: "text.primary",
                  lineHeight: 1.2,
                  mb: 0.5,
                }}
              >
                {card.value}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  fontSize: { xs: 11, sm: 12 },
                  display: "block",
                  mb: 0.25,
                }}
              >
                {card.label}
              </Typography>
              <Typography
                variant="caption"
                sx={{ fontSize: 11, color: card.color, fontWeight: 600 }}
              >
                {card.sub}
              </Typography>
            </Box>
          )}
        </Card>
      ))}
    </Box>
  );
}
