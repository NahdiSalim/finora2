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

export interface ContactInfosData {
  phone?: string;
  email?: string;
  address?: string;
}

interface ContactInfosProps {
  data?: ContactInfosData;
  isLoading?: boolean;
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

export default function ContactInfos({ data, isLoading }: ContactInfosProps) {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Stack spacing={3}>
          <Skeleton height={50} />
          <Skeleton height={50} />
          <Skeleton height={50} />
        </Stack>
      </Paper>
    );
  }

  return (
    <Paper
      sx={{
        p: 3,
        border: 1,
        borderColor: "divider",
      }}
    >
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
      <Box
        sx={{
          mt: 2,
          borderRadius: 2,
          overflow: "hidden",
          height: 180,
        }}
      >
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
        <Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {specialities.map((speciality) => (
              <CustomChip
                key={speciality}
                label={speciality}
                variant={getRandomVariant()}
              />
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}
