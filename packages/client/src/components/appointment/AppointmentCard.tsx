import { Avatar, Box, Tooltip, Typography, useTheme } from "@mui/material";
import { Building, Calendar, Clock3, MapPin, Video } from "lucide-react";
import type { AppointmentItem } from "src/lib/services/appointmentsApi";
import AppointmentStatusChip from "./AppointmentStatusChip";
import CustomButton from "src/components/common/CustomButton";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentCard({
  appointment,
  onClick,
  onConfirm,
  onReject,
  onReschedule,
}: {
  appointment: AppointmentItem;
  onClick: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onReschedule?: () => void;
}) {
  const fullName =
    [appointment.client?.firstName, appointment.client?.lastName]
      .filter(Boolean)
      .join(" ") ||
    appointment.client?.username ||
    appointment.client?.email ||
    "Client";
  const theme = useTheme();

  const getLocationIcon = (location?: string | null) => {
    if (location === "Virtuel") return <Video size={12} />;
    if (location === "Chez le cabinet de comptabilité")
      return <Building size={12} />;
    return <MapPin size={12} />;
  };

  const appointmentDate = appointment.date ? new Date(appointment.date) : null;

  const isToday =
    appointmentDate &&
    appointmentDate.toDateString() === new Date().toDateString();

  const formattedDate = appointmentDate
    ? isToday
      ? "Aujourd'hui"
      : appointmentDate.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
    : "—";

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: "pointer",
        bgcolor: theme.palette.grey[50],
        "&:hover": { bgcolor: "action.hover" },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1.5,
          width: "50%",
        }}
      >
        <Avatar sx={{ width: 36, height: 36 }}>
          {fullName.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ width: "100%" }}>
          <Typography variant="body2" noWrap fontWeight={600}>
            {appointment.title}
          </Typography>
          <Box
            sx={{
              display: "flex",
              color: theme.palette.info.main,
              width: "100%",
            }}
          >
            {/* Full name */}
            <Box
              sx={{
                width: 120,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderRight: `1px solid ${theme.palette.info.lighter}`,
                pr: 1,
              }}
            >
              <Tooltip title={fullName} arrow>
                <Typography
                  variant="caption"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fullName}
                </Typography>
              </Tooltip>
            </Box>

            {/* Date */}
            <Box
              sx={{
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                borderRight: `1px solid ${theme.palette.info.lighter}`,
              }}
            >
              <Calendar size={12} />

              <Tooltip
                title={
                  appointmentDate
                    ? appointmentDate.toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"
                }
                arrow
              >
                <Typography
                  variant="caption"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formattedDate}
                </Typography>
              </Tooltip>
            </Box>

            {/* Time */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderRight: `1px solid ${theme.palette.info.lighter}`,
                px: 1,
              }}
            >
              <Clock3 size={12} />
              <Typography variant="caption">
                {formatTime(appointment.startTime)}
              </Typography>
            </Box>

            {/* Location */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
              }}
            >
              {getLocationIcon(appointment.location)}

              <Tooltip title={appointment.location || "Mon bureau"} arrow>
                <Typography
                  variant="caption"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {appointment.location || "Mon bureau"}
                </Typography>
              </Tooltip>
            </Box>
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
        }}
      >
        <AppointmentStatusChip status={appointment.status} />

        {/* Pending — Refuser / Confirmer */}
        {appointment.status === "pending" && onConfirm && onReject && (
          <Box sx={{ display: "flex", gap: 1, ml: 1 }}>
            <CustomButton
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                onReject();
              }}
            >
              Refuser
            </CustomButton>
            <CustomButton
              variant="contained"
              onClick={(e) => {
                e.stopPropagation();
                onConfirm();
              }}
            >
              Confirmer
            </CustomButton>
          </Box>
        )}

        {/* Confirmed + upcoming — Reporter */}
        {appointment.status === "confirmed" &&
          new Date(appointment.startTime) > new Date() &&
          onReschedule && (
            <Box sx={{ ml: 1 }}>
              <CustomButton
                variant="outlined"
                color="warning"
                onClick={(e) => {
                  e.stopPropagation();
                  onReschedule();
                }}
              >
                Reporter
              </CustomButton>
            </Box>
          )}
      </Box>
    </Box>
  );
}
