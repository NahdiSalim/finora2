import { Avatar, Box, Typography, useTheme } from "@mui/material";
import { Clock3, MapPin } from "lucide-react";
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
}: {
  appointment: AppointmentItem;
  onClick: () => void;
  onConfirm?: () => void;
  onReject?: () => void;
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
              gap: 1.5,
              color: "text.secondary",
            }}
          >
            <Typography variant="caption" noWrap>
              {fullName}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Clock3 size={12} />
              <Typography variant="caption">
                {formatTime(appointment.startTime)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <MapPin size={12} />
              <Box>
                <Typography variant="caption" noWrap>
                  {appointment.location || "Mon bureau"}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
      <AppointmentStatusChip status={appointment.status} />
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
            confirmer
          </CustomButton>
        </Box>
      )}
    </Box>
  );
}
