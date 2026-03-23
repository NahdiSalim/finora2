import { useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import { MapPin, Phone, Video, Plus, X, MoveLeft } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import MenuItem from "@mui/material/MenuItem";
import CustomAccordion from "../common/CustomAccordion";
import ColorPicker from "../common/ColorPicker";
import { alpha } from "@mui/material/styles";

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
  const [selectedColor, setSelectedColor] = useState("blue");

  const colorOptions = [
    { id: "blue", label: "Bleu", color: "#3B82F6" },
    { id: "green", label: "Vert", color: "#22C55E" },
    { id: "purple", label: "Violet", color: "#8B5CF6" },
    { id: "orange", label: "Orange", color: "#F97316" },
    { id: "red", label: "Rouge", color: "#EF4444" },
    { id: "pink", label: "Rose", color: "#EC4899" },
  ];

  const [locationType, setLocationType] = useState<
    "my_office" | "accounting_office" | "other"
  >("my_office");

  // Seeded color palette — bg is a light tint, letter is the vivid shade
  const AVATAR_COLORS = [
    { bg: "#dbeafe", color: "#1d4ed8" }, // blue
    { bg: "#dcfce7", color: "#15803d" }, // green
    { bg: "#FFE5CF", color: "#FF861F" }, // yellow
    { bg: "#fce7f3", color: "#be185d" }, // pink
    { bg: "#ede9fe", color: "#6d28d9" }, // purple
    { bg: "#ffedd5", color: "#c2410c" }, // orange
  ];

  // Deterministic: same email → same color every render
  function getAvatarColor(email: string) {
    const seed = email
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return AVATAR_COLORS[seed % AVATAR_COLORS.length];
  }

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const canNext = useMemo(() => {
    if (step === 0) return title.trim() && subject.trim() && description.trim();
    if (step === 1) return date && time;
    return true;
  }, [step, title, subject, description, date, time]);

  const [guestError, setGuestError] = useState(false);

  const addGuest = () => {
    const v = guestInput.trim();
    if (!EMAIL_RE.test(v)) {
      setGuestError(true);
      return;
    }
    if (!guests.includes(v)) setGuests((prev) => [...prev, v]);
    setGuestInput("");
    setGuestError(false);
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
            <Typography
              variant="caption"
              color={theme.palette.grey[800]}
              fontWeight={600}
            >
              Couleur du rdv
            </Typography>
            <ColorPicker
              options={colorOptions}
              value={selectedColor}
              onChange={setSelectedColor}
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
                <RadioGroup
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value as any)}
                >
                  <FormControlLabel
                    value="my_office"
                    control={<Radio />}
                    label="Mon bureau"
                  />

                  <FormControlLabel
                    value="accounting_office"
                    control={<Radio />}
                    label="Chez le cabinet de comptabilité"
                  />

                  <FormControlLabel
                    value="other"
                    control={<Radio />}
                    label="Autre localisation"
                  />
                </RadioGroup>

                {locationType === "other" && (
                  <Box sx={{ mt: 2 }}>
                    <CustomInput
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Adresse"
                    />
                  </Box>
                )}
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
                onKeyDown={(e) => e.key === "Enter" && addGuest()}
                placeholder="Email du participant"
                error={guestError}
                helperText={guestError ? "Adresse email invalide" : undefined}
              />
              <CustomButton
                variant="contained"
                onClick={addGuest}
                sx={{ minWidth: 44, px: 1.25 }}
              >
                <Plus size={16} />
              </CustomButton>
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 0.5 }}>
              {guests.map((g) => {
                const { bg, color } = getAvatarColor(g);
                return (
                  <Tooltip key={g} title={g} placement="top" arrow>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.75,
                        pl: 0.5,
                        pr: 1,
                        py: 0.5,
                        bgcolor: bg,
                        borderRadius: 99,
                        border: "1px solid",
                        borderColor: alpha(color, 0.25),
                        maxWidth: 160,
                      }}
                    >
                      {/* Avatar */}
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          bgcolor: color,
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                          textTransform: "uppercase",
                        }}
                      >
                        {g[0]}
                      </Box>

                      {/* Truncated email */}
                      <Typography
                        variant="caption"
                        sx={{
                          color,
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          flex: 1,
                        }}
                      >
                        {g}
                      </Typography>

                      {/* Remove button */}
                      <Box
                        component="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setGuests((prev) => prev.filter((x) => x !== g));
                        }}
                        sx={{
                          all: "unset",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 14,
                          height: 14,
                          borderRadius: "50%",
                          color: alpha(color, 0.6),
                          flexShrink: 0,
                          "&:hover": { color },
                        }}
                      >
                        <X size={11} strokeWidth={2.5} />
                      </Box>
                    </Box>
                  </Tooltip>
                );
              })}
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
          <CustomButton
            variant="text"
            color="info"
            onClick={() => setStep((s) => s - 1)}
          >
            <MoveLeft />
            Retour
          </CustomButton>
        )}
        <Box sx={{ flex: 1 }} />
        <CustomButton variant="outlined" color="info" onClick={resetAndClose}>
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
