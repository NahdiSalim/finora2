import { useState } from "react";
import { Box, Card } from "@mui/material";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import ContactInfos from "src/layouts/components/profile-contact";
import ProfileHeader from "src/layouts/components/profile-header";
import ProfileStrength from "src/layouts/components/profile-strength";
import ProfileTabs from "src/layouts/components/profile-tabs";
import CustomButton from "src/components/common/CustomButton";
import { useGetMyAccountantProfileQuery } from "src/lib/services/accountantProfileApi";

export default function AccountantView() {
  const [isEditing, setIsEditing] = useState(false);
  const { data, isLoading } = useGetMyAccountantProfileQuery();

  const name =
    data?.company.name ||
    (data?.name && data.name !== "null null"
      ? data.name
      : [data?.firstName, data?.lastName].filter(Boolean).join(" ")) ||
    "Mon cabinet";

  const subtitle = data?.specialty || "Expert comptable";

  const contactData = {
    phone: data?.company.phone || data?.phone || "",
    email: data?.company.email || data?.email || "",
    address:
      data?.company.address ||
      [data?.company.postalCode, data?.company.city]
        .filter(Boolean)
        .join(" ") ||
      "",
    whatsapp: "",
    website: "",
  };

  const profileInfosData = {
    cabinetName: data?.company?.name ?? "",
    sector: data?.specialty ?? "",
  };

  // ------------------------------------------------------------------
  // Compute profile strength (percentage + label)
  // On se base sur plusieurs champs du profil pour éviter d'avoir 100%
  // alors que des infos importantes manquent encore.
  // ------------------------------------------------------------------
  const infoFields = [
    // Identité / cabinet
    data?.company?.name,
    data?.name,
    data?.firstName,
    data?.lastName,
    data?.specialty,
    data?.department,
    data?.diploma,
    // Coordonnées directes
    data?.phone,
    data?.email,
    // Coordonnées cabinet
    data?.company?.phone,
    data?.company?.email,
    data?.company?.address,
    data?.company?.city,
    data?.company?.postalCode,
    data?.company?.vatNumber,
    data?.company?.legalForm,
  ];

  const filledCount = infoFields.filter(
    (value) => typeof value === "string" && value.trim().length > 0,
  ).length;

  const totalSteps = 10;
  const completedSteps =
    filledCount === 0
      ? 1
      : Math.min(
          totalSteps,
          Math.max(
            1,
            Math.round((filledCount / infoFields.length) * totalSteps),
          ),
        );

  const percentage = Math.round((completedSteps / totalSteps) * 100);

  // Libellés détaillés selon le pourcentage
  // 0–19%   → Très faible
  // 20–39%  → Faible
  // 40–59%  → Moyenne
  // 60–79%  → Fort
  // 80–100% → Très fort
  let strengthLabel = "Très faible";
  if (percentage >= 80) strengthLabel = "Très fort";
  else if (percentage >= 60) strengthLabel = "Fort";
  else if (percentage >= 40) strengthLabel = "Moyenne";
  else if (percentage >= 20) strengthLabel = "Faible";

  const strengthTitle = `Force du profil ${percentage}% : ${strengthLabel}`;
  const strengthCaption =
    "Veuillez compléter votre profil afin de pouvoir télécharger un fichier ou contacter un comptable.";

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
          coverImage="/assets/cover.png"
          avatarImage={data?.photo || "/assets/profilePic.png"}
          name={name}
          subtitle={subtitle}
          onEditCover={() => console.log("Edit cover")}
          onEditAvatar={() => console.log("Edit avatar")}
          onEditProfile={() => setIsEditing(true)}
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
          title={strengthTitle}
          caption={strengthCaption}
          completedSteps={completedSteps}
          totalSteps={totalSteps}
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
          <ProfileTabs
            profileInfosData={profileInfosData}
            isEditing={isEditing}
          />
        </Card>
        <Card
          sx={{
            width: { xs: "100%", md: 440 },
            minWidth: { xs: "100%", md: 440 },
            flexShrink: 0,
          }}
        >
          <ContactInfos
            data={contactData}
            isLoading={isLoading}
            isEditing={isEditing}
          />
        </Card>
      </Box>

      {isEditing && (
        <Box
          sx={{
            mt: 3,
            display: "flex",
            justifyContent: "flex-end",
            gap: 2,
          }}
        >
          <CustomButton
            variant="outlined"
            color="info"
            onClick={() => setIsEditing(false)}
          >
            Annuler
          </CustomButton>
          <CustomButton
            variant="contained"
            color="primary"
            onClick={() => setIsEditing(false)}
          >
            Enregistrer
          </CustomButton>
        </Box>
      )}
    </PageHeader>
  );
}
