import {
  Box,
  Card,
  Dialog,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import type { User } from "src/types/user";
import CustomButton from "src/components/common/CustomButton";
import ClientModal from "src/sections/clients/modal/ClientModal";
import CollaboratorModal from "src/sections/collaborator/modal/collaborator-modal";
import ContactInfos from "src/layouts/components/profile-contact";
import ProfileInfosTab from "src/layouts/components/profile-infos-tab";

type Props = {
  open: boolean;
  user: User | null;
  onClose: () => void;
};

const getRoleCode = (user: User | null): string => {
  if (!user) return "";
  return typeof user.role === "string" ? user.role : (user.role?.code ?? "");
};

const employeeCountToCollaboratorsCount = (
  value: number | string | null | undefined,
): string => {
  if (value == null || value === "") return "";
  const n = typeof value === "string" ? parseInt(value, 10) : value;
  if (Number.isNaN(n)) return "";
  if (n <= 5) return "1-5 collaborateurs";
  if (n <= 10) return "6-10 collaborateurs";
  return "+ 10 collaborateurs";
};

type NamedSector = { name?: string | null };
type CompanyLike = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  siret?: string | null;
  vatNumber?: string | null;
  legalForm?: string | null;
  country?: string | null;
  postalCode?: string | null;
  patentFileUrl?: string | null;
  rneFileUrl?: string | null;
  patenteFileUrl?: string | null;
  patentFile?: string | null;
  patenteFile?: string | null;
  employeeCount?: number | string | null;
  experience?: string | null;
  description?: string | null;
  sector?: string | null;
  specialties?: string[] | null;
  sectors?: NamedSector[] | null;
  phone?: string | null;
  numWhatsapp?: string | null;
  website?: string | null;
  email?: string | null;
};

export default function UserDetailsModal({ open, user, onClose }: Props) {
  const roleCode = getRoleCode(user).toUpperCase();

  if (roleCode === "CLIENT") {
    const safeFullName =
      user?.full_name?.trim() ||
      [user?.client?.gender].filter(Boolean).join(" ").trim() ||
      user?.email?.split("@")[0] ||
      "Client";
    const userRecord = (user as unknown as Record<string, unknown>) ?? {};
    const rawCompany =
      (userRecord.company as CompanyLike | undefined) ??
      (userRecord.organization as CompanyLike | undefined) ??
      ({} as CompanyLike);
    const clientLike = user
      ? {
          id: user.id,
          fullName: safeFullName,
          email: user.email ?? "",
          phone: user.phone ?? "",
          company: {
            name: rawCompany?.name ?? "",
            address: rawCompany?.address ?? "",
            city: rawCompany?.city ?? "",
            siret: rawCompany?.siret ?? "",
            vatNumber: rawCompany?.vatNumber ?? "",
            legalForm: rawCompany?.legalForm ?? "",
            country: rawCompany?.country ?? "",
            postalCode: rawCompany?.postalCode ?? "",
            patentFileUrl:
              rawCompany?.patentFileUrl ?? rawCompany?.patenteFileUrl ?? "",
            patentFile: rawCompany?.patentFile ?? rawCompany?.patenteFile ?? "",
          },
        }
      : null;

    return <ClientModal open={open} onClose={onClose} client={clientLike} />;
  }

  if (roleCode === "COLLABORATOR" || roleCode === "COLLABORATEUR") {
    const names = (user?.full_name ?? "").trim().split(/\s+/);
    const firstName = names[0] ?? "";
    const lastName = names.slice(1).join(" ");
    const userRecord = (user as unknown as Record<string, unknown>) ?? {};
    const position =
      typeof userRecord.position === "string" && userRecord.position.trim()
        ? userRecord.position
        : "-";
    const department =
      typeof userRecord.department === "string" && userRecord.department.trim()
        ? userRecord.department
        : "-";
    const collaboratorLike = user
      ? {
          firstName,
          lastName,
          email: user.email ?? "",
          phone: user.phone ?? "",
          position,
          department,
        }
      : null;

    return (
      <CollaboratorModal
        open={open}
        onClose={onClose}
        collaborator={collaboratorLike}
      />
    );
  }

  if (roleCode === "ACCOUNTANT" || roleCode === "COMPTABLE") {
    const userRecord = (user as unknown as Record<string, unknown>) ?? {};
    const company =
      (userRecord.company as CompanyLike | undefined) ??
      (userRecord.organization as CompanyLike | undefined) ??
      ({} as CompanyLike);
    const companySpecialties: string[] = Array.isArray(company?.specialties)
      ? company.specialties.filter(Boolean)
      : Array.isArray(company?.sectors)
        ? (company.sectors.map((s) => s?.name).filter(Boolean) as string[])
        : [];
    const profileInfosData = {
      cabinetName: company?.name ?? "",
      sector: company?.sector ?? "",
      collaboratorsCount: employeeCountToCollaboratorsCount(
        company?.employeeCount,
      ),
      experience: company?.experience ?? "",
      description: company?.description ?? "",
      specialties: companySpecialties,
      patentFileUrl: company?.patentFileUrl ?? null,
      rneFileUrl: company?.rneFileUrl ?? null,
    };

    const contactData = {
      phone: company?.phone || user?.phone || "",
      email: company?.email || user?.email || "",
      address:
        company?.address ||
        [company?.postalCode, company?.city].filter(Boolean).join(" "),
      whatsapp: company?.numWhatsapp ?? "",
      website: company?.website ?? "",
      specialties: companySpecialties,
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>Détails comptable</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              gap: 1.5,
              mt: 1,
            }}
          >
            <Card sx={{ width: { xs: "100%", md: "70%" }, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Informations du comptable
              </Typography>
              <ProfileInfosTab
                isEditing={false}
                onEdit={() => {}}
                onCancel={() => {}}
                onSave={() => {}}
                data={profileInfosData}
              />
            </Card>
            <Card
              sx={{
                width: { xs: "100%", md: 440 },
                minWidth: { xs: "100%", md: 440 },
                flexShrink: 0,
                p: 2,
              }}
            >
              <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
                Coordonnées
              </Typography>
              <ContactInfos
                data={contactData}
                isLoading={false}
                isEditing={false}
              />
            </Card>
          </Box>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
            <CustomButton variant="contained" onClick={onClose}>
              Fermer
            </CustomButton>
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  const contactData = {
    phone: user?.organization?.phone || user?.phone || "",
    email: user?.organization?.name ? user?.email || "" : user?.email || "",
    address:
      user?.organization?.address ||
      [user?.organization?.city].filter(Boolean).join(" ") ||
      "",
    whatsapp: "",
    website: "",
    specialties: user?.organization?.sectors?.map((s) => s.name) ?? [],
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Détails utilisateur</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "grid", gap: 2, mt: 1 }}>
          <Box>
            <Typography variant="subtitle2">Informations générales</Typography>
            <Typography variant="body2">
              Nom: {user?.full_name || "-"}
            </Typography>
            <Typography variant="body2">Role: {roleCode || "-"}</Typography>
            <Typography variant="body2">Email: {user?.email || "-"}</Typography>
            <Typography variant="body2">
              Téléphone: {user?.phone || "-"}
            </Typography>
          </Box>

          <ContactInfos
            data={contactData}
            isLoading={false}
            isEditing={false}
          />

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <CustomButton variant="contained" onClick={onClose}>
              Fermer
            </CustomButton>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
