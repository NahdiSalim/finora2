import { Avatar, Box, Tooltip, Typography, useTheme } from "@mui/material";
import { Calendar, Clock3, MapPin } from "lucide-react";
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
          minWidth: 0,
          width: "50%",
        }}
      >
        <Avatar sx={{ width: 36, height: 36 }}>
          {fullName.slice(0, 1).toUpperCase()}
        </Avatar>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" noWrap fontWeight={600}>
            {appointment.title}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 1.5,
              color: "text.secondary",
              width: "100%",
            }}
          >
            {/* Full name */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                width: 120,
              }}
            >
              <Tooltip title={fullName} arrow>
                <Typography
                  variant="caption"
                  sx={{
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fullName}
                </Typography>
              </Tooltip>
            </Box>

            {/* Time */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                width: 60,
              }}
            >
              <Clock3 size={12} />
              <Tooltip title={formatTime(appointment.startTime)} arrow>
                <Typography
                  variant="caption"
                  sx={{
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {formatTime(appointment.startTime)}
                </Typography>
              </Tooltip>
            </Box>

            {/* Location */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                width: 120,
              }}
            >
              <MapPin size={12} />
              <Tooltip title={appointment.location || "Mon bureau"} arrow>
                <Typography
                  variant="caption"
                  sx={{
                    width: "100%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {appointment.location || "Mon bureau"}
                </Typography>
              </Tooltip>
            </Box>

            {/* Date */}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                width: 120,
              }}
            >
              <Calendar size={12} />
              <Tooltip
                title={
                  appointment.date
                    ? new Date(appointment.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Mon bureau"
                }
                arrow
              >
                <Typography
                  variant="caption"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    width: "100%",
                  }}
                >
                  {appointment.date
                    ? new Date(appointment.date).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      })
                    : "Mon bureau"}
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
