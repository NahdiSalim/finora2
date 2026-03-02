import { Card } from "@mui/material";

import { PageHeader } from "src/layouts/components/page-header";
import ProfileHeader from "src/layouts/components/profile-header";

export default function AccountantView() {
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
    </PageHeader>
  );
}
