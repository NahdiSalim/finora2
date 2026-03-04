import React from "react";
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
}

interface ContactInfosProps {
  data?: ContactInfosData;
  isLoading?: boolean;
  isEditing?: boolean;
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

const specialities = ["React", "TypeScript", "Node.js", "UI/UX", "GraphQL"];

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
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", fontWeight: 600 }}
        >
          {label}
        </Typography>

        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {value || "-"}
        </Typography>
      </Box>
    </Box>
  );
};

export default function ContactInfos({
  data,
  isLoading,
  isEditing = false,
}: ContactInfosProps) {
  const theme = useTheme();

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
    mt: 1,
    borderRadius: 2,
    overflow: "hidden" as const,
    height: 180,
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
            value={data?.email ?? ""}
            placeholder="contact@exemple.com"
            fullWidth
          />
          <CustomInput
            label="Numéro de téléphone"
            value={data?.phone ?? ""}
            placeholder="+216 00 000 000"
            fullWidth
            required
          />
          <CustomInput
            label="Numéro WhatsApp"
            value={data?.whatsapp ?? ""}
            placeholder="Entrer votre numéro whatsapp..."
            fullWidth
          />
          <CustomInput
            label="Localisation"
            value={data?.address ?? ""}
            placeholder="rue, immeuble, région"
            fullWidth
          />
          <CustomInput
            label="Site web"
            value={data?.website ?? ""}
            placeholder="https://..."
            fullWidth
          />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper sx={cardSx}>
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
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={`https://www.google.com/maps?q=${encodeURIComponent(
            data?.address || "",
          )}&output=embed`}
        />
      </Box>
      <Divider sx={{ my: 1.5 }} />
      <Box>
        <Typography
          variant="body1"
          fontWeight={600}
          color={theme.palette.grey[500]}
        >
          Spécialités
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
          {specialities.map((speciality) => (
            <CustomChip
              key={speciality}
              label={speciality}
              variant={getRandomVariant()}
            />
          ))}
        </Box>
      </Box>
    </Paper>
  );
}
