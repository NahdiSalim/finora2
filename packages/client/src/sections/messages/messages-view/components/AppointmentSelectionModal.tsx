import { useState, useCallback, useEffect } from "react";
import { Box, Typography, Chip, useTheme, alpha } from "@mui/material";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import AttachmentSelectionModal from "./AttachmentSelectionModal";
import { useGetChatAccessibleAppointmentsQuery } from "../../../../lib/services/chatApi";
import type { ChatMessageAppointment } from "../../../../lib/services/chatApi";
import type { MessageAppointment } from "../data/types";

type AppointmentSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (appointment: MessageAppointment) => void;
  clientId: number | null;
};

const APPOINTMENT_STATUS_CONFIG: Record<
  string,
  { label: string; color: string }
> = {
  pending: {
    label: "En attente",
    color: "#ff7d0d",
  },
  confirmed: {
    label: "Confirmé",
    color: "#10B981",
  },
  rescheduled: {
    label: "Reporté",
    color: "#F59E0B",
  },
  completed: {
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

const APPOINTMENT_TYPE_CONFIG: Record<string, { label: string }> = {
  meeting: { label: "Réunion" },
  consultation: { label: "Consultation" },
  review: { label: "Révision" },
  other: { label: "Autre" },
};

export default function AppointmentSelectionModal({
  open,
  onClose,
  onSelect,
  clientId,
}: AppointmentSelectionModalProps) {
  const theme = useTheme();
  const [page, setPage] = useState(1);
  const [allAppointments, setAllAppointments] = useState<
    ChatMessageAppointment[]
  >([]);

  const { data, isLoading, isFetching } = useGetChatAccessibleAppointmentsQuery(
    { clientId: clientId!, page, limit: 5 },
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
        setAllAppointments(data.data);
      } else {
        setAllAppointments((prev) => [...prev, ...data.data]);
      }
    }
  }, [data, page]);

  useEffect(() => {
    if (!open) {
      setPage(1);
      setAllAppointments([]);
    }
  }, [open]);

  const handleSelect = (appointment: ChatMessageAppointment) => {
    onSelect({
      id: appointment.id,
      title: appointment.title,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      type: appointment.type,
    });
    onClose();
  };

  const renderAppointmentItem = (appointment: ChatMessageAppointment) => {
    const statusConfig =
      APPOINTMENT_STATUS_CONFIG[appointment.status] ||
      APPOINTMENT_STATUS_CONFIG.pending;
    const typeConfig =
      APPOINTMENT_TYPE_CONFIG[appointment.type] ||
      APPOINTMENT_TYPE_CONFIG.meeting;

    const startDate = new Date(appointment.startTime);
    const endDate = new Date(appointment.endTime);
    const dateLabel = format(startDate, "dd MMM yyyy", { locale: fr });
    const timeLabel = `${format(startDate, "HH:mm")} - ${format(endDate, "HH:mm")}`;

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
            <Calendar size={18} />
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
              {appointment.title}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mb: 1,
                color: theme.palette.text.secondary,
              }}
            >
              <Clock size={14} />
              <Typography variant="caption" sx={{ fontSize: 12 }}>
                {dateLabel} • {timeLabel}
              </Typography>
            </Box>
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
                label={typeConfig.label}
                sx={{
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                  borderRadius: 2,
                  fontSize: 11,
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
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
      title="Sélectionner un rendez-vous"
      items={allAppointments}
      isLoading={isLoading || isFetching}
      hasMore={!!data?.pagination && page < data.pagination.totalPages}
      onLoadMore={handleLoadMore}
      onSelect={handleSelect}
      renderItem={renderAppointmentItem}
      emptyMessage="Aucun rendez-vous disponible pour ce client"
    />
  );
}
