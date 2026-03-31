import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Typography, Chip, useTheme, alpha } from "@mui/material";
import { FileText } from "lucide-react";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import type { RootState } from "src/lib/store";
import AttachmentSelectionModal from "./AttachmentSelectionModal";
import { useGetChatAccessibleRequestsQuery } from "../../../../lib/services/chatApi";
import type { ChatMessageRequest } from "../../../../lib/services/chatApi";
import type { MessageRequest } from "../data/types";

type RequestSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onAdd: (request: MessageRequest) => void;
  clientId: number | null;
};

const REQUEST_STATUS_CONFIG: Record<string, { label: string; color: string }> =
  {
    pending: {
      label: "En attente",
      color: "#ff7d0d",
    },
    in_progress: {
      label: "En cours",
      color: "#8B5CF6",
    },
    resolved: {
      label: "Terminé",
      color: "#10B981",
    },
    rejected: {
      label: "Rejeté",
      color: "#ff5757",
    },
    cancelled: {
      label: "Annulé",
      color: "#6B7280",
    },
  };

const REQUEST_URGENCY_CONFIG: Record<string, { label: string; color: string }> =
  {
    low: {
      label: "Low",
      color: "#1d61e7",
    },
    normal: {
      label: "Normal",
      color: "#F59E0B",
    },
    high: {
      label: "High",
      color: "#ff7d0d",
    },
    urgent: {
      label: "Urgent !",
      color: "#ff5757",
    },
  };

const REQUEST_TYPE_LABELS: Record<string, string> = {
  accounting: "Comptabilité",
  tax: "Fiscalité",
  consultation: "Consultation",
  document: "Document",
  other: "Autre",
};

export default function RequestSelectionModal({
  open,
  onClose,
  onAdd,
  clientId,
}: RequestSelectionModalProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const dashboardBase = useDashboardBase();
  const [page, setPage] = useState(1);
  const [allRequests, setAllRequests] = useState<ChatMessageRequest[]>([]);

  // Get current user role to check if they're a client
  const userRole = useSelector((state: RootState) => state.auth.user?.role);
  const roleCode = typeof userRole === "string" ? userRole : userRole?.code;
  const isClient =
    roleCode?.toLowerCase() === "client" ||
    roleCode?.toLowerCase().startsWith("client_");

  const { data, isLoading, isFetching } = useGetChatAccessibleRequestsQuery(
    { recipientId: clientId!, page, limit: 5 },
    { skip: !open || !clientId },
  );

  const handleLoadMore = useCallback(() => {
    if (data?.pagination && page < data.pagination.totalPages) {
      setPage((prev) => prev + 1);
    }
  }, [data?.pagination, page]);

  useEffect(() => {
    if (data?.data) {
      if (page === 1) {
        setAllRequests(data.data);
      } else {
        setAllRequests((prev) => [...prev, ...data.data]);
      }
    }
  }, [data, page]);

  useEffect(() => {
    if (!open) {
      setPage(1);
      setAllRequests([]);
    }
  }, [open]);

  const handleSelect = (request: ChatMessageRequest) => {
    onAdd({
      id: request.id,
      title: request.subject,
      subtitle: REQUEST_TYPE_LABELS[request.type] || request.type,
      status: REQUEST_STATUS_CONFIG[request.status]?.label || request.status,
      urgency:
        REQUEST_URGENCY_CONFIG[request.urgency]?.label || request.urgency,
    });
    onClose();
  };

  const handleCreateRequest = () => {
    onClose();
    // Navigate to requests page where the user can create a new request
    navigate(`${dashboardBase}/requests?create=true`);
  };

  const renderRequestItem = (request: ChatMessageRequest) => {
    const statusConfig =
      REQUEST_STATUS_CONFIG[request.status] || REQUEST_STATUS_CONFIG.pending;
    const urgencyConfig =
      REQUEST_URGENCY_CONFIG[request.urgency] || REQUEST_URGENCY_CONFIG.normal;
    const typeLabel = REQUEST_TYPE_LABELS[request.type] || request.type;

    return (
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          mb: 1.5,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          transition: "all 0.2s",
          "&:hover": {
            borderColor: theme.palette.primary.main,
            boxShadow: theme.shadows[2],
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
          <Box
            sx={{
              mt: 0.25,
              color: theme.palette.primary.main,
            }}
          >
            <FileText size={18} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="body1"
              sx={{
                fontWeight: 600,
                fontSize: { xs: 14, sm: 15 },
                color: theme.palette.text.primary,
                mb: 0.5,
                wordBreak: "break-word",
              }}
            >
              {request.subject}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                fontSize: 12,
                color: theme.palette.text.secondary,
                display: "block",
                mb: 1,
              }}
            >
              {typeLabel}
            </Typography>
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Chip
                size="small"
                label={statusConfig.label}
                sx={{
                  bgcolor: alpha(statusConfig.color, 0.08),
                  color: statusConfig.color,
                  fontWeight: 600,
                  borderRadius: 2,
                  fontSize: 11,
                  border: `1px solid ${alpha(statusConfig.color, 0.25)}`,
                  height: 24,
                }}
              />
              <Chip
                size="small"
                label={urgencyConfig.label}
                sx={{
                  bgcolor: alpha(urgencyConfig.color, 0.08),
                  color: urgencyConfig.color,
                  fontWeight: 600,
                  borderRadius: 2,
                  fontSize: 11,
                  border: `1px solid ${alpha(urgencyConfig.color, 0.25)}`,
                  height: 24,
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <AttachmentSelectionModal
      open={open}
      onClose={onClose}
      title="Sélectionner une demande"
      items={allRequests}
      isLoading={isLoading || isFetching}
      hasMore={!!data?.pagination && page < data.pagination.totalPages}
      onLoadMore={handleLoadMore}
      onSelect={handleSelect}
      renderItem={renderRequestItem}
      emptyMessage="Aucune demande disponible"
      emptyAction={
        isClient
          ? {
              label: "Créer une demande",
              onClick: handleCreateRequest,
            }
          : undefined
      }
    />
  );
}
