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

/** Map API employeeCount (5|10|15 or string "5"|"10"|"15") to display value for select */
function employeeCountToCollaboratorsCount(
  value: number | string | null | undefined,
): string {
  if (value == null || value === "") return "";
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (Number.isNaN(n)) return "";
  if (n <= 5) return "1-5 collaborateurs";
  if (n <= 10) return "6-10 collaborateurs";
  return "+ 10 collaborateurs";
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

  const profileInfosData = {
    cabinetName: data?.company?.name ?? "",
    sector: data?.company?.sector ?? "",
    collaboratorsCount: employeeCountToCollaboratorsCount(
      data?.company?.employeeCount,
    ),
    experience: data?.company?.experience ?? "",
    description: data?.company?.description ?? "",
    specialties: data?.company?.specialties ?? [],
    patentFileUrl: data?.company?.patentFileUrl ?? null,
    rneFileUrl: data?.company?.rneFileUrl ?? null,
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
      sector: data?.company?.sector ?? "",
      collaboratorsCount: employeeCountToCollaboratorsCount(
        data?.company?.employeeCount,
      ),
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
      whatsapp: data?.company?.numWhatsapp ?? "",
      website: data?.company?.website ?? "",
    };
    setIsEditing(true);
  }, [
    data?.company?.name,
    data?.company?.sector,
    data?.company?.employeeCount,
    data?.company?.phone,
    data?.company?.email,
    data?.company?.address,
    data?.company?.postalCode,
    data?.company?.city,
    data?.company?.experience,
    data?.company?.description,
    data?.company?.specialties,
    data?.company?.numWhatsapp,
    data?.company?.website,
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
    if (contact?.whatsapp !== undefined)
      fd.append("companyNumWhatsapp", contact.whatsapp);
    try {
      await updateCompleteProfile(fd).unwrap();
      await refetchProfile();
      setIsEditing(false);
    } catch {
      // Error handled by RTK / snackbar if needed
    }
  }, [updateCompleteProfile, refetchProfile]);

  // ------------------------------------------------------------------
  // Force du profil = % des champs des onglets "Mes informations" + "Contact".
  // Uniquement les inputs visibles dans le formulaire. Si 100 %, on n’affiche pas le bloc.
  // ------------------------------------------------------------------
  const hasFile = (url: string | null | undefined) =>
    typeof url === "string" && url.trim().length > 0;
  const hasEmployeeCount = (): boolean => {
    const v = data?.company?.employeeCount;
    if (v == null || v === "") return false;
    const n = typeof v === "string" ? parseInt(v, 10) : v;
    return !Number.isNaN(n) && n > 0;
  };
  const profileInputs: (string | boolean)[] = [
    data?.company?.name ?? "",
    data?.company?.sector ?? "",
    Array.isArray(data?.company?.specialties) &&
      (data?.company?.specialties?.length ?? 0) > 0,
    hasEmployeeCount(),
    data?.company?.experience ?? "",
    data?.company?.description ?? "",
    hasFile(data?.company?.patentFileUrl),
    hasFile(data?.company?.rneFileUrl),
    (data?.company?.email || data?.email) ?? "",
    (data?.company?.phone || data?.phone) ?? "",
    data?.company?.numWhatsapp ?? "",
    data?.company?.address ?? "",
    data?.company?.website ?? "",
  ];
  const totalFields = profileInputs.length;
  const filledCount = profileInputs.filter((v) =>
    typeof v === "boolean" ? v : String(v).trim().length > 0,
  ).length;
  const percentage =
    totalFields > 0
      ? Math.min(100, Math.round((filledCount / totalFields) * 100))
      : 0;
  const totalSteps = 10;
  const completedSteps =
    percentage <= 0
      ? 0
      : Math.min(totalSteps, Math.ceil((percentage / 100) * totalSteps));

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
          isEditing={isEditing}
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
      {percentage < 100 && (
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
      )}

      <Box
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
            width: { xs: "100%", md: "70%" },
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
