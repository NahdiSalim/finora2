import { useState, useEffect } from "react";
import {
  Box,
  Card,
  Grid,
  Typography,
  useTheme,
  Stack,
  Avatar,
  IconButton,
  alpha,
  Skeleton,
} from "@mui/material";
import { Building2, Camera, Pencil, Save, X } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  type CompanyData,
} from "src/lib/services/companyApi";
import { useAlert } from "src/contexts/AlertContext";

// ─── Section card ─────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Card
      sx={{
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        boxShadow: "none",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          px: { xs: 2, sm: 3 },
          py: 1.5,
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          bgcolor: alpha(theme.palette.background.default, 0.6),
        }}
      >
        <Typography variant="subtitle1" fontWeight={700} fontSize="0.9rem">
          {title}
        </Typography>
      </Box>
      <Box sx={{ px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 2.5 } }}>
        {children}
      </Box>
    </Card>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CompanySettingsView() {
  const theme = useTheme();
  const { showAlert } = useAlert();

  const { data, isLoading } = useGetCompanyQuery();
  const [updateCompany, { isLoading: isSaving }] = useUpdateCompanyMutation();

  const [isEditing, setIsEditing] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    legalName: "",
    vatNumber: "",
    siret: "",
    legalForm: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    country: "",
    website: "",
    description: "",
  });

  const resetForm = (c: CompanyData | undefined) => {
    if (!c) return;
    setForm({
      name: c.name ?? "",
      legalName: c.legalName ?? "",
      vatNumber: c.vatNumber ?? "",
      siret: c.siret ?? "",
      legalForm: c.legalForm ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      postalCode: c.postalCode ?? "",
      country: c.country ?? "",
      website: c.website ?? "",
      description: c.description ?? "",
    });
    setLogoPreview(c.logoUrl ?? null);
    setLogoFile(null);
  };

  useEffect(() => {
    if (data?.data) resetForm(data.data);
  }, [data]);

  const set =
    (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (logoPreview && logoFile) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCancel = () => {
    resetForm(data?.data);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      showAlert("Le nom de la société est obligatoire", "error");
      return;
    }
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v) fd.append(k, v);
      });
      if (logoFile) fd.append("logo", logoFile);
      await updateCompany(fd).unwrap();
      showAlert("Informations mises à jour avec succès", "success");
      setLogoFile(null);
      setIsEditing(false);
    } catch {
      showAlert("Erreur lors de la mise à jour", "error");
    }
  };

  if (isLoading) {
    return (
      <PageHeader
        title="Mon entreprise"
        caption="Paramètres de votre entreprise"
      >
        <Stack spacing={3} sx={{ pt: 2 }}>
          {[160, 280, 240, 120].map((h, i) => (
            <Skeleton
              key={i}
              variant="rounded"
              height={h}
              sx={{ borderRadius: 3 }}
            />
          ))}
        </Stack>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title="Mon entreprise"
      caption="Ces informations apparaissent sur vos factures et devis."
    >
      <Stack spacing={3} sx={{ pt: 2, pb: 4 }}>
        {/* ── Logo & identity ── */}
        <Card
          sx={{
            borderRadius: 3,
            border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            boxShadow: "none",
            p: { xs: 2, sm: 3 },
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              gap: { xs: 2, sm: 3 },
            }}
          >
            {/* Avatar with camera overlay */}
            <Box sx={{ position: "relative", flexShrink: 0 }}>
              <Avatar
                src={logoPreview ?? undefined}
                variant="rounded"
                sx={{
                  width: { xs: 80, sm: 96 },
                  height: { xs: 80, sm: 96 },
                  borderRadius: 3,
                  border: `2px solid ${alpha(theme.palette.divider, 0.5)}`,
                  bgcolor: alpha(theme.palette.primary.main, 0.08),
                }}
              >
                <Building2 size={32} color={theme.palette.primary.main} />
              </Avatar>
              {isEditing && (
                <IconButton
                  size="small"
                  onClick={() =>
                    (
                      document.getElementById("logo-input") as HTMLInputElement
                    )?.click()
                  }
                  sx={{
                    position: "absolute",
                    bottom: -6,
                    right: -6,
                    width: 28,
                    height: 28,
                    bgcolor: "background.paper",
                    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                    boxShadow: theme.shadows[2],
                    "&:hover": {
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                    },
                  }}
                >
                  <Camera size={14} />
                </IconButton>
              )}
              <input
                id="logo-input"
                type="file"
                hidden
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleLogoChange}
              />
            </Box>

            {/* Name + subtitle */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700} noWrap>
                {form.name || "Mon entreprise"}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {logoPreview
                  ? "Logo personnalisé"
                  : "Aucun logo — cliquez sur l'icône pour en ajouter un"}
              </Typography>
            </Box>

            {/* Edit / Save / Cancel */}
            {!isEditing ? (
              <CustomButton
                size="small"
                startIcon={<Pencil size={16} />}
                onClick={() => setIsEditing(true)}
                sx={{
                  flexShrink: 0,
                  alignSelf: { xs: "flex-start", sm: "center" },
                }}
              >
                Modifier
              </CustomButton>
            ) : (
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  flexShrink: 0,
                  alignSelf: { xs: "flex-start", sm: "center" },
                }}
              >
                <CustomButton
                  size="small"
                  variant="text"
                  startIcon={<X size={16} />}
                  onClick={handleCancel}
                  disabled={isSaving}
                >
                  Annuler
                </CustomButton>
                <CustomButton
                  size="small"
                  startIcon={<Save size={16} />}
                  onClick={handleSave}
                  loading={isSaving}
                >
                  Enregistrer
                </CustomButton>
              </Stack>
            )}
          </Box>
        </Card>

        {/* ── Informations générales ── */}
        <Section title="Informations générales">
          <Grid container spacing={{ xs: 2, sm: 2.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Nom de la société"
                value={form.name}
                onChange={set("name")}
                placeholder="Ex: ACME SARL"
                required
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Raison sociale"
                value={form.legalName}
                onChange={set("legalName")}
                placeholder="Ex: ACME Société à Responsabilité Limitée"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Matricule fiscal / N° TVA"
                value={form.vatNumber}
                onChange={set("vatNumber")}
                placeholder="Ex: 1234567/A/M/000"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="SIRET"
                value={form.siret}
                onChange={set("siret")}
                placeholder="Ex: 12345678901234"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Forme juridique"
                value={form.legalForm}
                onChange={set("legalForm")}
                placeholder="Ex: SARL, SA, SAS..."
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
          </Grid>
        </Section>

        {/* ── Coordonnées ── */}
        <Section title="Coordonnées">
          <Grid container spacing={{ xs: 2, sm: 2.5 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder="contact@example.com"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Téléphone"
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+216 71 123 456"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <CustomInput
                label="Adresse"
                value={form.address}
                onChange={set("address")}
                placeholder="123 Avenue Habib Bourguiba"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomInput
                label="Ville"
                value={form.city}
                onChange={set("city")}
                placeholder="Tunis"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomInput
                label="Code postal"
                value={form.postalCode}
                onChange={set("postalCode")}
                placeholder="1000"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <CustomInput
                label="Pays"
                value={form.country}
                onChange={set("country")}
                placeholder="Tunisie"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <CustomInput
                label="Site web"
                type="url"
                value={form.website}
                onChange={set("website")}
                placeholder="https://www.example.com"
                disabled={!isEditing}
                fullWidth
              />
            </Grid>
          </Grid>
        </Section>

        {/* ── Description ── */}
        <Section title="Description">
          <CustomInput
            label="Description de l'entreprise"
            value={form.description}
            onChange={set("description")}
            placeholder="Décrivez votre activité, vos services..."
            disabled={!isEditing}
            multiline
            rows={4}
            fullWidth
          />
        </Section>

        {/* ── Floating save bar (mobile) ── */}
        {isEditing && (
          <Box
            sx={{
              display: { xs: "flex", sm: "none" },
              gap: 1.5,
              position: "sticky",
              bottom: 16,
              bgcolor: "background.paper",
              p: 2,
              borderRadius: 3,
              boxShadow: theme.shadows[8],
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            }}
          >
            <CustomButton
              fullWidth
              variant="outlined"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Annuler
            </CustomButton>
            <CustomButton
              fullWidth
              onClick={handleSave}
              loading={isSaving}
              startIcon={<Save size={16} />}
            >
              Enregistrer
            </CustomButton>
          </Box>
        )}
      </Stack>
    </PageHeader>
  );
}
