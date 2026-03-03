import React from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Skeleton,
  useTheme,
  alpha,
} from "@mui/material";
import { Phone, Mail, MapPin } from "lucide-react";

export interface ContactInfosData {
  phone?: string;
  email?: string;
  address?: string;
}

interface ContactInfosProps {
  data?: ContactInfosData;
  isLoading?: boolean;
}

const InfoItem = ({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: any;
  label: string;
  value?: string;
  color: string;
}) => {
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
          backgroundColor: alpha(color, 0.1),
          color,
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
    </Paper>
  );
}
