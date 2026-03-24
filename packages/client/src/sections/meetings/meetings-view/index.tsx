import { useEffect, useMemo, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Switch,
  Typography,
  useTheme,
} from "@mui/material";
import { Plus, Search, Trash2 } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import { CustomTabs } from "src/components/common/CustomTabs";
import AppointmentCard from "src/components/appointment/AppointmentCard";
import AppointmentDetailsDialog from "src/components/appointment/AppointmentDetailsDialog";
import MonthlyAppointmentCalendar from "src/components/appointment/MonthlyAppointmentCalendar";
import NewAppointmentWizard from "src/components/appointment/NewAppointmentWizard";
import {
  type AppointmentItem,
  type AvailabilityItem,
  useCreateAppointmentMutation,
  useCreateAvailabilityMutation,
  useDeleteAvailabilityMutation,
  useGetAllAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useGetMyAvailabilitiesQuery,
  useRespondAppointmentMutation,
  useUpdateAvailabilityMutation,
} from "src/lib/services/appointmentsApi";
import { useVerifyUserQuery } from "src/lib/services/authApi";
import { useGetClientsQuery } from "src/lib/services/clientApi";

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

const DAY_FR_TO_API: Record<(typeof WEEK_DAYS)[number], string> = {
  Lundi: "lundi",
  Mardi: "mardi",
  Mercredi: "mercredi",
  Jeudi: "jeudi",
  Vendredi: "vendredi",
  Samedi: "samedi",
  Dimanche: "dimanche",
};

const DAY_API_TO_FR: Record<string, (typeof WEEK_DAYS)[number]> = {
  lundi: "Lundi",
  mardi: "Mardi",
  mercredi: "Mercredi",
  jeudi: "Jeudi",
  vendredi: "Vendredi",
  samedi: "Samedi",
  dimanche: "Dimanche",
};

type UiSlot = {
  id?: number;
  localId: string;
  start: string;
  end: string;
};

type InitialSlotSnapshot = {
  start: string;
  end: string;
  slotDuration: number;
  isActive: boolean;
};

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

function formatMonthLabelFr(date: Date) {
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// ─── Availability Settings ────────────────────────────────────────────────────

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
  const [slots, setSlots] = useState<Record<string, UiSlot[]>>({
    Lundi: [{ localId: "Lundi-default", start: "09:00", end: "12:00" }],
    Mardi: [{ localId: "Mardi-default", start: "09:00", end: "12:00" }],
  });
  const [removedSlotIds, setRemovedSlotIds] = useState<number[]>([]);
  const [initialSignature, setInitialSignature] = useState("");
  const [initialSlotsById, setInitialSlotsById] = useState<
    Record<number, InitialSlotSnapshot>
  >({});
  const [saveError, setSaveError] = useState("");

  const {
    data: availabilitiesData,
    isLoading: isLoadingAvailabilities,
    refetch: refetchAvailabilities,
  } = useGetMyAvailabilitiesQuery({ onlyActive: false });
  const [createAvailability, { isLoading: isCreatingAvailability }] =
    useCreateAvailabilityMutation();
  const [updateAvailability, { isLoading: isUpdatingAvailability }] =
    useUpdateAvailabilityMutation();
  const [deleteAvailability, { isLoading: isDeletingAvailability }] =
    useDeleteAvailabilityMutation();

  const isSavingAvailability =
    isCreatingAvailability || isUpdatingAvailability || isDeletingAvailability;

  const signatureFor = (
    argDuration: string,
    argEnabledDays: Record<string, boolean>,
    argSlots: Record<string, UiSlot[]>,
    argRemovedIds: number[],
  ) => {
    const normalized = {
      duration: argDuration,
      enabledDays: WEEK_DAYS.map((d) => ({
        day: d,
        enabled: !!argEnabledDays[d],
      })),
      slots: WEEK_DAYS.map((d) => ({
        day: d,
        slots: (argSlots[d] || [])
          .map((s) => ({ id: s.id ?? null, start: s.start, end: s.end }))
          .sort(
            (a, b) =>
              a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
          ),
      })),
      removed: [...argRemovedIds].sort((a, b) => a - b),
    };
    return JSON.stringify(normalized);
  };

  const hydrateFromApi = (availabilityItems: AvailabilityItem[]) => {
    const nextEnabledDays: Record<string, boolean> = Object.fromEntries(
      WEEK_DAYS.map((d) => [d, false]),
    );
    const nextSlots: Record<string, UiSlot[]> = Object.fromEntries(
      WEEK_DAYS.map((d) => [d, []]),
    );
    let firstDuration = "30";
    const nextInitialById: Record<number, InitialSlotSnapshot> = {};

    availabilityItems
      .filter((a) => a.isRecurring && a.dayOfWeek)
      .forEach((a) => {
        const frDay = DAY_API_TO_FR[String(a.dayOfWeek).toLowerCase()];
        if (!frDay) return;
        if (a.isActive) nextEnabledDays[frDay] = true;
        nextSlots[frDay].push({
          id: a.id,
          localId: `api-${a.id}`,
          start: a.startTime,
          end: a.endTime,
        });
        nextInitialById[a.id] = {
          start: a.startTime,
          end: a.endTime,
          slotDuration: a.slotDuration,
          isActive: a.isActive,
        };
        if (a.slotDuration) firstDuration = String(a.slotDuration);
      });

    WEEK_DAYS.forEach((d) => {
      nextSlots[d].sort(
        (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
      );
    });

    setDuration(firstDuration);
    setEnabledDays(nextEnabledDays);
    setSlots(nextSlots);
    setInitialSlotsById(nextInitialById);
    setRemovedSlotIds([]);
    setInitialSignature(
      signatureFor(firstDuration, nextEnabledDays, nextSlots, []),
    );
  };

  useEffect(() => {
    if (!availabilitiesData?.data) return;
    hydrateFromApi(availabilitiesData.data);
  }, [availabilitiesData]);

  const addSlot = (day: string) => {
    setSlots((prev) => ({
      ...prev,
      [day]: [
        ...(prev[day] || []),
        { localId: `${day}-${Date.now()}`, start: "14:00", end: "17:00" },
      ],
    }));
  };

  const removeSlot = (day: string, localId: string) => {
    setSlots((prev) => {
      const target = (prev[day] || []).find((s) => s.localId === localId);
      if (target?.id) {
        setRemovedSlotIds((old) =>
          old.includes(target.id as number)
            ? old
            : [...old, target.id as number],
        );
      }
      return {
        ...prev,
        [day]: (prev[day] || []).filter((s) => s.localId !== localId),
      };
    });
  };

  const hasChanges =
    initialSignature !==
    signatureFor(duration, enabledDays, slots, removedSlotIds);

  const handleSaveAvailability = async () => {
    setSaveError("");
    const slotDuration = Number.parseInt(duration, 10);
    const safeDuration = Number.isFinite(slotDuration) ? slotDuration : 30;
    const toHHMM = (v: string) => {
      const trimmed = String(v || "").trim();
      const m = trimmed.match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (!Number.isInteger(hh) || !Number.isInteger(mm)) return null;
      if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
      return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
    };
    const toMinutes = (hhmm: string) => {
      const [h, m] = hhmm.split(":").map(Number);
      return h * 60 + m;
    };

    if (safeDuration < 15 || safeDuration > 480) {
      setSaveError("La durée doit être comprise entre 15 et 480 minutes.");
      return;
    }

    for (const day of WEEK_DAYS) {
      const daySlots = slots[day] || [];
      for (const slot of daySlots) {
        const start = toHHMM(slot.start);
        const end = toHHMM(slot.end);
        if (!start || !end) {
          setSaveError(
            `Format horaire invalide (${day}). Utilisez HH:MM, ex: 09:00.`,
          );
          return;
        }
        if (toMinutes(start) >= toMinutes(end)) {
          setSaveError(
            `Heure de début doit être avant l'heure de fin (${day}).`,
          );
          return;
        }
      }
    }

    try {
      for (const id of removedSlotIds) {
        await deleteAvailability(id).unwrap();
      }
      for (const day of WEEK_DAYS) {
        const enabled = !!enabledDays[day];
        const daySlots = slots[day] || [];
        for (const slot of daySlots) {
          const normalizedStart = toHHMM(slot.start) as string;
          const normalizedEnd = toHHMM(slot.end) as string;
          if (slot.id) {
            const initial = initialSlotsById[slot.id];
            const unchanged =
              !!initial &&
              initial.start === normalizedStart &&
              initial.end === normalizedEnd &&
              initial.slotDuration === safeDuration &&
              initial.isActive === enabled;
            if (unchanged) continue;
            await updateAvailability({
              id: slot.id,
              body: {
                startTime: normalizedStart,
                endTime: normalizedEnd,
                slotDuration: safeDuration,
                isActive: enabled,
              },
            }).unwrap();
          } else if (enabled) {
            await createAvailability({
              isRecurring: true,
              dayOfWeek: DAY_FR_TO_API[day],
              startTime: normalizedStart,
              endTime: normalizedEnd,
              slotDuration: safeDuration,
            }).unwrap();
          }
        }
      }
      await refetchAvailabilities();
    } catch (e: any) {
      const backendMessage =
        e?.data?.message ||
        e?.error ||
        "Échec d'enregistrement des disponibilités.";
      setSaveError(
        Array.isArray(backendMessage)
          ? backendMessage.join(" | ")
          : String(backendMessage),
      );
    }
  };

  if (isLoadingAvailabilities) {
    return (
      <Box
        sx={{
          p: 3,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 1.5,
        }}
      >
        <CircularProgress size={22} />
        <Typography color="text.secondary">
          Chargement des disponibilités...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: "white", borderRadius: 3, p: 2 }}>
      {saveError && (
        <Typography sx={{ mb: 1 }} variant="caption" color="error.main">
          {saveError}
        </Typography>
      )}

      <Box sx={{ mb: 2 }}>
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

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
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
                    key={slot.localId}
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
                      à
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
                    <IconButton
                      aria-label={`Supprimer le créneau ${idx + 1}`}
                      size="small"
                      onClick={() => removeSlot(day, slot.localId)}
                    >
                      <Trash2 size={15} />
                    </IconButton>
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

      <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
        <CustomButton
          variant="contained"
          onClick={handleSaveAvailability}
          disabled={!hasChanges || isSavingAvailability}
        >
          Enregistrer
        </CustomButton>
      </Box>
    </Box>
  );
}

// ─── MeetingsView ─────────────────────────────────────────────────────────────

export default function MeetingsView() {
  const [mode, setMode] = useState<Mode>("appointments");
  const [tab, setTab] = useState<TimeTab>("today");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [calendarMonth] = useState(new Date());
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const { data: me } = useVerifyUserQuery();
  const { data: clientsData, isLoading: isLoadingClients } = useGetClientsQuery(
    {
      page: 1,
      limit: 200,
    },
  );

  const { data, isLoading } = useGetAllAppointmentsQuery({
    page: 1,
    limit: 100,
  });
  const appointments = data?.data ?? [];

  const counts = useMemo(
    () => ({
      today: appointments.filter((a) => classifyTimeTab(a) === "today").length,
      upcoming: appointments.filter((a) => classifyTimeTab(a) === "upcoming")
        .length,
      past: appointments.filter((a) => classifyTimeTab(a) === "past").length,
    }),
    [appointments],
  );

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

  const [respondAppointment] = useRespondAppointmentMutation();
  const [createAppointment] = useCreateAppointmentMutation();

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

  // ── Availability layout ───────────────────────────────────────────────────
  if (mode === "availability") {
    return (
      <PageHeader
        title="Mes disponibilités"
        caption="Configurez vos créneaux horaires hebdomadaires."
        backButton={() => setMode("appointments")}
      >
        <AvailabilitySettings />
      </PageHeader>
    );
  }

  // ── Appointments layout ───────────────────────────────────────────────────
  return (
    <PageHeader
      title="Mes Rendez-vous"
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
          label: "Mes disponibilités",
          onClick: () => setMode("availability"),
          variant: "contained",
          color: "secondary",
        },
      ]}
    >
      {/* ── CustomTabs + search ── */}
      <Box mt={2}>
        <CustomTabs
          value={tab}
          onChange={(id) => setTab(id as TimeTab)}
          tabs={[
            { id: "today", label: "Aujourd'hui", count: counts.today },
            { id: "upcoming", label: "À venir", count: counts.upcoming },
            { id: "past", label: "Passé", count: counts.past },
          ]}
        />

        <Box
          sx={{
            backgroundColor: theme.palette.common.white,
            borderRadius: "0 12px 12px 12px",
            p: 2,
          }}
        >
          {/* Search */}
          <Box
            sx={{ display: "flex", justifyContent: "flex-end", mb: 2, mt: -8 }}
          >
            <Box sx={{ width: { xs: "100%", sm: 300 } }}>
              <CustomInput
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par client ..."
                startIcon={<Search />}
              />
            </Box>
          </Box>

          {/* Appointment list */}
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

          {/* Monthly calendar */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.25 }}>
              {formatMonthLabelFr(calendarMonth)}
            </Typography>

            <MonthlyAppointmentCalendar
              monthDate={calendarMonth}
              appointments={appointments}
              onSelectAppointment={setSelectedId}
            />
          </Box>
        </Box>
      </Box>

      {/* ── Appointment details dialog ── */}
      <AppointmentDetailsDialog
        open={selectedId != null}
        appointment={appointment}
        onClose={() => setSelectedId(null)}
        onConfirm={handleConfirm}
        onReject={() => setRejectDialogOpen(true)}
        onEdit={() => setWizardOpen(true)}
      />

      {/* ── Reject reason dialog ── */}
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

      {/* ── New appointment wizard ── */}
      <NewAppointmentWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSchedule={async (payload) => {
          const meId = me?.id ? Number(me.id) : undefined;
          await createAppointment({
            title: payload.title,
            description: payload.description,
            type:
              payload.subject === "facturation"
                ? "review"
                : payload.subject === "budget"
                  ? "consultation"
                  : "consultation",
            date: payload.date,
            hour: payload.time,
            meetingType: payload.meetingType,
            location: payload.location || undefined,
            accountantId: meId,
            clientId: payload.clientId,
            clientNotes: payload.guests.length
              ? `Invités: ${payload.guests.join(", ")}`
              : payload.description,
            color: payload.color,
            guests: payload.guests,
          }).unwrap();
        }}
        clients={clientsData?.data ?? []}
        clientsLoading={isLoadingClients}
      />
    </PageHeader>
  );
}
