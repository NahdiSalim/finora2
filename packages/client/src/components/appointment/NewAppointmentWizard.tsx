import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { MapPin, Phone, Video, Plus, X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import MenuItem from "@mui/material/MenuItem";

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
    onClose();
  };

  return (
    <Dialog open={open} onClose={resetAndClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
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
        <Tabs value={step} onChange={(_, v) => setStep(v)} sx={{ mb: 2 }}>
          <Tab value={0} label="Détails" />
          <Tab value={1} label="Date et localisation" />
          <Tab value={2} label="Invités" />
        </Tabs>

        {step === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <CustomInput
              label="Titre *"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <CustomSelect
              label="Sujet *"
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
              label="Description *"
              multiline
              minRows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Informer votre client sur l'objet de la réunion..."
            />
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              }}
            >
              <CustomInput
                label="Date *"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <CustomInput
                label="Heure *"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </Box>
            <Typography variant="subtitle2">Localisation *</Typography>
            <Box sx={{ display: "grid", gap: 1 }}>
              <Box
                onClick={() => setMeetingType("in_person")}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor:
                    meetingType === "in_person" ? "primary.main" : "divider",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <MapPin size={16} />
                  <Typography variant="subtitle2">Réunion physique</Typography>
                </Box>
              </Box>
              <Box
                onClick={() => setMeetingType("online")}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor:
                    meetingType === "online" ? "primary.main" : "divider",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Video size={16} />
                  <Typography variant="subtitle2">Réunion virtuelle</Typography>
                </Box>
              </Box>
              <Box
                onClick={() => setMeetingType("phone")}
                sx={{
                  p: 1.5,
                  border: "1px solid",
                  borderColor:
                    meetingType === "phone" ? "primary.main" : "divider",
                  borderRadius: 2,
                  cursor: "pointer",
                }}
              >
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <Phone size={16} />
                  <Typography variant="subtitle2">
                    Appel téléphonique
                  </Typography>
                </Box>
              </Box>
            </Box>
            <CustomInput
              label="Adresse / Lien / Téléphone"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                meetingType === "online"
                  ? "https://..."
                  : meetingType === "phone"
                    ? "+216 ..."
                    : "Adresse"
              }
            />
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
                placeholder="Guest email"
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
            }}
          >
            Planifier
          </CustomButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
