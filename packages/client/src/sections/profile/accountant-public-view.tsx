import { useParams } from "react-router-dom";
import { Box, Typography } from "@mui/material";

import { PublicNavbar } from "src/components/visitor/PublicNavbar";
import { AccountantProfileContent } from "src/sections/profile/accountant-profile-content";

export default function AccountantPublicView() {
  const { id } = useParams<{ id: string }>();
  const accountantId = id ? parseInt(id, 10) : NaN;

  if (Number.isNaN(accountantId) || accountantId <= 0) {
    return (
      <Box
        sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Box sx={{ height: "10vh", flexShrink: 0 }}>
          <PublicNavbar />
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography>Profil non trouvé.</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        bgcolor: "grey.50",
      }}
    >
      <Box sx={{ height: "10vh", flexShrink: 0 }}>
        <PublicNavbar />
      </Box>

      <Box sx={{ flex: 1 }}>
        <AccountantProfileContent
          accountantId={accountantId}
          backTo="/"
          backLabel="Détails profil"
          caption="Tout sur votre profil en un seul endroit"
        />
      </Box>
    </Box>
  );
}
