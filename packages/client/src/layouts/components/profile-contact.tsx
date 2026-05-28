import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  useTheme,
  Divider,
} from "@mui/material";
import { Phone, Mail, MapPin } from "lucide-react";
import CustomChip from "src/components/common/CustomChip";
import CustomInput from "src/components/common/CustomInput";

export interface ContactInfosData {
  phone?: string;
  email?: string;
  address?: string;
  whatsapp?: string;
  website?: string;
  /** Spécialités du cabinet (affichées en consultation) */
  specialties?: string[];
}

export type ContactFormState = ContactInfosData;

interface ContactInfosProps {
  data?: ContactInfosData;
  isLoading?: boolean;
  isEditing?: boolean;
  /** Called when any contact field changes so parent can include in save */
  onContactChange?: (updates: Partial<ContactFormState>) => void;
}

const chipVariants = [
  "primary",
  "secondary",
  "success",
  "error",
  "purple",
  "brown",
] as const;

const getRandomVariant = () =>
  chipVariants[Math.floor(Math.random() * chipVariants.length)];

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value?: string;
  color: string;
}) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Box
        sx={{
          height: "100%",
          p: 1,
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.grey[50],
          color: theme.palette.grey[900],
        }}
      >
        <Icon size={18} />
      </Box>

      <Box>
        {/* <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", fontWeight: 600 }}
        >
          {label}
        </Typography> */}

        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {value || "-"}
        </Typography>
      </Box>
    </Box>
  );
};

function ContactInfos({
  data,
  isLoading,
  isEditing = false,
  onContactChange,
}: ContactInfosProps) {
  const theme = useTheme();
  const [email, setEmail] = useState(data?.email ?? "");
  const [phone, setPhone] = useState(data?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(data?.whatsapp ?? "");
  const [address, setAddress] = useState(data?.address ?? "");
  const [website, setWebsite] = useState(data?.website ?? "");

  useEffect(() => {
    if (data) {
      setEmail(data.email ?? "");
      setPhone(data.phone ?? "");
      setWhatsapp(data.whatsapp ?? "");
      setAddress(data.address ?? "");
      setWebsite(data.website ?? "");
    }
  }, [
    data?.email,
    data?.phone,
    data?.whatsapp,
    data?.address,
    data?.website,
    isEditing,
  ]);

  const cardSx = {
    p: 3,
    border: 1,
    borderColor: "divider",
    borderRadius: 3,
    minWidth: 320,
    width: "100%",
    boxSizing: "border-box",
  };

  const contactTitleSx = {
    mb: 2,
    color: "text.primary",
    fontWeight: 700,
    fontSize: "1rem",
  };

  const mapBoxSx = {
    mt: 3,
    borderRadius: 2,
    overflow: "hidden" as const,
    height: 180,
    "& iframe": { border: "none" },
  };

  if (isLoading) {
    return (
      <Paper sx={cardSx}>
        <Stack spacing={3}>
          <Skeleton height={50} />
          <Skeleton height={50} />
          <Skeleton height={50} />
        </Stack>
      </Paper>
    );
  }

  if (isEditing) {
    return (
      <Paper sx={cardSx}>
        <Typography variant="subtitle1" sx={contactTitleSx}>
          Contact
        </Typography>
        <Stack spacing={2}>
          <CustomInput
            label="Adresse email professionnelle"
            value={email}
            onChange={(e) => {
              const v = e.target.value;
              setEmail(v);
              onContactChange?.({ email: v });
            }}
            placeholder="contact@exemple.com"
            fullWidth
          />
          <CustomInput
            label="Numéro de téléphone"
            value={phone}
            onChange={(e) => {
              const v = e.target.value;
              setPhone(v);
              onContactChange?.({ phone: v });
            }}
            placeholder="+216 00 000 000"
            fullWidth
            required
          />
          <CustomInput
            label="Numéro WhatsApp"
            value={whatsapp}
            onChange={(e) => {
              const v = e.target.value;
              setWhatsapp(v);
              onContactChange?.({ whatsapp: v });
            }}
            placeholder="Entrer votre numéro whatsapp..."
            fullWidth
          />
          <CustomInput
            label="Localisation"
            value={address}
            onChange={(e) => {
              const v = e.target.value;
              setAddress(v);
              onContactChange?.({ address: v });
            }}
            placeholder="rue, immeuble, région"
            fullWidth
          />
          <CustomInput
            label="Site web"
            value={website}
            onChange={(e) => {
              const v = e.target.value;
              setWebsite(v);
              onContactChange?.({ website: v });
            }}
            placeholder="https://..."
            fullWidth
          />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={cardSx}>
      <Typography variant="body1" sx={{ mb: 3 }}>
        Informations de contact
      </Typography>
      <Stack spacing={3}>
        <InfoItem
          icon={Phone}
          label="Téléphone"
          value={data?.phone}
          color={theme.palette.primary.main}
        />
        <InfoItem
          icon={Mail}
          label="Email"
          value={data?.email}
          color={theme.palette.success.main}
        />
        <InfoItem
          icon={MapPin}
          label="Adresse"
          value={data?.address}
          color={theme.palette.warning.main}
        />
      </Stack>
      <Box sx={mapBoxSx}>
        <iframe
          title="Google Map"
          width="100%"
          height="100%"
          allowFullScreen
          src={`https://www.google.com/maps?q=${encodeURIComponent(
            data?.address || "",
          )}&output=embed`}
        />
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Box>
        <Typography
          variant="caption"
          fontWeight={600}
          color={theme.palette.info.light}
          mb={2}
        >
          Spécialités
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
          {(data?.specialties && data.specialties.length > 0
            ? data.specialties
            : []
          ).map((speciality) => (
            <CustomChip
              key={speciality}
              label={speciality}
              variant={getRandomVariant()}
            />
          ))}
          {(!data?.specialties || data.specialties.length === 0) && (
            <Typography variant="body2" color="text.secondary">
              Aucune spécialité renseignée
            </Typography>
          )}
        </Box>
      </Box>
    </Paper>
  );
}

export { ContactInfos };
export default ContactInfos;
