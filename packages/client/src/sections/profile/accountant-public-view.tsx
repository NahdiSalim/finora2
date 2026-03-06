import { useParams } from "react-router-dom";
import { Box, Container, Typography, useTheme } from "@mui/material";

import { PublicNavbar } from "src/components/visitor/PublicNavbar";
import { AccountantProfileContent } from "src/sections/profile/accountant-profile-content";

export default function AccountantPublicView() {
  const theme = useTheme();

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
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: theme.palette.grey[50],
      }}
    >
      {/* Navbar fixe */}
      <Box
        sx={{
          height: "10vh",
          minHeight: 56,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.common.white,
        }}
      >
        <PublicNavbar />
      </Box>

      {/* Zone scrollable : seul le contenu défile, pas la navbar */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          pb: { xs: 6, md: 8 },
          pt: 1.5,
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 3, md: 2 },
            maxWidth: "1440px",
            mx: "auto",
          }}
        >
          <AccountantProfileContent
            accountantId={accountantId}
            backTo="/"
            title="Détails profil"
            caption="Tout sur votre profil en un seul endroit."
          />
        </Container>
      </Box>
    </Box>
  );
}
