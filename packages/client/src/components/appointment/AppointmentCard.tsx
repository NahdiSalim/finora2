import { Avatar, Box, Tooltip, Typography, useTheme } from "@mui/material";
import { Building, Calendar, Clock3, MapPin, Video } from "lucide-react";
import { type AppointmentItem } from "src/lib/services/appointmentsApi";
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
  period,
  onClick,
  onConfirm,
  onReject,
  onReschedule,
  canConfirmReject = true,
  canReschedule = true,
}: {
  appointment: AppointmentItem;
  period: "today" | "upcoming" | "past";
  onClick: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
  onReschedule?: () => void;
  canConfirmReject?: boolean;
  canReschedule?: boolean;
}) {
  const theme = useTheme();

  const fullName =
    [appointment.client?.firstName, appointment.client?.lastName]
      .filter(Boolean)
      .join(" ") ||
    appointment.client?.username ||
    appointment.client?.email ||
    "Client";

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

  const shouldShowDate = !(period === "today" && isToday);

  let formattedDate = "—";
  if (appointmentDate) {
    if (period === "upcoming" && isToday) {
      formattedDate = "Aujourd'hui";
    } else {
      formattedDate = appointmentDate.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    }
  }

  return (
    <Box
      sx={{
        p: 1.5,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        bgcolor: theme.palette.grey[50],
        "&:hover": { bgcolor: "action.hover" },
        flexDirection: { xs: "column", sm: "row" },
        gap: { xs: 1.5, sm: 0 },
      }}
    >
      {/* ✅ Partie gauche : cliquable pour ouvrir les détails */}
      <Box
        onClick={onClick}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          width: { xs: "100%", sm: "50%" },
          cursor: "pointer",
        }}
      >
        <Avatar
          sx={{
            width: 36,
            height: 36,
            background: `linear-gradient(135deg, ${theme.palette.secondary.main}, ${theme.palette.secondary.dark})`,
          }}
        >
          {fullName.slice(0, 1).toUpperCase()}
        </Avatar>

        <Box sx={{ width: "100%" }}>
          <Typography
            variant="body2"
            noWrap
            overflow="hidden"
            textOverflow="ellipsis"
            width="90%"
            fontWeight={600}
          >
            {appointment.title}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              color: theme.palette.info.main,
              gap: { xs: 0.5, sm: 0 },
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                borderRight: {
                  xs: "none",
                  sm: `1px solid ${theme.palette.info.lighter}`,
                },
                pr: { xs: 0, sm: 1 },
                maxWidth: { xs: "100%", sm: 120 },
                minWidth: 0,
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

            {shouldShowDate && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: { xs: 0, sm: 1 },
                  borderRight: {
                    xs: "none",
                    sm: `1px solid ${theme.palette.info.lighter}`,
                  },
                }}
              >
                <Calendar size={12} />
                <Tooltip title={formattedDate} arrow>
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
            )}

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: { xs: 0, sm: 1 },
                borderRight: {
                  xs: "none",
                  sm: `1px solid ${theme.palette.info.lighter}`,
                },
              }}
            >
              <Clock3 size={12} />
              <Typography variant="caption">
                {formatTime(appointment.startTime)}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: { xs: 0, sm: 1 },
              }}
            >
              {getLocationIcon(appointment.location)}
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
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ✅ Partie droite : actions – ne déclenche PAS onClick de la carte */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          justifyContent: { xs: "center", sm: "flex-end" },
          width: { xs: "100%", sm: "auto" },
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <AppointmentStatusChip status={appointment.status} />

        {appointment.status === "pending" &&
          canConfirmReject &&
          onConfirm &&
          onReject && (
            <Box sx={{ display: "flex", gap: 1, ml: { xs: 0, sm: 1 } }}>
              <CustomButton variant="outlined" color="error" onClick={onReject}>
                Refuser
              </CustomButton>
              <CustomButton variant="contained" onClick={onConfirm}>
                Confirmer
              </CustomButton>
            </Box>
          )}

        {appointment.status === "confirmed" && (
          <Box sx={{ display: "flex", gap: 1, ml: { xs: 0, sm: 1 } }}>
            {onReschedule && (
              <CustomButton
                variant="contained"
                color="secondary"
                onClick={onReschedule}
              >
                Reporter
              </CustomButton>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
}
