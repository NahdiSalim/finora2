import {
  Box,
  Container,
  MenuItem,
  Stack,
  Typography,
  InputAdornment,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useState } from "react";

import { LayoutSection } from "src/layouts/core/layout-section";
import { MainSection } from "src/layouts/core/main-section";
import { PublicNavbar } from "src/components/visitor/PublicNavbar";
import {
  AccountantCard,
  type Accountant,
} from "src/components/visitor/AccountantCard";
import { PageHeader } from "src/layouts/components/page-header";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import CustomInput from "src/components/common/CustomInput";
import { useGetPublicAccountantsQuery } from "src/lib/services/publicAccountantsApi";

// ----------------------------------------------------------------------

export function VisitorView() {
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [specialty, setSpecialty] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);

  const { data, isLoading } = useGetPublicAccountantsQuery({
    page: 1,
    limit: 8,
    search,
    specialty,
    location,
  });

  const accountants: Accountant[] =
    data?.data.map((item) => {
      const fullName =
        item.name && item.name !== "null null"
          ? item.name
          : [item.firstName, item.lastName].filter(Boolean).join(" ") ||
            item.company.name;

      const initials =
        fullName
          .split(" ")
          .filter(Boolean)
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase() || "C";

      return {
        name: fullName,
        initials,
        avatarColor: "#2563EB",
        yearsExperience: 12,
        location: item.company.city || item.company.address || "",
        rating: 4.8,
        reviews: 127,
        tags: ["Fiscaliste", "Expert comptable"],
        profilePhotoUrl: item.photo ?? undefined,
        title: item.specialty || "Expert comptable",
        description:
          item.company.address ||
          "Mollit in laborum tempor Lorem incididunt irure. Aute eu ex ad sunt.",
        featured: false,
      } as Accountant;
    }) ?? [];

  return (
    <LayoutSection
      headerSection={<PublicNavbar />}
      cssVars={{
        "--layout-background":
          "linear-gradient(180deg, #F3F4FF 0%, #F9FAFB 40%)",
      }}
    >
      <MainSection
        sx={(theme) => ({
          minHeight: "100vh",
          bgcolor: theme.palette.grey[50],
          py: { xs: 6, md: 8 },
        })}
      >
        <Container
          maxWidth={false}
          sx={{
            px: { xs: 2, sm: 3, md: 2 },
            maxWidth: "1440px",
            mx: "auto",
          }}
        >
          {/* Top intro section */}
          <PageHeader
            title="Networking"
            caption="Trouvez et connectez-vous avec des comptables qualifiés en quelques clics."
            sx={{
              mb: 2,
            }}
          />

          {/* Search & filters banner */}
          <Box
            sx={(theme) => ({
              mb: 3,
              borderRadius: 3,
              p: { xs: 2.5, md: 3 },
              bgcolor: "#E4E7FB",
              background:
                "linear-gradient(135deg, #E4E7FB 0%, #F1F4FF 40%, #E4E7FB 100%)",
              border: `1px solid ${theme.palette.divider}`,
            })}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 600, mb: 0.5, color: "#111827" }}
            >
              Trouvez votre comptable
            </Typography>

            <Typography
              sx={{
                mb: 2,
                color: "text.secondary",
                fontSize: 14,
              }}
            >
              Recherchez par nom ou filtrez par domaine, secteur, expérience et
              plus encore.
            </Typography>

            <Stack spacing={2}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <CustomInput
                  fullWidth
                  placeholder="Search for accountants ..."
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      const next = searchDraft.trim();
                      setSearch(next ? next : undefined);
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
                        <InputAdornment position="end" sx={{ mr: 0 }}>
                          <CustomButton
                            variant="contained"
                            color="primary"
                            size="medium"
                            sx={{
                              px: 2.5,
                              fontWeight: 600,
                            }}
                            onClick={() => {
                              const next = searchDraft.trim();
                              setSearch(next ? next : undefined);
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
                      pr: 0.6,
                    },
                  }}
                />
              </Stack>

              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1}
                flexWrap="wrap"
                sx={{ mt: 1 }}
              >
                <Box sx={{ minWidth: 220, flex: 1 }}>
                  <CustomSelect
                    label={undefined}
                    value={specialty ?? ""}
                    onChange={(e) =>
                      setSpecialty(
                        (e.target.value as string)
                          ? (e.target.value as string)
                          : undefined,
                      )
                    }
                    size="small"
                    IconComponent={KeyboardArrowDownIcon}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <Typography
                        sx={{ fontSize: 13, color: "text.secondary" }}
                      >
                        Spécialité
                      </Typography>
                    </MenuItem>
                    <MenuItem value="Expert Comptable">
                      Expert Comptable
                    </MenuItem>
                    <MenuItem value="Comptable">Comptable</MenuItem>
                    <MenuItem value="Fiscaliste">Fiscaliste</MenuItem>
                  </CustomSelect>
                </Box>

                <Box sx={{ minWidth: 220, flex: 1 }}>
                  <CustomSelect
                    label={undefined}
                    value={location ?? ""}
                    onChange={(e) =>
                      setLocation(
                        (e.target.value as string)
                          ? (e.target.value as string)
                          : undefined,
                      )
                    }
                    size="small"
                    IconComponent={KeyboardArrowDownIcon}
                    displayEmpty
                  >
                    <MenuItem value="">
                      <Typography
                        sx={{ fontSize: 13, color: "text.secondary" }}
                      >
                        Adresse / Ville
                      </Typography>
                    </MenuItem>
                    <MenuItem value="Tunis">Tunis</MenuItem>
                    <MenuItem value="Ariana">Ariana</MenuItem>
                    <MenuItem value="Sousse">Sousse</MenuItem>
                  </CustomSelect>
                </Box>
              </Stack>
            </Stack>
          </Box>

          {/* My accountants */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, color: "#111827" }}>
              My accountants
            </Typography>
          </Box>

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
            {!isLoading &&
              accountants.map((accountant) => (
                <AccountantCard
                  key={accountant.name + accountant.location}
                  data={accountant}
                />
              ))}
          </Box>
        </Container>
      </MainSection>
    </LayoutSection>
  );
}

// Filters are driven by API query params: search, specialty, location
