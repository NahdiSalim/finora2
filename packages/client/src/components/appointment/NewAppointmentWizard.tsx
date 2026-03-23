import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import { MapPin, Phone, Video, Plus, X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import MenuItem from "@mui/material/MenuItem";
import CustomAccordion from "../common/CustomAccordion";

export interface NewAppointmentPayload {
  title: string;
  subject: string;
  description: string;
  date: string;
  time: string;
  meetingType: "in_person" | "online" | "phone";
  location: string;
  guests: string[];
}

export default function NewAppointmentWizard({
  open,
  onClose,
  onSchedule,
}: {
  open: boolean;
  onClose: () => void;
  onSchedule: (payload: NewAppointmentPayload) => void | Promise<void>;
}) {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [meetingType, setMeetingType] = useState<
    "in_person" | "online" | "phone"
  >("in_person");
  const [location, setLocation] = useState("");
  const [guestInput, setGuestInput] = useState("");
  const [guests, setGuests] = useState<string[]>([]);
  const theme = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const canNext = useMemo(() => {
    if (step === 0) return title.trim() && subject.trim() && description.trim();
    if (step === 1) return date && time;
    return true;
  }, [step, title, subject, description, date, time]);

  const addGuest = () => {
    const v = guestInput.trim();
    if (!v) return;
    if (!guests.includes(v)) setGuests((prev) => [...prev, v]);
    setGuestInput("");
  };

  const resetAndClose = () => {
    setStep(0);
    setTitle("");
    setSubject("");
    setDescription("");
    setDate("");
    setTime("09:00");
    setMeetingType("in_person");
    setLocation("");
    setGuestInput("");
    setGuests([]);
    setIsSubmitting(false);
    setSubmitError("");
    onClose();
  };
  const hours = ["09:00", "10:00", "11:00", "12:00"];

  // Steps configuration
  const steps = [
    { label: "Détails", value: 0 },
    { label: "Date et localisation", value: 1 },
    { label: "Invités", value: 2 },
  ];

  return (
    <Dialog
      open={open}
      onClose={resetAndClose}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4, // softer corners
          overflow: "hidden", // keeps rounded corners clean
          bgcolor: "background.paper",
        },
      }}
    >
      {/* Title with subtle border and clean close button */}
      <DialogTitle
        sx={{
          px: 3,
          pt: 3,
          pb: 1.5,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography variant="h6">Nouveau rendez-vous</Typography>
          <Typography variant="caption" color="text.secondary">
            Planifiez votre prochaine rencontre avec votre client.
          </Typography>
        </Box>
        <IconButton onClick={resetAndClose}>
          <X size={18} />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {/* Custom stepper with labels and progress bar */}
        {/* Custom stepper with segmented progress bar */}
        <Box sx={{ mb: 3 }}>
          {/* Segmented progress bar with gaps */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {steps.map((s, idx) => {
              const isCompleted = step > idx;
              const isActive = step === idx;
              const bgColor =
                isCompleted || isActive ? "primary.main" : "info.lighter";

              return (
                <Box
                  key={s.value}
                  sx={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    cursor: "pointer",
                  }}
                  onClick={() => setStep(s.value)}
                >
                  {/* Progress bar */}
                  <Box
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: bgColor,
                      transition: "background-color 0.2s ease",
                    }}
                  />
                  {/* Label — sits directly under its own bar */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: isActive ? 600 : 400,
                      color: isActive ? "primary.main" : "text.secondary",
                      transition: "all 0.2s",
                      "&:hover": { color: "primary.main" },
                    }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        {step === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CustomInput
              label="Titre"
              placeholder="Titre du rendez-vous"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <CustomSelect
              label="Sujet"
              required
              value={subject}
              onChange={(e) => setSubject(String(e.target.value))}
              displayEmpty
              renderValue={(v) => (v ? String(v) : "Sélectionner un sujet")}
            >
              <MenuItem value="">
                <em>Sélectionner un sujet</em>
              </MenuItem>
              <MenuItem value="bilan">Review Bilan</MenuItem>
              <MenuItem value="facturation">Révision Factures</MenuItem>
              <MenuItem value="budget">Préparation budget</MenuItem>
            </CustomSelect>
            <CustomInput
              label="Description"
              required
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informer votre client sur l'objet de la réunion..."
            />
          </Box>
        )}

        {step === 1 && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
              width: "100%",
            }}
          >
            <Box>
              <CustomInput
                label="Date *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </Box>
            <Box>
              <Typography
                variant="caption"
                color={theme.palette.grey[800]}
                fontWeight={600}
              >
                Heure *
              </Typography>

              <Box
                gap={1.5}
                mt={1}
                sx={{
                  display: "flex",
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                {hours.map((hour) => {
                  const selected = time === hour;

                  return (
                    <CustomButton
                      key={hour}
                      variant={selected ? "contained" : "outlined"}
                      onClick={() => setTime(hour)}
                      fullWidth
                      sx={{
                        minHeight: 50,
                        borderRadius: 3,

                        ...(selected && {
                          backgroundColor: "primary.main",
                          color: "white",
                        }),

                        ...(!selected && {
                          borderColor: "info.main",
                          color: "info.main",
                        }),
                      }}
                    >
                      {hour}
                    </CustomButton>
                  );
                })}
              </Box>
            </Box>
            <Typography variant="subtitle2">Localisation *</Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              <CustomAccordion
                id="in_person"
                icon={<MapPin size={22} color={theme.palette.primary.main} />}
                title="Réunion physique"
                subtitle="Reunion face a face"
                expanded={meetingType === "in_person"}
                onChange={setMeetingType}
              >
                <CustomInput
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Adresse"
                />
              </CustomAccordion>

              <CustomAccordion
                id="online"
                icon={<Video size={22} color={theme.palette.primary.main} />}
                title="Réunion virtuelle"
                subtitle="Reunion en ligne"
                expanded={meetingType === "online"}
                onChange={setMeetingType}
              >
                <CustomInput
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="https://..."
                />
              </CustomAccordion>

              <CustomAccordion
                id="phone"
                icon={<Phone size={22} color={theme.palette.primary.main} />}
                title="Appel téléphonique"
                subtitle="Via whatsApp ou sur tél"
                expanded={meetingType === "phone"}
                onChange={setMeetingType}
              >
                <CustomInput
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="+216 ..."
                />
              </CustomAccordion>
            </Box>
          </Box>
        )}

        {step === 2 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Typography variant="subtitle2">Ajouter des invités</Typography>
            <Box
              sx={{ display: "grid", gap: 1, gridTemplateColumns: "1fr auto" }}
            >
              <CustomInput
                value={guestInput}
                onChange={(e) => setGuestInput(e.target.value)}
                placeholder="Email du participant"
              />
              <CustomButton
                variant="contained"
                onClick={addGuest}
                sx={{ minWidth: 44, px: 1.25 }}
              >
                <Plus size={16} />
              </CustomButton>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {guests.map((g) => (
                <Box
                  key={g}
                  sx={{
                    px: 1.25,
                    py: 0.75,
                    bgcolor: "action.hover",
                    borderRadius: 5,
                    fontSize: 13,
                  }}
                >
                  {g}
                </Box>
              ))}
            </Box>
            {submitError ? (
              <Typography variant="caption" color="error.main">
                {submitError}
              </Typography>
            ) : null}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        {step > 0 && (
          <CustomButton variant="text" onClick={() => setStep((s) => s - 1)}>
            Retour
          </CustomButton>
        )}
        <Box sx={{ flex: 1 }} />
        <CustomButton variant="outlined" onClick={resetAndClose}>
          Annuler
        </CustomButton>
        {step < 2 ? (
          <CustomButton
            variant="contained"
            onClick={() => setStep((s) => s + 1)}
            disabled={!canNext}
          >
            Suivant
          </CustomButton>
        ) : (
          <CustomButton
            variant="contained"
            onClick={async () => {
              setSubmitError("");
              setIsSubmitting(true);
              try {
                await onSchedule({
                  title,
                  subject,
                  description,
                  date,
                  time,
                  meetingType,
                  location,
                  guests,
                });
                resetAndClose();
              } catch (e: any) {
                const msg =
                  e?.data?.message ||
                  e?.error ||
                  "Échec de planification du rendez-vous.";
                setSubmitError(
                  Array.isArray(msg) ? msg.join(" | ") : String(msg),
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting}
          >
            Planifier
          </CustomButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
