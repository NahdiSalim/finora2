import {
  Box,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
  useTheme,
} from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";

import { MainSection } from "src/layouts/core/main-section";
import {
  AccountantCard,
  type Accountant,
} from "src/components/visitor/AccountantCard";
import { ContactAccountantModal } from "src/components/visitor/ContactAccountantModal";
import { PageHeader } from "src/layouts/components/page-header";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import CustomInput from "src/components/common/CustomInput";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import { useGetPublicAccountantsQuery } from "src/lib/services/publicAccountantsApi";
import { useVerifyUserQuery } from "src/lib/services/authApi";
import { useSendRelationshipInvitationMutation } from "src/lib/services/relationshipsApi";
import {
  ALL_SPECIALTIES_FOR_FILTER,
  RATING_FILTER_OPTIONS,
} from "src/lib/constants/specialties";
import { Search } from "lucide-react";
import { useAlert } from "src/contexts/AlertContext";

export default function NetworkView() {
  const theme = useTheme();
  const dashboardBase = useDashboardBase();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [specialty, setSpecialty] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [ratingRange, setRatingRange] = useState<string | undefined>(undefined);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactAccountantId, setContactAccountantId] = useState<number | null>(
    null,
  );
  const { showAlert } = useAlert();
  const { data: me } = useVerifyUserQuery();
  const [sendRelationshipInvitation] = useSendRelationshipInvitationMutation();

  const ratingOption = RATING_FILTER_OPTIONS.find(
    (o) => o.value === ratingRange,
  );
  const reviewMin =
    ratingOption && "min" in ratingOption ? ratingOption.min : undefined;
  const reviewMax =
    ratingOption && "max" in ratingOption ? ratingOption.max : undefined;

  const { data, isLoading } = useGetPublicAccountantsQuery({
    page: 1,
    limit: 8,
    search,
    specialty,
    location,
    reviewMin,
    reviewMax,
  });

  const accountants: Accountant[] =
    data?.data.map((item) => {
      const companyName = item.company?.name || "Cabinet";
      const initials =
        companyName
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "C";

      return {
        name: companyName,
        initials,
        avatarColor: theme.palette.primary.main,
        yearsExperience: 0,
        experienceLabel: item.company?.experience ?? undefined,
        location:
          [item.company?.city, item.company?.address]
            .filter(Boolean)
            .join(", ") || "",
        rating: item.company?.rating ?? 0,
        reviews: item.company?.numberOfReviews ?? 0,
        tags: item.company?.specialties ?? [],
        profilePhotoUrl: item.photoUrl ?? item.photo ?? undefined,
        title: item.specialty || "Expert comptable",
        description: item.company?.description ?? item.company?.address ?? "",
        featured: false,
        accountantId: item.id,
        companyId: item.company?.id,
      } as Accountant;
    }) ?? [];

  const roleCode =
    typeof me?.role === "string"
      ? me.role.toUpperCase()
      : (me?.role?.code ?? "").toUpperCase();
  const isClient = roleCode === "CLIENT";

  const handleSearch = () => {
    const next = searchDraft.trim();
    setSearch(next || undefined);
  };

  const handleResetFilters = () => {
    setSearch(undefined);
    setSearchDraft("");
    setSpecialty(undefined);
    setLocation(undefined);
    setRatingRange(undefined);
  };

  return (
    <PageHeader
      title="Réseautage"
      caption="Trouvez et connectez-vous avec des comptables qualifiés en quelques clics."
    >
      <MainSection>
        {/* Search Banner */}
        <Box
          sx={(t) => ({
            mb: 3,
            borderRadius: 3,
            p: { xs: 2.5, md: 3 },
            bgcolor: "#E4E7FB",
            background: "url('/assets/filterBarBG.svg') center/cover no-repeat",
            border: `1px solid ${t.palette.divider}`,
          })}
        >
          <Typography variant="h6" fontWeight={600} sx={{ mb: 2 }}>
            Trouvez votre comptable
          </Typography>

          <Stack spacing={2}>
            {/* Search input */}
            <Stack spacing={1.5}>
              <CustomInput
                fullWidth
                placeholder="Rechercher ..."
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <Box
                          component="span"
                          sx={{ mr: 1, display: "inline-flex" }}
                        >
                          <Search size={20} />
                        </Box>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment
                        position="end"
                        sx={{ display: { xs: "none", md: "flex" } }}
                      >
                        <CustomButton
                          variant="contained"
                          onClick={handleSearch}
                        >
                          Chercher
                        </CustomButton>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                    backgroundColor: "common.white",
                  },
                }}
              />

              {/* Mobile search button */}
              <Box sx={{ display: { xs: "block", md: "none" } }}>
                <CustomButton
                  fullWidth
                  variant="contained"
                  onClick={handleSearch}
                >
                  Chercher
                </CustomButton>
              </Box>
            </Stack>

            {/* Filters */}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <Box sx={{ flex: 1 }}>
                <CustomSelect
                  value={specialty ?? ""}
                  onChange={(e) =>
                    setSpecialty((e.target.value as string) || undefined)
                  }
                  size="small"
                  IconComponent={KeyboardArrowDownIcon}
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">Spécialité</MenuItem>
                  {ALL_SPECIALTIES_FOR_FILTER.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Box>

              <Box sx={{ flex: 1 }}>
                <CustomSelect
                  value={location ?? ""}
                  onChange={(e) =>
                    setLocation((e.target.value as string) || undefined)
                  }
                  size="small"
                  IconComponent={KeyboardArrowDownIcon}
                  displayEmpty
                  fullWidth
                >
                  <MenuItem value="">Adresse / Ville</MenuItem>
                  <MenuItem value="Tunis">Tunis</MenuItem>
                  <MenuItem value="Ariana">Ariana</MenuItem>
                  <MenuItem value="Sousse">Sousse</MenuItem>
                </CustomSelect>
              </Box>

              <Box sx={{ flex: 1 }}>
                <CustomSelect
                  value={ratingRange ?? ""}
                  onChange={(e) =>
                    setRatingRange((e.target.value as string) || undefined)
                  }
                  size="small"
                  IconComponent={KeyboardArrowDownIcon}
                  displayEmpty
                  fullWidth
                >
                  {RATING_FILTER_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value || "note"} value={opt.value}>
                      {opt.label}
                    </MenuItem>
                  ))}
                </CustomSelect>
              </Box>
            </Stack>
          </Stack>
        </Box>

        {/* Results */}
        {!isLoading && accountants.length > 0 && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(2, 1fr)",
                md: "repeat(3, 1fr)",
                lg: "repeat(4, 1fr)",
              },
              gap: 2.5,
            }}
          >
            {accountants.map((accountant) => (
              <AccountantCard
                key={accountant.accountantId}
                data={accountant}
                getProfilePath={(id) =>
                  `${dashboardBase}/network/accountant/${id}`
                }
                scheduleButtonLabel={isClient ? "Inviter" : "Planifier"}
                onScheduleClick={
                  isClient && accountant.companyId
                    ? async () => {
                        try {
                          await sendRelationshipInvitation({
                            targetCompanyId: accountant.companyId!,
                          }).unwrap();
                          showAlert("Invitation envoyée", "success");
                        } catch {
                          showAlert(
                            "Erreur lors de l'envoi de l'invitation",
                            "error",
                          );
                        }
                      }
                    : undefined
                }
                onMessageClick={(id) => {
                  setContactAccountantId(id);
                  setContactModalOpen(true);
                }}
              />
            ))}
          </Box>
        )}

        {/* Empty state */}
        {!isLoading && accountants.length === 0 && (
          <Box
            sx={(t) => ({
              mt: 6,
              p: 6,
              textAlign: "center",
              borderRadius: 3,
              bgcolor: t.palette.common.white,
              border: `1px dashed ${t.palette.divider}`,
            })}
          >
            <Typography variant="h6" fontWeight={600} sx={{ mb: 1 }}>
              Aucun résultat trouvé
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Aucun comptable ne correspond à vos critères actuels.
            </Typography>
            <CustomButton variant="outlined" onClick={handleResetFilters}>
              Réinitialiser les filtres
            </CustomButton>
          </Box>
        )}
      </MainSection>

      <ContactAccountantModal
        open={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setContactAccountantId(null);
        }}
        accountantId={contactAccountantId}
      />
    </PageHeader>
  );
}
