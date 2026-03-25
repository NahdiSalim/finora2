import { Box, Drawer, Grid, IconButton, Typography } from "@mui/material";
import { Calendar, Download, MapPin, Phone, User2, X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import AppointmentStatusChip from "./AppointmentStatusChip";
import type { AppointmentItem } from "src/lib/services/appointmentsApi";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AppointmentDetailsPanel({
  open,
  appointment,
  onClose,
  onConfirm,
  onReject,
  onEdit,
  onReport,
  canConfirmReject = true,
  canReport = true,
}: {
  appointment: AppointmentItem | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReject: () => void;
  onEdit: () => void;
  onReport?: () => void;
  canConfirmReject?: boolean;
  canReport?: boolean;
}) {
  const isPending = appointment?.status === "pending";
  const isCompleted = appointment?.status === "completed";
  const isConfirmed = appointment?.status === "confirmed";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "95%", sm: 480 },
            height: "calc(100% - 32px)",
            top: "16px",
            right: { xs: "13px", sm: "16px" },
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      {/* HEADER */}
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography fontSize={20} fontWeight={500}>
            {appointment?.title || "Détails du rendez-vous"}
          </Typography>

          {appointment?.status && (
            <Box sx={{ mt: 0.5 }}>
              <AppointmentStatusChip status={appointment.status} />
            </Box>
          )}
        </Box>

        <IconButton onClick={onClose}>
          <X size={18} />
        </IconButton>
      </Box>

      {/* BODY */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 3,
          py: 2,
        }}
      >
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Date et heure
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Calendar size={14} />
              <Typography variant="body2">
                {formatDateTime(appointment?.startTime)}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Comptable
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <User2 size={14} />
              <Typography variant="body2">
                {[
                  appointment?.accountant?.firstName,
                  appointment?.accountant?.lastName,
                ]
                  .filter(Boolean)
                  .join(" ") || "Banque"}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Lieu
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <MapPin size={14} />
              <Typography variant="body2">
                {appointment?.location || "Mon bureau"}
              </Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" color="text.secondary">
              Téléphone
            </Typography>

            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Phone size={14} />
              <Typography variant="body2">+216 98 765 432</Typography>
            </Box>
          </Grid>

          <Grid size={{ xs: 12 }}>
            <Typography variant="caption" color="text.secondary">
              Description
            </Typography>

            <CustomInput
              multiline
              minRows={3}
              value={appointment?.description || ""}
              disabled
            />
          </Grid>

          {isCompleted && (
            <Grid size={{ xs: 12 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                PV de la réunion
              </Typography>

              <Box
                sx={{
                  p: 1.25,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {appointment?.minutesFileName || "PV 12/03/2025.pdf"}
                  </Typography>

                  <Typography variant="caption" color="text.secondary">
                    {appointment?.minutesFileSizeKb
                      ? `${appointment.minutesFileSizeKb} Kb`
                      : "500 Kb"}
                  </Typography>
                </Box>

                <IconButton size="small">
                  <Download size={16} />
                </IconButton>
              </Box>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* FOOTER */}
      <Box
        sx={{
          px: 2,
          pb: 2,
          pt: 1.5,
          display: "flex",
          alignItems: "center",
          borderTop: "1px solid",
          borderColor: "divider",
          flexShrink: 0,
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1 }} />

        {isPending && canConfirmReject ? (
          <>
            <CustomButton variant="outlined" color="error" onClick={onReject}>
              Refuser
            </CustomButton>

            <CustomButton variant="contained" onClick={onConfirm}>
              Confirmer
            </CustomButton>
          </>
        ) : isConfirmed && onReport ? (
          <CustomButton variant="contained" color="warning" onClick={onReport}>
            Reporter
          </CustomButton>
        ) : !isPending && !isConfirmed ? (
          <CustomButton variant="contained" onClick={onEdit}>
            Modifier
          </CustomButton>
        ) : null}
      </Box>
    </Drawer>
  );
}
