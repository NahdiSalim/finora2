import { Box, Card } from "@mui/material";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import ContactInfos from "src/layouts/components/profile-contact";
import ProfileHeader from "src/layouts/components/profile-header";
import ProfileStrength from "src/layouts/components/profile-strength";
import ProfileTabs from "src/layouts/components/profile-tabs";

export default function AccountantView() {
  const mockContactData = {
    phone: "+216 99 123 456",
    email: "ahmed.bensalah@email.com",
    address: "Avenue Habib Bourguiba, Tunis, Tunisia",
  };
  return (
    <PageHeader
      title="Mon profil"
      caption="Gérez vos informations personnelles et vos préférences."
    >
      <Card
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          p: 2,
        }}
      >
        <ProfileHeader
          coverImage="public/assets/cover.png"
          avatarImage="public/assets/profilePic.png"
          name="Cabinet chevaille"
          subtitle="Expert comptable"
          onEditCover={() => console.log("Edit cover")}
          onEditAvatar={() => console.log("Edit avatar")}
          onEditProfile={() => console.log("Edit profile")}
        />
      </Card>
      <Card
        sx={{
          mt: 1.5,
          borderRadius: 3,
        }}
      >
        <ProfileStrength
          icon={ShieldCheck}
          title="Force du profil"
          caption="Veuillez compléter votre profil afin de pouvoir télécharger un fichier ou contacter un comptable."
          completedSteps={1}
          totalSteps={5}
        />
      </Card>

      <Box
        width="100%"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: { xs: "center", md: "space-between" },
          alignItems: { xs: "center", md: "flex-start" },
          gap: 1.5,
          mt: 1.5,
        }}
      >
        <Card
          sx={{
            width: { sx: "100%", sm: "100", md: "70%" },
          }}
        >
          <ProfileTabs />
        </Card>
        <Card>
          <ContactInfos data={mockContactData} isLoading={false} />
        </Card>
      </Box>
    </PageHeader>
  );
}
