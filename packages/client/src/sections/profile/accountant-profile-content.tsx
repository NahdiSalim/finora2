import { useState } from "react";
import { Box, Card, Typography } from "@mui/material";

import { ContactAccountantModal } from "src/components/visitor/ContactAccountantModal";
import ProfileHeader from "src/layouts/components/profile-header";
import ProfileTabs from "src/layouts/components/profile-tabs";
import ContactInfos from "src/layouts/components/profile-contact";
import { PageHeader } from "src/layouts/components/page-header";
import { useGetPublicAccountantByIdQuery } from "src/lib/services/publicAccountantsApi";

export type AccountantProfileContentProps = {
  accountantId: number;
  /** Path to navigate back (e.g. "/" or "/dashboard/network") */
  backTo: string;
  /** Title in the page header */
  title?: string;
  /** Caption below the title */
  caption?: string;
  /** Afficher le formulaire "Partager un avis" (client connecté uniquement, pas pour le visiteur) */
  allowSubmitReview?: boolean;
};

export function AccountantProfileContent({
  accountantId,
  backTo,
  title = "Détails profil",
  caption = "Tout sur votre profil en un seul endroit",
  allowSubmitReview = false,
}: AccountantProfileContentProps) {
  const [contactModalOpen, setContactModalOpen] = useState(false);

  const { data, isLoading, isError } = useGetPublicAccountantByIdQuery(
    accountantId,
    { skip: !accountantId },
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
    whatsapp: data?.company?.numWhatsapp ?? "",
    website: data?.company?.website ?? "",
    specialties: data?.company?.specialties ?? [],
  };

  const handleSchedule = () => {
    // TODO: ouvrir prise de RDV ou rediriger
  };

  const handleContact = () => {
    setContactModalOpen(true);
  };

  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Impossible de charger le profil.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        py: 2,
        px: { xs: 2, sm: 3 },
        maxWidth: 1440,
        mx: "auto",
        width: "100%",
        bgcolor: "grey.50",
      }}
    >
      <PageHeader
        title={title}
        caption={caption}
        backButton={{ path: backTo }}
        sx={{ mb: 0 }}
      />

      <Card sx={{ bgcolor: "white", borderRadius: 3, p: 2, mt: 1.5 }}>
        <ProfileHeader
          coverImage={data?.coverPhotoUrl ?? undefined}
          avatarImage={data?.photoUrl ?? data?.company?.logoUrl ?? undefined}
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
            allowSubmitReview={allowSubmitReview}
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

      <ContactAccountantModal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        accountantId={data?.id ?? null}
      />
    </Box>
  );
}
