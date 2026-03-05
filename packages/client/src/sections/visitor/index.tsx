import {
  Box,
  Container,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";

import { MainSection } from "src/layouts/core/main-section";
import { PublicNavbar } from "src/components/visitor/PublicNavbar";
import {
  AccountantCard,
  type Accountant,
} from "src/components/visitor/AccountantCard";
import { ContactAccountantModal } from "src/components/visitor/ContactAccountantModal";
import { PageHeader } from "src/layouts/components/page-header";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import CustomInput from "src/components/common/CustomInput";
import { useGetPublicAccountantsQuery } from "src/lib/services/publicAccountantsApi";

export function VisitorView() {
  const theme = useTheme();
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [specialty, setSpecialty] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactAccountantId, setContactAccountantId] = useState<number | null>(
    null,
  );

  const { data, isLoading } = useGetPublicAccountantsQuery({
    page: 1,
    limit: 8,
    search,
    specialty,
    location,
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
      } as Accountant;
    }) ?? [];

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden", // stop full page scroll
      }}
    >
      {/* Navbar 10% */}
      <Box
        sx={{
          height: "10vh",
          flexShrink: 0,
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <PublicNavbar />
      </Box>

      {/* Content 90% with scroll */}
      <MainSection
        sx={{
          height: "90vh",
          overflowY: "auto", // scroll only here
          pb: { xs: 6, md: 8 },
          pt: 1.5,

          backgroundColor: theme.palette.grey[50],
        }}
      >
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 3, md: 2 },
            maxWidth: "1440px",
            mx: "auto",
          }}
        >
          {/* Header */}
          <PageHeader
            title="Networking"
            caption="Trouvez et connectez-vous avec des comptables qualifiés en quelques clics."
            sx={{ mb: 3 }}
          />

          {/* Search Banner */}
          <Box
            sx={(theme2) => ({
              mb: 4,
              borderRadius: 3,
              p: { xs: 2.5, md: 3 },
              bgcolor: "#E4E7FB",
              background:
                "url('/assets/filterBarBG.svg') center/cover no-repeat",
              border: `1px solid ${theme2.palette.divider}`,
            })}
          >
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Trouvez votre comptable
              </Typography>
            </Box>
            <Stack spacing={2}>
              <Stack spacing={1.5}>
                <CustomInput
                  fullWidth
                  placeholder="Search for accountants ..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = searchDraft.trim();
                      setSearch(next || undefined);
                    }
                  }}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ mr: 1, color: "#9CA3AF" }} />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment
                          position="end"
                          sx={{ display: { xs: "none", md: "flex" } }}
                        >
                          <CustomButton
                            variant="contained"
                            onClick={() => {
                              const next = searchDraft.trim();
                              setSearch(next || undefined);
                            }}
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

                {/* 👇 Mobile only full width button */}
                <Box sx={{ display: { xs: "block", md: "none" } }}>
                  <CustomButton
                    fullWidth
                    variant="contained"
                    onClick={() => {
                      const next = searchDraft.trim();
                      setSearch(next || undefined);
                    }}
                  >
                    Chercher
                  </CustomButton>
                </Box>
              </Stack>

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
                  >
                    <MenuItem value="">Spécialité</MenuItem>
                    <MenuItem value="Expert Comptable">
                      Expert Comptable
                    </MenuItem>
                    <MenuItem value="Comptable">Comptable</MenuItem>
                    <MenuItem value="Fiscaliste">Fiscaliste</MenuItem>
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
                  >
                    <MenuItem value="">Adresse / Ville</MenuItem>
                    <MenuItem value="Tunis">Tunis</MenuItem>
                    <MenuItem value="Ariana">Ariana</MenuItem>
                    <MenuItem value="Sousse">Sousse</MenuItem>
                  </CustomSelect>
                </Box>
              </Stack>
            </Stack>
          </Box>

          {/* Results */}
          {!isLoading && accountants.length > 0 ? (
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
                  key={accountant.name + accountant.location}
                  data={accountant}
                  onMessageClick={(id) => {
                    setContactAccountantId(id);
                    setContactModalOpen(true);
                  }}
                />
              ))}
            </Box>
          ) : !isLoading ? (
            <Box
              sx={(theme3) => ({
                mt: 6,
                p: 6,
                textAlign: "center",
                borderRadius: 3,
                bgcolor: theme3.palette.common.white,
                border: `1px dashed ${theme3.palette.divider}`,
              })}
            >
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                Aucun résultat trouvé
              </Typography>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Aucun comptable ne correspond à vos critères actuels.
              </Typography>

              <CustomButton
                variant="outlined"
                onClick={() => {
                  setSearch(undefined);
                  setSearchDraft("");
                  setSpecialty(undefined);
                  setLocation(undefined);
                }}
              >
                Réinitialiser les filtres
              </CustomButton>
            </Box>
          ) : null}
        </Container>
      </MainSection>
      <ContactAccountantModal
        open={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setContactAccountantId(null);
        }}
        accountantId={contactAccountantId}
      />
    </Box>
  );
}
