import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import { AccountantProfileContent } from "src/sections/profile/accountant-profile-content";

export default function NetworkAccountantProfileView() {
  const { id } = useParams<{ id: string }>();
  const dashboardBase = useDashboardBase();
  const accountantId = id ? parseInt(id, 10) : NaN;

  if (Number.isNaN(accountantId) || accountantId <= 0) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Profil non trouvé.</Typography>
      </Box>
    );
  }

  return (
    <AccountantProfileContent
      accountantId={accountantId}
      backTo={`${dashboardBase}/network`}
      title="Détails profil"
      caption="Profil du comptable"
      allowSubmitReview
    />
  );
}
