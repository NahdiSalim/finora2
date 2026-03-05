import { useParams, useNavigate } from "react-router-dom";
import { Box, Card, Container, Typography, useTheme } from "@mui/material";

import { PublicNavbar } from "src/components/visitor/PublicNavbar";
import ProfileHeader from "src/layouts/components/profile-header";
import ProfileTabs from "src/layouts/components/profile-tabs";
import ContactInfos from "src/layouts/components/profile-contact";
import { useGetPublicAccountantByIdQuery } from "src/lib/services/publicAccountantsApi";
import { PageHeader } from "src/layouts/components/page-header";

export default function AccountantPublicView() {
  const theme = useTheme();

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const accountantId = id ? parseInt(id, 10) : NaN;

  const { data, isLoading, isError } = useGetPublicAccountantByIdQuery(
    accountantId,
    { skip: Number.isNaN(accountantId) },
  );

  const name =
    data?.company?.name ||
    (data?.name && data.name !== "null null"
      ? data.name
      : [data?.firstName, data?.lastName].filter(Boolean).join(" ")) ||
    "Cabinet";

  const subtitle = data?.specialty ?? "Expert comptable";

  const contactData = {
    phone: data?.company?.phone || data?.phone || "",
    email: data?.company?.email || data?.email || "",
    address:
      data?.company?.address ||
      [data?.company?.postalCode, data?.company?.city]
        .filter(Boolean)
        .join(" ") ||
      "",
    whatsapp: "",
    website: "",
  };

  const handleSchedule = () => {
    // TODO: ouvrir prise de RDV ou rediriger
  };

  const handleContact = () => {
    // TODO: ouvrir formulaire contact ou mailto
    if (contactData.email) {
      window.location.href = `mailto:${contactData.email}`;
    }
  };

  if (Number.isNaN(accountantId)) {
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

  if (isError) {
    return (
      <Box
        sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <Box sx={{ height: "10vh", flexShrink: 0 }}>
          <PublicNavbar />
        </Box>
        <Box sx={{ p: 3 }}>
          <Typography color="error">
            Impossible de charger le profil.
          </Typography>
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
        overflow: "hidden", // stop full page scroll
        backgroundColor: theme.palette.grey[50],
      }}
    >
      <Box
        sx={{
          height: "10vh",
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: theme.palette.common.white,
        }}
      >
        <PublicNavbar />
      </Box>

      <Container
        maxWidth={false}
        sx={{
          px: { xs: 2, sm: 3, md: 2 },
          maxWidth: "1440px",
          mx: "auto",
        }}
      >
        <Box
          sx={{
            height: "90vh",
            overflowY: "auto", // scroll only here
            pb: { xs: 6, md: 8 },
            pt: 1.5,
          }}
        >
          <PageHeader
            title="Détails profil"
            caption="Tout sur votre profil en un seul endroit."
            backButton={{}}
          />

          <Card sx={{ bgcolor: "white", borderRadius: 3, p: 2 }}>
            <ProfileHeader
              coverImage={data?.coverPhotoUrl ?? undefined}
              avatarImage={
                data?.photoUrl ?? data?.company?.logoUrl ?? undefined
              }
              name={name}
              subtitle={subtitle}
              onSchedule={handleSchedule}
              onContact={handleContact}
            />
          </Card>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 1.5,
              mt: 1.5,
              alignItems: { xs: "stretch", md: "flex-start" },
            }}
          >
            <Card
              sx={{
                flex: { md: "1 1 70%" },
                borderRadius: 3,
                overflow: "hidden",
              }}
            >
              <ProfileTabs
                mode="visitor"
                accountantId={data?.id}
                companyId={data?.company?.id}
              />
            </Card>
            <Card
              sx={{
                width: { xs: "100%", md: 440 },
                minWidth: { md: 440 },
                flexShrink: 0,
                borderRadius: 3,
              }}
            >
              <ContactInfos
                data={contactData}
                isLoading={isLoading}
                isEditing={false}
              />
            </Card>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}
