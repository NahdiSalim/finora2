import { useRef, useState, useCallback } from "react";
import { Box, Card } from "@mui/material";
import { ShieldCheck } from "lucide-react";

import { PageHeader } from "src/layouts/components/page-header";
import ContactInfos, {
  type ContactFormState,
} from "src/layouts/components/profile-contact";
import ProfileHeader from "src/layouts/components/profile-header";
import ProfileStrength from "src/layouts/components/profile-strength";
import ProfileTabs from "src/layouts/components/profile-tabs";
import CustomButton from "src/components/common/CustomButton";
import ImageCropModal, {
  type CropType,
} from "src/components/profile/ImageCropModal";
import type { ProfileInfosFormState } from "src/layouts/components/profile-infos-tab";
import { useGetMyAccountantProfileQuery } from "src/lib/services/accountantProfileApi";
import { useUpdateCompleteProfileMutation } from "src/lib/services/usersApi";

const ACCEPT_IMAGE = "image/jpeg,image/png,image/webp";

/** Map "1-5 collaborateurs" -> 5, "6-10" -> 10, "+ 10" -> 15 for API */
function collaboratorsCountToNumber(s: string): number | undefined {
  if (!s?.trim()) return undefined;
  if (s.includes("1-5")) return 5;
  if (s.includes("6-10")) return 10;
  if (s.includes("+ 10") || s.includes("+10")) return 15;
  return undefined;
}

export default function AccountantView() {
  const [isEditing, setIsEditing] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [cropType, setCropType] = useState<CropType>("avatar");
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const profileInfosFormRef = useRef<Partial<ProfileInfosFormState>>({});
  const contactFormRef = useRef<Partial<ContactFormState>>({});

  const {
    data,
    isLoading,
    refetch: refetchProfile,
  } = useGetMyAccountantProfileQuery();
  const [updateCompleteProfile, { isLoading: isUpdatingProfile }] =
    useUpdateCompleteProfileMutation();

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
    collaboratorsCount: "",
    experience: data?.company?.experience ?? "",
    description: data?.company?.description ?? "",
    specialties: data?.company?.specialties ?? [],
  };

  const handleProfileInfosChange = useCallback(
    (updates: Partial<ProfileInfosFormState>) => {
      profileInfosFormRef.current = {
        ...profileInfosFormRef.current,
        ...updates,
      };
    },
    [],
  );

  const handleContactChange = useCallback(
    (updates: Partial<ContactFormState>) => {
      contactFormRef.current = { ...contactFormRef.current, ...updates };
    },
    [],
  );

  const handleStartEditing = useCallback(() => {
    profileInfosFormRef.current = {
      cabinetName: data?.company?.name ?? "",
      sector: data?.specialty ?? "",
      collaboratorsCount: "",
      experience: data?.company?.experience ?? "",
      description: data?.company?.description ?? "",
      specialties: data?.company?.specialties ?? [],
    };
    contactFormRef.current = {
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
    setIsEditing(true);
  }, [
    data?.company?.name,
    data?.specialty,
    data?.company?.phone,
    data?.company?.email,
    data?.company?.address,
    data?.company?.postalCode,
    data?.company?.city,
    data?.company?.experience,
    data?.company?.description,
    data?.company?.specialties,
    data?.phone,
    data?.email,
  ]);

  const handleSaveProfile = useCallback(async () => {
    const form = profileInfosFormRef.current;
    const contact = contactFormRef.current;
    const fd = new FormData();
    if (form?.cabinetName !== undefined)
      fd.append("companyName", form.cabinetName);
    if (form?.sector !== undefined) fd.append("companySector", form.sector);
    if (form?.experience !== undefined)
      fd.append("companyExperience", form.experience);
    if (form?.description !== undefined)
      fd.append("companyDescription", form.description);
    if (form?.specialties !== undefined && form.specialties.length > 0)
      fd.append("companySpecialties", form.specialties.join(","));
    const empCount = form?.collaboratorsCount
      ? collaboratorsCountToNumber(form.collaboratorsCount)
      : undefined;
    if (empCount !== undefined)
      fd.append("companyEmployeeCount", String(empCount));
    if (form?.patenteFile) fd.append("companyPatentFile", form.patenteFile);
    if (form?.rneFile) fd.append("companyRneFile", form.rneFile);
    if (contact?.email !== undefined) fd.append("companyEmail", contact.email);
    if (contact?.phone !== undefined) fd.append("companyPhone", contact.phone);
    if (contact?.address !== undefined)
      fd.append("companyAddress", contact.address);
    if (contact?.website !== undefined)
      fd.append("companyWebsite", contact.website);
    try {
      await updateCompleteProfile(fd).unwrap();
      await refetchProfile();
      setIsEditing(false);
    } catch {
      // Error handled by RTK / snackbar if needed
    }
  }, [updateCompleteProfile, refetchProfile]);

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

  const openCropFor = (type: CropType) => {
    if (type === "avatar") avatarInputRef.current?.click();
    else coverInputRef.current?.click();
  };

  const onAvatarFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropFile(file);
      setCropType("avatar");
      setCropModalOpen(true);
    }
    e.target.value = "";
  };

  const onCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCropFile(file);
      setCropType("cover");
      setCropModalOpen(true);
    }
    e.target.value = "";
  };

  const onCropConfirm = async (file: File) => {
    const formData = new FormData();
    if (cropType === "avatar") formData.append("photo", file);
    else formData.append("coverPhoto", file);
    try {
      await updateCompleteProfile(formData).unwrap();
      await refetchProfile();
    } finally {
      setCropModalOpen(false);
      setCropFile(null);
    }
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
        <input
          ref={avatarInputRef}
          type="file"
          accept={ACCEPT_IMAGE}
          style={{ display: "none" }}
          onChange={onAvatarFileChange}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept={ACCEPT_IMAGE}
          style={{ display: "none" }}
          onChange={onCoverFileChange}
        />
        <ProfileHeader
          coverImage={data?.coverPhotoUrl ?? "/assets/cover.png"}
          avatarImage={
            data?.photoUrl ?? data?.photo ?? "/assets/profilePic.png"
          }
          name={name}
          subtitle={subtitle}
          onEditCover={() => openCropFor("cover")}
          onEditAvatar={() => openCropFor("avatar")}
          onEditProfile={handleStartEditing}
        />
        <ImageCropModal
          open={cropModalOpen}
          onClose={() => {
            setCropModalOpen(false);
            setCropFile(null);
          }}
          file={cropFile}
          type={cropType}
          onConfirm={onCropConfirm}
          loading={isUpdatingProfile}
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
            onProfileInfosChange={handleProfileInfosChange}
            accountantId={data?.id}
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
            onContactChange={handleContactChange}
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
            onClick={handleSaveProfile}
            loading={isUpdatingProfile}
            disabled={isUpdatingProfile}
          >
            Enregistrer
          </CustomButton>
        </Box>
      )}
    </PageHeader>
  );
}
