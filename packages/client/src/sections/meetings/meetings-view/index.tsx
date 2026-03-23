import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Switch,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Plus } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import AppointmentCard from "src/components/appointment/AppointmentCard";
import AppointmentDetailsDialog from "src/components/appointment/AppointmentDetailsDialog";
import MonthlyAppointmentCalendar from "src/components/appointment/MonthlyAppointmentCalendar";
import NewAppointmentWizard from "src/components/appointment/NewAppointmentWizard";
import {
  type AppointmentItem,
  useGetAllAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useRespondAppointmentMutation,
} from "src/lib/services/appointmentsApi";

type Mode = "appointments" | "availability";
type TimeTab = "today" | "upcoming" | "past";

const WEEK_DAYS = [
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
  "Dimanche",
] as const;

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function classifyTimeTab(item: AppointmentItem): TimeTab {
  const now = new Date();
  const d = new Date(item.startTime);
  if (sameDay(d, now)) return "today";
  return d.getTime() > now.getTime() ? "upcoming" : "past";
}

function AvailabilitySettings() {
  const [duration, setDuration] = useState("30");
  const [enabledDays, setEnabledDays] = useState<Record<string, boolean>>({
    Lundi: true,
    Mardi: true,
    Mercredi: false,
    Jeudi: false,
    Vendredi: false,
    Samedi: false,
    Dimanche: false,
  });
  const [slots, setSlots] = useState<
    Record<string, Array<{ start: string; end: string }>>
  >({
    Lundi: [{ start: "09:00", end: "12:00" }],
    Mardi: [{ start: "09:00", end: "12:00" }],
  });

  const addSlot = (day: string) => {
    setSlots((prev) => ({
      ...prev,
      [day]: [...(prev[day] || []), { start: "14:00", end: "17:00" }],
    }));
  };

  return (
    <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2 }}>
      <Typography variant="h5">Mes disponibilités</Typography>
      <Typography variant="caption" color="text.secondary">
        Suivi de vos rendez-vous
      </Typography>

      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Durée du rendez-vous
        </Typography>
        <CustomInput
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="30 minutes"
        />
        <Typography variant="caption" color="text.secondary">
          Les clients pourront réserver par créneaux de {duration || "30"}{" "}
          minutes.
        </Typography>
      </Box>

      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {WEEK_DAYS.map((day) => (
          <Box
            key={day}
            sx={{ borderTop: "1px solid", borderColor: "divider", pt: 1.5 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 1,
              }}
            >
              <Typography variant="subtitle2">{day}</Typography>
              <Switch
                checked={!!enabledDays[day]}
                onChange={(_, checked) =>
                  setEnabledDays((prev) => ({ ...prev, [day]: checked }))
                }
              />
            </Box>
            {enabledDays[day] && (
              <>
                {(slots[day] || []).map((slot, idx) => (
                  <Box
                    key={`${day}-${idx}`}
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      mb: 1,
                    }}
                  >
                    <CustomInput
                      value={slot.start}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSlots((prev) => ({
                          ...prev,
                          [day]: prev[day].map((s, i) =>
                            i === idx ? { ...s, start: v } : s,
                          ),
                        }));
                      }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      a
                    </Typography>
                    <CustomInput
                      value={slot.end}
                      onChange={(e) => {
                        const v = e.target.value;
                        setSlots((prev) => ({
                          ...prev,
                          [day]: prev[day].map((s, i) =>
                            i === idx ? { ...s, end: v } : s,
                          ),
                        }));
                      }}
                    />
                  </Box>
                ))}
                <CustomButton
                  variant="contained"
                  fullWidth
                  startIcon={<Plus size={16} />}
                  onClick={() => addSlot(day)}
                >
                  Ajouter un créneau
                </CustomButton>
              </>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default function MeetingsView() {
  const [mode, setMode] = useState<Mode>("appointments");
  const [tab, setTab] = useState<TimeTab>("today");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [calendarMonth] = useState(new Date());
  const [search, setSearch] = useState("");

  const { data, isLoading } = useGetAllAppointmentsQuery({
    page: 1,
    limit: 100,
  });
  const appointments = data?.data ?? [];

  const filtered = useMemo(
    () =>
      appointments
        .filter((a) => classifyTimeTab(a) === tab)
        .filter((a) => {
          const term = search.trim().toLowerCase();
          if (!term) return true;
          const name = [a.client?.firstName, a.client?.lastName]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
          return a.title.toLowerCase().includes(term) || name.includes(term);
        }),
    [appointments, tab, search],
  );

  const { data: detailsData } = useGetAppointmentByIdQuery(selectedId!, {
    skip: selectedId == null,
  });
  const appointment = detailsData?.data ?? null;
  const [respondAppointment, { isLoading: isResponding }] =
    useRespondAppointmentMutation();

  const handleConfirm = async () => {
    if (!selectedId) return;
    await respondAppointment({ id: selectedId, action: "confirm" });
  };

  const handleReject = async () => {
    if (!selectedId) return;
    await respondAppointment({
      id: selectedId,
      action: "reject",
      rejectionReason: rejectReason,
    });
    setRejectDialogOpen(false);
    setRejectReason("");
  };

  return (
    <PageHeader
      title="Mes RDV"
      caption="Suivi de vos rendez-vous"
      actions={[
        {
          label: "Nouveau RDV",
          icon: <Plus size={16} />,
          onClick: () => setWizardOpen(true),
          variant: "contained",
          color: "primary",
        },
        {
          label:
            mode === "availability" ? "Mes rendez-vous" : "Mes disponibilités",
          onClick: () =>
            setMode((m) =>
              m === "availability" ? "appointments" : "availability",
            ),
          variant: "contained",
          color: "warning",
        },
      ]}
    >
      {mode === "availability" ? (
        <AvailabilitySettings />
      ) : (
        <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
              gap: 2,
            }}
          >
            <Tabs
              value={tab}
              onChange={(_, v) => setTab(v)}
              sx={{
                minHeight: 40,
                bgcolor: "grey.100",
                borderRadius: 2,
                p: 0.5,
                "& .MuiTabs-indicator": { display: "none" },
                "& .MuiTab-root": {
                  minHeight: 30,
                  minWidth: 110,
                  textTransform: "none",
                  borderRadius: 1.5,
                  color: "text.secondary",
                  fontWeight: 500,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "common.white",
                  },
                },
              }}
            >
              <Tab value="today" label="Aujourd'hui" />
              <Tab value="upcoming" label="A venir" />
              <Tab value="past" label="Passé" />
            </Tabs>
            <Box sx={{ width: { xs: "100%", sm: 300 } }}>
              <CustomInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par client ..."
              />
            </Box>
          </Box>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {isLoading ? (
              <Typography color="text.secondary">Chargement...</Typography>
            ) : filtered.length === 0 ? (
              <Typography color="text.secondary">Aucun rendez-vous.</Typography>
            ) : (
              filtered.map((item) => (
                <AppointmentCard
                  key={item.id}
                  appointment={item}
                  onClick={() => setSelectedId(item.id)}
                  onConfirm={async () => {
                    await respondAppointment({
                      id: item.id,
                      action: "confirm",
                    });
                  }}
                  onReject={() => {
                    setSelectedId(item.id);
                    setRejectDialogOpen(true);
                  }}
                />
              ))
            )}
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.25 }}>
              Septembre 2024
            </Typography>
            <MonthlyAppointmentCalendar
              monthDate={calendarMonth}
              appointments={filtered}
              onSelectAppointment={setSelectedId}
            />
          </Box>
        </Box>
      )}

      <AppointmentDetailsDialog
        open={selectedId != null}
        appointment={appointment}
        onClose={() => setSelectedId(null)}
        onConfirm={handleConfirm}
        onReject={() => setRejectDialogOpen(true)}
        onEdit={() => setWizardOpen(true)}
      />

      <Dialog
        open={rejectDialogOpen}
        onClose={() => setRejectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Refuser la réunion</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Veuillez saisir la raison de refus.
          </Typography>
          <CustomInput
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Ex: conflit d'horaire"
          />
        </DialogContent>
        <DialogActions>
          <CustomButton
            variant="outlined"
            onClick={() => setRejectDialogOpen(false)}
          >
            Annuler
          </CustomButton>
          <CustomButton
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={!rejectReason.trim()}
          >
            Confirmer
          </CustomButton>
        </DialogActions>
      </Dialog>

      <NewAppointmentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSchedule={() => {
          // NOTE: backend currently restricts create endpoint to CLIENT.
          // We keep full wizard workflow UI for accountant and can plug accountant endpoint later.
        }}
      />
    </PageHeader>
  );
}
