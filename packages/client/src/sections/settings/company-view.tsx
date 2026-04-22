import { useState } from "react";
import {
  Box,
  Card,
  Grid,
  Typography,
  useTheme,
  Stack,
  Avatar,
  IconButton,
} from "@mui/material";
import { Pencil, Camera, Building2 } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";

// ─── Types ────────────────────────────────────────────────────────────────────

type CompanyData = {
  logo: File | null;
  logoPreview: string | null;
  companyName: string;
  taxId: string;
  email: string;
  phone: string;
  address: string;
  website: string;
};

const EMPTY: CompanyData = {
  logo: null,
  logoPreview: null,
  companyName: "",
  taxId: "",
  email: "",
  phone: "",
  address: "",
  website: "",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CompanySettingsView() {
  const theme = useTheme();

  // ── Two distinct states ───────────────────────────────────────────────────
  // savedData  = source of truth (last persisted values)
  // formData   = current draft (edited during isEditing = true)
  const [savedData, setSavedData] = useState<CompanyData>({ ...EMPTY });
  const [formData, setFormData] = useState<CompanyData>({ ...EMPTY });
  const [isEditing, setIsEditing] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────────────

  // Modifier — copy savedData into formData, enter edit mode
  const handleStartEditing = () => {
    setFormData({ ...savedData });
    setIsEditing(true);
  };

  // Annuler — discard draft, restore savedData into formData, exit edit mode
  const handleCancel = () => {
    // Revoke any object URL created during this edit session
    if (
      formData.logoPreview &&
      formData.logoPreview !== savedData.logoPreview
    ) {
      URL.revokeObjectURL(formData.logoPreview);
    }
    setFormData({ ...savedData });
    setIsEditing(false);
  };

  // Enregistrer — persist formData into savedData, exit edit mode
  const handleSave = () => {
    if (!formData.companyName.trim()) {
      console.error("Nom de la société est obligatoire");
      return;
    }
    console.log("Saving company settings:", formData);
    setSavedData({ ...formData }); // formData becomes the new source of truth
    setIsEditing(false);
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (formData.logoPreview) URL.revokeObjectURL(formData.logoPreview);
    setFormData((prev) => ({
      ...prev,
      logo: file,
      logoPreview: URL.createObjectURL(file),
    }));
  };

  const handleInputChange = (field: keyof CompanyData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  // ── Display values — formData in edit mode, savedData otherwise ───────────
  const display = isEditing ? formData : savedData;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <PageHeader
      title="Mon entreprise"
      caption="Ces informations apparaissent sur vos factures et devis."
    >
      <Box sx={{ pt: 3, pb: 4 }}>
        <Stack spacing={3}>
          {/* ── Logo Section — pattern ProfileHeader ── */}
          <Card sx={{ p: 3, borderRadius: 2, boxShadow: theme.shadows[1] }}>
            <Box
              sx={{
                display: "flex",
                alignItems: { xs: "flex-start", sm: "center" },
                flexDirection: { xs: "column", sm: "row" },
                gap: { xs: 0, sm: 2 },
              }}
            >
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={display.logoPreview ?? undefined}
                  variant="rounded"
                  sx={{
                    width: { xs: 90, sm: 120 },
                    height: { xs: 90, sm: 120 },
                    borderRadius: 3,
                    border: `4px solid ${theme.palette.background.paper}`,
                    boxShadow: theme.shadows[4],
                    backgroundColor: theme.palette.grey[300],
                  }}
                >
                  <Building2 size={36} />
                </Avatar>

                {isEditing && (
                  <IconButton
                    size="small"
                    onClick={() =>
                      (
                        document.getElementById(
                          "logo-input",
                        ) as HTMLInputElement
                      )?.click()
                    }
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: 8,
                      backgroundColor: theme.palette.background.paper,
                      boxShadow: theme.shadows[2],
                      "&:hover": { backgroundColor: theme.palette.grey[100] },
                    }}
                  >
                    <Camera size={16} />
                  </IconButton>
                )}
              </Box>

              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={600}>
                  {display.companyName || "Mon entreprise"}
                </Typography>
                <Typography
                  variant="body2"
                  color={theme.palette.info.main}
                  sx={{ mt: 0.5 }}
                >
                  {display.logoPreview
                    ? "Logo personnalisé"
                    : "Aucun logo défini"}
                </Typography>
              </Box>

              {!isEditing && (
                <CustomButton
                  size="large"
                  startIcon={<Pencil />}
                  onClick={handleStartEditing}
                  sx={{
                    alignSelf: { xs: "flex-start", sm: "center" },
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                  }}
                >
                  Modifier
                </CustomButton>
              )}

              <input
                id="logo-input"
                type="file"
                hidden
                accept=".jpg,.jpeg,.png,.webp"
                onChange={handleLogoChange}
              />
            </Box>
          </Card>

          {/* ── Informations générales ── */}
          <Card sx={{ p: 3, borderRadius: 2, boxShadow: theme.shadows[1] }}>
            <Typography
              variant="h6"
              sx={{
                mb: 3,
                fontWeight: theme.typography.fontWeightSemiBold,
                color: theme.palette.text.primary,
              }}
            >
              Informations générales
            </Typography>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  label="Nom de la société"
                  value={display.companyName}
                  onChange={(e) =>
                    handleInputChange("companyName", e.target.value)
                  }
                  placeholder="Ex: ACME Corporation"
                  required
                  disabled={!isEditing}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  label="Matricule fiscal"
                  value={display.taxId}
                  onChange={(e) => handleInputChange("taxId", e.target.value)}
                  placeholder="1754321/B/N/000"
                  disabled={!isEditing}
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  label="Email"
                  type="email"
                  value={display.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  placeholder="contact@example.com"
                  disabled={!isEditing}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  label="Téléphone"
                  type="tel"
                  value={display.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  placeholder="+216 71 123 456"
                  disabled={!isEditing}
                  fullWidth
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  label="Adresse"
                  value={display.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  placeholder="123 Avenue Habib Bourguiba"
                  disabled={!isEditing}
                  fullWidth
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  label="Site web"
                  type="url"
                  value={display.website}
                  onChange={(e) => handleInputChange("website", e.target.value)}
                  placeholder="https://www.example.com"
                  disabled={!isEditing}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Card>

          {/* ── Annuler / Enregistrer — visibles uniquement en mode édition ── */}
          {isEditing && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 2,
              }}
            >
              <CustomButton
                variant="outlined"
                color="info"
                onClick={handleCancel}
              >
                Annuler
              </CustomButton>
              <CustomButton
                variant="contained"
                color="primary"
                onClick={handleSave}
              >
                Enregistrer
              </CustomButton>
            </Box>
          )}
        </Stack>
      </Box>
    </PageHeader>
  );
}
