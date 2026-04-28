import { useState, useEffect } from "react";
import {
  Box,
  Card,
  Chip,
  Grid,
  Typography,
  useTheme,
  Stack,
  Avatar,
  IconButton,
  alpha,
  Skeleton,
} from "@mui/material";
import { Building2, Camera, Check, Pencil, Save, X } from "lucide-react";
import { PageHeader } from "src/layouts/components/page-header";
import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import {
  useGetCompanyQuery,
  useUpdateCompanyMutation,
  type CompanyData,
} from "src/lib/services/companyApi";
import { useAlert } from "src/contexts/AlertContext";
import { type InvoiceTemplateId } from "src/types/invoice-templates";

// ─── Invoice template types ───────────────────────────────────────────────────

interface TemplateOption {
  id: InvoiceTemplateId;
  name: string;
  description: string;
  isDefault: boolean;
}

const INVOICE_TEMPLATES: TemplateOption[] = [
  {
    id: "classic",
    name: "Classique",
    description: "Sobre, professionnel, intemporel.",
    isDefault: true,
  },
  {
    id: "modern",
    name: "Moderne",
    description: "Design épuré avec accent coloré.",
    isDefault: false,
  },
  {
    id: "elegant",
    name: "Élégante",
    description: "Aérée, typographie fine, haut de gamme.",
    isDefault: false,
  },
  {
    id: "compact",
    name: "Compacte",
    description: "Dense, optimisée pour les longues factures.",
    isDefault: false,
  },
];

// ─── SVG mini-previews ────────────────────────────────────────────────────────
// Principe : blocs + lignes uniquement, quasi zéro texte, identité immédiate.
// Seul "FACTURE" est rendu en texte réel pour la reconnaissance visuelle.

function ClassicPreview() {
  // Sobre, structuré, noir/blanc. 4 lignes de tableau.
  return (
    <svg viewBox="0 0 140 175" width="100%">
      <rect width="140" height="175" fill="#ffffff" />

      {/* Logo carré + FACTURE */}
      <rect x="10" y="11" width="16" height="16" rx="2" fill="#111827" />
      <text
        x="18"
        y="22.5"
        fontFamily="Arial, sans-serif"
        fontSize="8"
        fontWeight="bold"
        fill="#ffffff"
        textAnchor="middle"
      >
        A
      </text>
      <text
        x="130"
        y="23"
        fontFamily="Arial, sans-serif"
        fontSize="13"
        fontWeight="900"
        fill="#111827"
        textAnchor="end"
      >
        FACTURE
      </text>

      {/* Trait épais */}
      <rect x="10" y="33" width="120" height="1.5" fill="#111827" />

      {/* Zone adresses */}
      <rect x="10" y="40" width="50" height="4" rx="1" fill="#d1d5db" />
      <rect x="10" y="46" width="38" height="3" rx="1" fill="#e9ecef" />
      <rect x="10" y="51" width="44" height="3" rx="1" fill="#e9ecef" />
      <rect x="80" y="40" width="50" height="4" rx="1" fill="#d1d5db" />
      <rect x="80" y="46" width="40" height="3" rx="1" fill="#e9ecef" />
      <rect x="80" y="51" width="34" height="3" rx="1" fill="#e9ecef" />

      {/* En-tête tableau sombre */}
      <rect x="10" y="62" width="120" height="9" fill="#111827" />

      {/* 4 lignes alternées */}
      <rect x="10" y="71" width="120" height="8" fill="#f9fafb" />
      <rect x="14" y="73.5" width="54" height="3" rx="0.5" fill="#d1d5db" />
      <rect x="118" y="73.5" width="10" height="3" rx="0.5" fill="#d1d5db" />

      <rect x="10" y="79" width="120" height="8" fill="#ffffff" />
      <rect x="14" y="81.5" width="44" height="3" rx="0.5" fill="#e5e7eb" />
      <rect x="118" y="81.5" width="10" height="3" rx="0.5" fill="#e5e7eb" />

      <rect x="10" y="87" width="120" height="8" fill="#f9fafb" />
      <rect x="14" y="89.5" width="58" height="3" rx="0.5" fill="#d1d5db" />
      <rect x="118" y="89.5" width="10" height="3" rx="0.5" fill="#d1d5db" />

      <rect x="10" y="95" width="120" height="8" fill="#ffffff" />
      <rect x="14" y="97.5" width="48" height="3" rx="0.5" fill="#e5e7eb" />
      <rect x="118" y="97.5" width="10" height="3" rx="0.5" fill="#e5e7eb" />

      {/* Séparateur totaux */}
      <rect x="10" y="107" width="120" height="1" fill="#111827" />

      {/* Sous-totaux */}
      <rect x="80" y="113" width="50" height="3" rx="0.5" fill="#e9ecef" />
      <rect x="80" y="119" width="50" height="3" rx="0.5" fill="#e9ecef" />

      {/* Boîte total sombre */}
      <rect x="80" y="126" width="50" height="13" rx="2" fill="#111827" />
    </svg>
  );
}

function ModernPreview() {
  // Indigo SaaS — bandeau header + meta band + barre latérale gauche + pill total.
  return (
    <svg viewBox="0 0 140 175" width="100%">
      <rect width="140" height="175" fill="#f5f3ff" />

      {/* Header indigo */}
      <rect width="140" height="32" fill="#4f46e5" />
      <rect
        x="9"
        y="8"
        width="14"
        height="14"
        rx="3"
        fill="rgba(255,255,255,0.2)"
      />
      <text
        x="130"
        y="22"
        fontFamily="Arial, sans-serif"
        fontSize="12"
        fontWeight="900"
        fill="#ffffff"
        textAnchor="end"
      >
        FACTURE
      </text>

      {/* Meta band sous le header */}
      <rect width="140" height="11" y="32" fill="#3730a3" />
      <rect
        x="9"
        y="35"
        width="32"
        height="2.5"
        rx="1"
        fill="rgba(255,255,255,0.2)"
      />
      <rect
        x="105"
        y="35"
        width="26"
        height="2.5"
        rx="1"
        fill="rgba(255,255,255,0.2)"
      />

      {/* Barre latérale gauche signature */}
      <rect x="0" y="43" width="3" height="132" fill="#818cf8" />

      {/* Zone adresses */}
      <rect x="9" y="49" width="50" height="3.5" rx="0.8" fill="#c7d2fe" />
      <rect x="9" y="54.5" width="36" height="2.5" rx="0.8" fill="#e0e7ff" />
      <rect x="9" y="58.5" width="44" height="2.5" rx="0.8" fill="#e0e7ff" />
      <rect x="78" y="49" width="52" height="3.5" rx="0.8" fill="#c7d2fe" />
      <rect x="78" y="54.5" width="40" height="2.5" rx="0.8" fill="#e0e7ff" />
      <rect x="78" y="58.5" width="32" height="2.5" rx="0.8" fill="#e0e7ff" />

      {/* En-tête tableau indigo arrondi */}
      <rect x="6" y="67" width="128" height="9" rx="1.5" fill="#4f46e5" />

      {/* 4 lignes teintées */}
      <rect x="6" y="76" width="128" height="8" fill="#eef2ff" />
      <rect x="10" y="78.5" width="52" height="2.5" rx="0.5" fill="#a5b4fc" />
      <rect x="121" y="78.5" width="11" height="2.5" rx="0.5" fill="#a5b4fc" />

      <rect x="6" y="84" width="128" height="8" fill="#ffffff" />
      <rect x="10" y="86.5" width="42" height="2.5" rx="0.5" fill="#c7d2fe" />
      <rect x="121" y="86.5" width="11" height="2.5" rx="0.5" fill="#c7d2fe" />

      <rect x="6" y="92" width="128" height="8" fill="#eef2ff" />
      <rect x="10" y="94.5" width="56" height="2.5" rx="0.5" fill="#a5b4fc" />
      <rect x="121" y="94.5" width="11" height="2.5" rx="0.5" fill="#a5b4fc" />

      <rect x="6" y="100" width="128" height="8" fill="#ffffff" />
      <rect x="10" y="102.5" width="46" height="2.5" rx="0.5" fill="#c7d2fe" />
      <rect x="121" y="102.5" width="11" height="2.5" rx="0.5" fill="#c7d2fe" />

      {/* Séparateur indigo */}
      <rect x="6" y="111" width="128" height="1" fill="#6366f1" />

      {/* Sous-totaux */}
      <rect x="83" y="117" width="51" height="2.5" rx="0.5" fill="#e0e7ff" />
      <rect x="83" y="122" width="51" height="2.5" rx="0.5" fill="#e0e7ff" />

      {/* Total pill indigo */}
      <rect x="83" y="129" width="51" height="14" rx="7" fill="#4f46e5" />
    </svg>
  );
}

function ElegantPreview() {
  // Palette crème dorée — titre centré, lignes fines, total typographique sans boîte.
  // Layout complètement différent de Classique.
  return (
    <svg viewBox="0 0 140 175" width="100%">
      {/* Fond crème chaud */}
      <rect width="140" height="175" fill="#fdf8f0" />

      {/* Bande dorée fine en haut */}
      <rect width="140" height="3" fill="#c9a96e" />

      {/* Titre FACTURE centré — grand, serif */}
      <text
        x="70"
        y="24"
        fontFamily="Georgia, 'Times New Roman', serif"
        fontSize="13"
        fontWeight="bold"
        fill="#1c1008"
        textAnchor="middle"
        letterSpacing="3"
      >
        FACTURE
      </text>

      {/* Ligne décorative dorée sous le titre */}
      <rect x="35" y="29" width="70" height="0.7" fill="#c9a96e" />

      {/* Zone entreprise gauche */}
      <rect x="10" y="38" width="42" height="3.5" rx="1" fill="#e8dcc8" />
      <rect x="10" y="43.5" width="32" height="2.5" rx="1" fill="#ede5d8" />
      <rect x="10" y="47.5" width="36" height="2.5" rx="1" fill="#ede5d8" />

      {/* Zone destinataire droite */}
      <rect x="85" y="38" width="45" height="3.5" rx="1" fill="#e8dcc8" />
      <rect x="85" y="43.5" width="35" height="2.5" rx="1" fill="#ede5d8" />
      <rect x="85" y="47.5" width="38" height="2.5" rx="1" fill="#ede5d8" />

      {/* Ligne dorée avant tableau */}
      <rect x="10" y="58" width="120" height="0.7" fill="#c9a96e" />

      {/* En-tête tableau léger doré */}
      <rect x="10" y="61" width="120" height="8" fill="#f5ede0" />

      {/* Ligne 1 — hauteur généreuse */}
      <rect x="10" y="69" width="120" height="11" fill="#fdf8f0" />
      <rect x="14" y="73" width="52" height="2.5" rx="0.5" fill="#d4bfa0" />
      <rect x="119" y="73" width="9" height="2.5" rx="0.5" fill="#d4bfa0" />
      <rect x="10" y="80" width="120" height="0.5" fill="#e8dcc8" />

      {/* Ligne 2 */}
      <rect x="10" y="80.5" width="120" height="11" fill="#fdf8f0" />
      <rect x="14" y="84.5" width="44" height="2.5" rx="0.5" fill="#d4bfa0" />
      <rect x="119" y="84.5" width="9" height="2.5" rx="0.5" fill="#d4bfa0" />
      <rect x="10" y="91.5" width="120" height="0.5" fill="#e8dcc8" />

      {/* Ligne 3 */}
      <rect x="10" y="92" width="120" height="11" fill="#fdf8f0" />
      <rect x="14" y="96" width="56" height="2.5" rx="0.5" fill="#d4bfa0" />
      <rect x="119" y="96" width="9" height="2.5" rx="0.5" fill="#d4bfa0" />

      {/* Ligne dorée avant totaux */}
      <rect x="10" y="107" width="120" height="0.7" fill="#c9a96e" />

      {/* Sous-totaux */}
      <rect x="83" y="113" width="47" height="2.5" rx="0.5" fill="#e8dcc8" />
      <rect x="83" y="118" width="47" height="2.5" rx="0.5" fill="#e8dcc8" />

      {/* Total — trait doré + bloc doré (sans boîte rectangulaire) */}
      <rect x="83" y="125" width="47" height="0.8" fill="#c9a96e" />
      <rect x="83" y="128.5" width="47" height="7" rx="1" fill="#c9a96e" />
    </svg>
  );
}

function CompactPreview() {
  // Dark navy + teal — header sombre, 4 colonnes visibles, 7 lignes denses, bande total verte.
  // Layout data-heavy, complètement différent des autres templates.
  const rows: [number, number, number][] = [
    [50, 18, 20],
    [42, 22, 18],
    [56, 16, 22],
    [38, 20, 16],
    [48, 18, 20],
    [44, 22, 18],
    [52, 16, 22],
  ];
  return (
    <svg viewBox="0 0 140 175" width="100%">
      <rect width="140" height="175" fill="#f1f5f9" />

      {/* Header sombre navy */}
      <rect width="140" height="36" fill="#1e293b" />
      <rect x="9" y="10" width="12" height="12" rx="2" fill="#334155" />
      <text
        x="130"
        y="22"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fontWeight="900"
        fill="#e2e8f0"
        textAnchor="end"
      >
        FACTURE
      </text>
      <rect x="9" y="28" width="38" height="3" rx="1" fill="#334155" />
      <rect x="100" y="28" width="31" height="3" rx="1.5" fill="#0f172a" />

      {/* Sous-header méta 4 blocs */}
      <rect width="140" height="14" y="36" fill="#0f172a" />
      <rect x="4" y="39.5" width="28" height="3" rx="0.8" fill="#1e293b" />
      <rect x="37" y="39.5" width="28" height="3" rx="0.8" fill="#1e293b" />
      <rect x="70" y="39.5" width="28" height="3" rx="0.8" fill="#1e293b" />
      <rect x="103" y="39.5" width="33" height="3" rx="0.8" fill="#1e293b" />

      {/* En-tête tableau 4 colonnes */}
      <rect x="0" y="50" width="140" height="8" fill="#334155" />
      <rect x="4" y="52.5" width="48" height="2.5" rx="0.5" fill="#64748b" />
      <rect x="56" y="52.5" width="18" height="2.5" rx="0.5" fill="#64748b" />
      <rect x="79" y="52.5" width="18" height="2.5" rx="0.5" fill="#64748b" />
      <rect x="102" y="52.5" width="34" height="2.5" rx="0.5" fill="#64748b" />

      {/* 7 lignes denses */}
      {rows.map(([w1, w2, w3], i) => {
        const y = 58 + i * 7;
        return (
          <g key={i}>
            <rect
              x="0"
              y={y}
              width="140"
              height="7"
              fill={i % 2 === 0 ? "#f8fafc" : "#ffffff"}
            />
            <rect
              x="4"
              y={y + 2}
              width={w1}
              height="2.5"
              rx="0.5"
              fill="#cbd5e1"
            />
            <rect
              x="56"
              y={y + 2}
              width={w2}
              height="2.5"
              rx="0.5"
              fill="#94a3b8"
            />
            <rect
              x="79"
              y={y + 2}
              width={w3}
              height="2.5"
              rx="0.5"
              fill="#94a3b8"
            />
            <rect
              x="112"
              y={y + 2}
              width="24"
              height="2.5"
              rx="0.5"
              fill="#64748b"
            />
          </g>
        );
      })}

      {/* Bande total teal */}
      <rect width="140" height="18" y="107" fill="#0f766e" />
      <rect
        x="9"
        y="112"
        width="35"
        height="3"
        rx="1"
        fill="rgba(255,255,255,0.25)"
      />
      <rect
        x="96"
        y="110"
        width="35"
        height="7"
        rx="1.5"
        fill="rgba(255,255,255,0.3)"
      />

      {/* Footer */}
      <rect x="4" y="131" width="65" height="2.5" rx="0.5" fill="#cbd5e1" />
      <rect x="4" y="136" width="50" height="2.5" rx="0.5" fill="#e2e8f0" />
      <rect x="4" y="141" width="55" height="2.5" rx="0.5" fill="#e2e8f0" />
    </svg>
  );
}

const TEMPLATE_PREVIEWS: Record<InvoiceTemplateId, React.FC> = {
  classic: ClassicPreview,
  modern: ModernPreview,
  elegant: ElegantPreview,
  compact: CompactPreview,
};

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
    invoiceTemplate: "classic",
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
      invoiceTemplate: c.invoiceTemplate ?? "classic",
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

  const handleTemplateSelect = (id: InvoiceTemplateId) => {
    if (!isEditing) return;
    setForm((p) => ({ ...p, invoiceTemplate: id }));
  };

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
          {[160, 280, 240, 120, 200].map((h, i) => (
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

        {/* ── Templates de facture ── */}
        <Section title="Templates de facture">
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mb: 2.5, mt: -0.5, fontSize: "0.82rem" }}
          >
            Choisissez la mise en page utilisée pour vos factures et documents.
          </Typography>
          <Grid container spacing={1.5}>
            {INVOICE_TEMPLATES.map((tpl) => {
              const PreviewComponent = TEMPLATE_PREVIEWS[tpl.id];
              const isSelected = form.invoiceTemplate === tpl.id;
              return (
                <Grid size={{ xs: 6, sm: 3 }} key={tpl.id}>
                  <Box
                    onClick={() => handleTemplateSelect(tpl.id)}
                    sx={{
                      borderRadius: 2,
                      border: `1.5px solid ${
                        isSelected
                          ? theme.palette.primary.main
                          : alpha(theme.palette.divider, 0.8)
                      }`,
                      bgcolor: isSelected
                        ? alpha(theme.palette.primary.main, 0.03)
                        : "background.paper",
                      overflow: "hidden",
                      cursor: isEditing ? "pointer" : "default",
                      transition:
                        "border-color 0.15s ease, box-shadow 0.15s ease",
                      position: "relative",
                      ...(isEditing && {
                        "&:hover": {
                          borderColor: isSelected
                            ? theme.palette.primary.main
                            : alpha(theme.palette.primary.main, 0.45),
                          boxShadow: isSelected
                            ? `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`
                            : theme.shadows[2],
                        },
                      }),
                    }}
                  >
                    {/* Selected checkmark */}
                    {isSelected && (
                      <Box
                        sx={{
                          position: "absolute",
                          top: 7,
                          right: 7,
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          bgcolor: "primary.main",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          zIndex: 1,
                          boxShadow: `0 1px 4px ${alpha(theme.palette.primary.main, 0.4)}`,
                        }}
                      >
                        <Check size={10} color="white" strokeWidth={3} />
                      </Box>
                    )}

                    {/* Preview */}
                    <Box
                      sx={{
                        px: 1,
                        pt: 1,
                        pb: 0.75,
                        lineHeight: 0,
                        bgcolor: alpha(theme.palette.grey[50], 0.8),
                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                      }}
                    >
                      <PreviewComponent />
                    </Box>

                    {/* Footer */}
                    <Box sx={{ px: 1.5, py: 1.25 }}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        flexWrap="wrap"
                        gap={0.5}
                        sx={{ mb: 0.35 }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight={700}
                          fontSize="0.78rem"
                          lineHeight={1}
                        >
                          {tpl.name}
                        </Typography>
                        {tpl.isDefault && (
                          <Chip
                            label="Défaut"
                            size="small"
                            sx={{
                              height: 15,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              bgcolor: alpha(theme.palette.success.main, 0.1),
                              color: "success.dark",
                              borderRadius: 0.75,
                              "& .MuiChip-label": { px: 0.6 },
                            }}
                          />
                        )}
                      </Stack>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.69rem", lineHeight: 1.4 }}
                      >
                        {tpl.description}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>
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
