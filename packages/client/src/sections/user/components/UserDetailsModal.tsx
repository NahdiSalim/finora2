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

export default function UserDetailsModal({ open, user, onClose }: Props) {
  const roleCode = getRoleCode(user).toUpperCase();

  if (roleCode === "CLIENT") {
    const safeFullName =
      user?.full_name?.trim() ||
      [user?.client?.gender].filter(Boolean).join(" ").trim() ||
      user?.email?.split("@")[0] ||
      "Client";
    const rawCompany: any =
      (user as any)?.company ?? (user as any)?.organization ?? {};
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
    const collaboratorLike = user
      ? {
          firstName,
          lastName,
          email: user.email ?? "",
          phone: user.phone ?? "",
          position: "-",
          department: "-",
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
    const company: any =
      (user as any)?.company ?? (user as any)?.organization ?? {};
    const profileInfosData = {
      cabinetName: company?.name ?? "",
      sector:
        Array.isArray(company?.sectors) && company.sectors.length > 0
          ? (company.sectors[0]?.name ?? "")
          : "",
      collaboratorsCount:
        company?.employeeCount != null ? String(company.employeeCount) : "",
      experience: company?.experience ?? "",
      description: company?.description ?? "",
      specialties: Array.isArray(company?.sectors)
        ? company.sectors.map((s: any) => s?.name).filter(Boolean)
        : [],
      patentFileUrl: company?.patentFileUrl ?? null,
      rneFileUrl: company?.rneFileUrl ?? null,
    };

    const contactData = {
      phone: company?.phone || user?.phone || "",
      email: user?.email || "",
      address:
        company?.address ||
        [company?.postalCode, company?.city].filter(Boolean).join(" "),
      whatsapp: company?.numWhatsapp ?? "",
      website: company?.website ?? "",
      specialties: Array.isArray(company?.sectors)
        ? company.sectors.map((s: any) => s?.name).filter(Boolean)
        : [],
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
