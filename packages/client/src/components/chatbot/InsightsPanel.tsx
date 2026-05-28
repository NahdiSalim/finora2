import { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Chip,
  Skeleton,
  Alert,
  Tooltip,
  IconButton,
  alpha,
  useTheme,
} from "@mui/material";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  RefreshCw,
  Clock,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Zap,
} from "lucide-react";
import type {
  AiInsight,
  InsightSeverity,
  InsightType,
} from "src/lib/services/chatbotApi";
import { useGetInsightsQuery } from "src/lib/services/chatbotApi";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  InsightSeverity,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    icon: React.ReactNode;
    label: string;
  }
> = {
  critical: {
    color: "#d32f2f",
    bgColor: "rgba(211,47,47,0.06)",
    borderColor: "rgba(211,47,47,0.25)",
    icon: <AlertCircle size={16} />,
    label: "Critique",
  },
  warning: {
    color: "#ed6c02",
    bgColor: "rgba(237,108,2,0.06)",
    borderColor: "rgba(237,108,2,0.25)",
    icon: <AlertTriangle size={16} />,
    label: "Attention",
  },
  info: {
    color: "#0288d1",
    bgColor: "rgba(2,136,209,0.06)",
    borderColor: "rgba(2,136,209,0.25)",
    icon: <Info size={16} />,
    label: "Info",
  },
};

const TYPE_ICON: Record<InsightType, React.ReactNode> = {
  INVOICES_DUE_SOON: <Clock size={18} />,
  RECURRING_LATE_SUPPLIER: <Users size={18} />,
  TVA_SPIKE: <TrendingUp size={18} />,
  HIGH_UNPAID: <DollarSign size={18} />,
  LOW_ACTIVITY: <Activity size={18} />,
};

// ─── Single Insight Card ──────────────────────────────────────────────────────

function InsightCard({
  insight,
  onAskChatbot,
}: {
  insight: AiInsight;
  onAskChatbot: (prompt: string) => void;
}) {
  const theme = useTheme();
  const cfg = SEVERITY_CONFIG[insight.severity];
  const typeIcon = TYPE_ICON[insight.type];

  const promptMap: Record<InsightType, string> = {
    INVOICES_DUE_SOON:
      "Montre-moi les factures bientôt en retard et aide-moi à les gérer",
    RECURRING_LATE_SUPPLIER:
      "Quels fournisseurs ont des retards récurrents ? Donne-moi un résumé",
    TVA_SPIKE:
      "Explique-moi la hausse de TVA ce mois et compare avec le mois dernier",
    HIGH_UNPAID:
      "Montre-moi toutes les factures impayées et leur montant total",
    LOW_ACTIVITY:
      "Pourquoi n'y a-t-il pas eu de nouvelles factures récemment ?",
  };

  return (
    <Box
      sx={{
        p: 1.75,
        mb: 1.25,
        borderRadius: 2,
        bgcolor: cfg.bgColor,
        border: `1px solid ${cfg.borderColor}`,
        transition: "all 0.15s ease",
        "&:hover": {
          bgcolor: alpha(cfg.color, 0.09),
          borderColor: alpha(cfg.color, 0.35),
        },
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1, mb: 0.75 }}>
        <Box
          sx={{
            color: cfg.color,
            mt: 0.1,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
          }}
        >
          {typeIcon}
        </Box>

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexWrap: "wrap",
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: cfg.color,
                lineHeight: 1.3,
                fontSize: "0.82rem",
              }}
            >
              {insight.title}
            </Typography>
            <Chip
              label={cfg.label}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 600,
                bgcolor: alpha(cfg.color, 0.12),
                color: cfg.color,
                border: `1px solid ${alpha(cfg.color, 0.3)}`,
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          </Box>
        </Box>

        {insight.actionable && (
          <Tooltip title="Analyser avec l'assistant" placement="top">
            <IconButton
              size="small"
              onClick={() => onAskChatbot(promptMap[insight.type])}
              sx={{
                width: 26,
                height: 26,
                flexShrink: 0,
                color: cfg.color,
                bgcolor: alpha(cfg.color, 0.08),
                "&:hover": { bgcolor: alpha(cfg.color, 0.18) },
              }}
            >
              <Zap size={13} />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* Description */}
      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: theme.palette.text.secondary,
          lineHeight: 1.55,
          fontSize: "0.75rem",
          pl: 3.25,
        }}
      >
        {insight.description}
      </Typography>
    </Box>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

interface InsightsPanelProps {
  onAskChatbot: (prompt: string) => void;
}

export function InsightsPanel({ onAskChatbot }: InsightsPanelProps) {
  const theme = useTheme();
  const { data, isLoading, isFetching, isError, isUninitialized, refetch } =
    useGetInsightsQuery(undefined, {
      pollingInterval: 5 * 60 * 1000,
    });

  // ── Refresh feedback ───────────────────────────────────────────────────────
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [refreshFeedback, setRefreshFeedback] = useState<
    "success" | "error" | null
  >(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isManualRefreshRef = useRef(false);
  const prevFetchingRef = useRef(isFetching);

  // Detect when a manual refresh transitions from in-flight → done
  useEffect(() => {
    if (prevFetchingRef.current && !isFetching && isManualRefreshRef.current) {
      isManualRefreshRef.current = false;
      if (!isError) {
        setLastRefreshed(new Date());
        setRefreshFeedback("success");
      } else {
        setRefreshFeedback("error");
      }
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = setTimeout(
        () => setRefreshFeedback(null),
        3500,
      );
    }
    prevFetchingRef.current = isFetching;
  }, [isFetching, isError]);

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, []);

  const handleRefresh = () => {
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    setRefreshFeedback(null);
    isManualRefreshRef.current = true;
    refetch();
  };

  // Treat uninitialized the same as loading so we never show a blank state
  const showLoading = isLoading || isUninitialized;

  const insights = data?.data ?? [];
  const criticalCount = insights.filter(
    (i) => i.severity === "critical",
  ).length;
  const warningCount = insights.filter((i) => i.severity === "warning").length;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* Sub-header */}
      <Box
        sx={{
          px: 2,
          py: 1.25,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          bgcolor: alpha(theme.palette.background.paper, 0.6),
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary", fontWeight: 500 }}
          >
            {showLoading
              ? "Analyse en cours…"
              : `${insights.length} alerte${insights.length !== 1 ? "s" : ""} détectée${insights.length !== 1 ? "s" : ""}`}
          </Typography>
          {criticalCount > 0 && (
            <Chip
              label={`${criticalCount} critique${criticalCount > 1 ? "s" : ""}`}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 700,
                bgcolor: "rgba(211,47,47,0.1)",
                color: "#d32f2f",
                border: "1px solid rgba(211,47,47,0.3)",
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
          {warningCount > 0 && (
            <Chip
              label={`${warningCount} attention`}
              size="small"
              sx={{
                height: 18,
                fontSize: "0.65rem",
                fontWeight: 600,
                bgcolor: "rgba(237,108,2,0.1)",
                color: "#ed6c02",
                border: "1px solid rgba(237,108,2,0.3)",
                "& .MuiChip-label": { px: 0.75 },
              }}
            />
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {refreshFeedback === "success" && lastRefreshed && (
            <Typography
              variant="caption"
              sx={{
                color: "success.main",
                fontSize: "0.67rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Mis à jour{" "}
              {lastRefreshed.toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Typography>
          )}
          {refreshFeedback === "error" && (
            <Typography
              variant="caption"
              sx={{
                color: "error.main",
                fontSize: "0.67rem",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              Impossible d&apos;actualiser
            </Typography>
          )}
          <Tooltip title="Actualiser les insights">
            <IconButton
              size="small"
              onClick={handleRefresh}
              disabled={isFetching}
              sx={{
                width: 28,
                height: 28,
                color: isFetching ? "primary.main" : "text.secondary",
                transition: "color 0.2s",
              }}
            >
              <RefreshCw
                size={14}
                style={{
                  animation: isFetching ? "spin 1s linear infinite" : "none",
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Content */}
      <Box sx={{ flex: 1, overflowY: "auto", p: 1.5 }}>
        {showLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <Box key={i} sx={{ mb: 1.25 }}>
                <Skeleton
                  variant="rounded"
                  height={72}
                  sx={{ borderRadius: 2 }}
                />
              </Box>
            ))}
          </>
        )}

        {isError && (
          <Alert severity="error" sx={{ fontSize: "0.8rem", borderRadius: 2 }}>
            Impossible de charger les insights. Vérifiez votre connexion.
          </Alert>
        )}

        {!showLoading && !isError && insights.length === 0 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 4,
              gap: 1.5,
              color: "text.disabled",
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                bgcolor: alpha(theme.palette.success.main, 0.1),
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.palette.success.main,
              }}
            >
              <Activity size={22} />
            </Box>
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, color: "text.secondary" }}
            >
              Tout est en ordre
            </Typography>
            <Typography
              variant="caption"
              sx={{
                textAlign: "center",
                color: "text.disabled",
                maxWidth: 200,
              }}
            >
              Aucune alerte détectée pour votre entreprise.
            </Typography>
          </Box>
        )}

        {!showLoading &&
          !isError &&
          insights.map((insight, idx) => (
            <InsightCard
              key={`${insight.type}-${idx}`}
              insight={insight}
              onAskChatbot={onAskChatbot}
            />
          ))}

        {/* Footer note + global analysis CTA — shown right below the last card */}
        {!showLoading && !isError && insights.length > 0 && (
          <Box
            sx={{
              mt: 0.5,
              pt: 1.25,
              borderTop: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "text.disabled",
                fontSize: "0.7rem",
                lineHeight: 1.6,
                mb: 1.25,
              }}
            >
              Données mises à jour automatiquement toutes les 5 minutes. Cliquez
              sur{" "}
              <Zap
                size={10}
                style={{ display: "inline", verticalAlign: "middle" }}
              />{" "}
              pour demander une analyse à l&apos;assistant.
            </Typography>

            <Box
              component="button"
              onClick={() =>
                onAskChatbot(
                  "Donne-moi une analyse globale de ma situation financière : factures impayées, retards de paiement, chiffre d'affaires et anomalies détectées.",
                )
              }
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                width: "100%",
                px: 1.5,
                py: 0.875,
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.22)}`,
                bgcolor: "transparent",
                color: theme.palette.primary.main,
                cursor: "pointer",
                fontSize: "0.78rem",
                fontWeight: 500,
                fontFamily: "inherit",
                textAlign: "left",
                transition: "all 0.15s",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.06),
                  borderColor: alpha(theme.palette.primary.main, 0.4),
                },
              }}
            >
              <Zap size={13} />
              Demander une analyse globale
            </Box>
          </Box>
        )}
      </Box>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </Box>
  );
}
