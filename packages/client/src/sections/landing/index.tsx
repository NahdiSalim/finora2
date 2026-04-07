import React, { useState, useEffect, useRef } from "react";
import Button from "@mui/material/Button";
import {
  Container,
  Grid,
  Box,
  Typography,
  Paper,
  IconButton,
  Chip,
  useTheme,
  InputAdornment,
  Stack,
  MenuItem,
} from "@mui/material";
import { styled, keyframes } from "@mui/material/styles";
import PeopleIcon from "@mui/icons-material/People";
import ViewKanbanIcon from "@mui/icons-material/ViewKanban";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import LockIcon from "@mui/icons-material/Lock";
import TwitterIcon from "@mui/icons-material/Twitter";
import FacebookIcon from "@mui/icons-material/Facebook";
import LinkedInIcon from "@mui/icons-material/LinkedIn";
import StarIcon from "@mui/icons-material/Star";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import Logo from "src/components/common/Logo";
import { Sparkle } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import CustomInput from "src/components/common/CustomInput";
import {
  AccountantCard,
  type Accountant,
} from "src/components/visitor/AccountantCard";
import { ContactAccountantModal } from "src/components/visitor/ContactAccountantModal";
import { useGetPublicAccountantsQuery } from "src/lib/services/publicAccountantsApi";
import {
  ALL_SPECIALTIES_FOR_FILTER,
  RATING_FILTER_OPTIONS,
} from "src/lib/constants/specialties";
import { useNavigate } from "react-router-dom";

/* ─────────────────────────────────────────────────────────────────
   KEYFRAMES
───────────────────────────────────────────────────────────────── */
const loaderReveal = keyframes`
  0%   { opacity: 1; transform: translateY(0); }
  80%  { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-100%); }
`;
const logoScale = keyframes`
  0%   { transform: scale(0.6) rotate(-8deg); opacity: 0; }
  60%  { transform: scale(1.08) rotate(2deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
`;
const loaderBar = keyframes`
  0%   { width: 0%; }
  100% { width: 100%; }
`;
const fadeInUp = keyframes`
  from { opacity: 0; transform: translateY(40px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const fadeInDown = keyframes`
  from { opacity: 0; transform: translateY(-30px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;
const floatAnimation = keyframes`
  0%   { transform: translateY(0px) rotate(0deg); }
  33%  { transform: translateY(-12px) rotate(0.5deg); }
  66%  { transform: translateY(-5px) rotate(-0.5deg); }
  100% { transform: translateY(0px) rotate(0deg); }
`;
const shimmer = keyframes`
  0%   { background-position: -200% center; }
  100% { background-position: 200% center; }
`;
const slideInLeft = keyframes`
  from { opacity: 0; transform: translateX(-60px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const slideInRight = keyframes`
  from { opacity: 0; transform: translateX(60px); }
  to   { opacity: 1; transform: translateX(0); }
`;
const orb1 = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(40px, -60px) scale(1.1); }
  66%  { transform: translate(-30px, 40px) scale(0.95); }
  100% { transform: translate(0, 0) scale(1); }
`;
const orb2 = keyframes`
  0%   { transform: translate(0, 0) scale(1); }
  33%  { transform: translate(-50px, 30px) scale(0.9); }
  66%  { transform: translate(60px, -40px) scale(1.05); }
  100% { transform: translate(0, 0) scale(1); }
`;

/* ─────────────────────────────────────────────────────────────────
   COMPOSANTS STYLISÉS
───────────────────────────────────────────────────────────────── */
interface LoaderOverlayProps {
  hide: boolean;
}
const LoaderOverlay = styled(Box, {
  shouldForwardProp: (prop) => prop !== "hide",
})<LoaderOverlayProps>(({ hide }) => ({
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "linear-gradient(135deg, #0217a0 0%, #0454ff 50%, #2b7aff 100%)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 32,
  animation: hide ? `${loaderReveal} 0.8s ease-in-out 2s forwards` : "none",
  pointerEvents: hide ? "none" : "all",
}));

const LoaderLogo = styled(Box)({
  animation: `${logoScale} 0.9s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.2s both`,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 12,
});

const LoaderBarTrack = styled(Box)({
  width: 220,
  height: 3,
  borderRadius: 100,
  background: "rgba(255,255,255,0.2)",
  overflow: "hidden",
});

const LoaderBarFill = styled(Box)({
  height: "100%",
  borderRadius: 100,
  background: "#ff7d0d",
  animation: `${loaderBar} 1.8s cubic-bezier(0.4,0,0.2,1) 0.3s both`,
});

interface GlassNavProps {
  scrolled: boolean;
}
const GlassNav = styled(Box, {
  shouldForwardProp: (prop) => prop !== "scrolled",
})<GlassNavProps>(({ scrolled }) => ({
  position: "fixed",
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1100,
  transition: "all 0.45s cubic-bezier(0.4,0,0.2,1)",
  ...(scrolled
    ? {
        backdropFilter: "blur(20px) saturate(1.8)",
        WebkitBackdropFilter: "blur(20px) saturate(1.8)",
        backgroundColor: "rgba(255,255,255,0.82)",
        boxShadow:
          "0 8px 40px rgba(4,84,255,0.10), 0 1px 0 rgba(255,255,255,0.9)",
      }
    : {
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
        backgroundColor: "transparent",
        boxShadow: "none",
      }),
}));

const HeroSection = styled(Box)({
  position: "relative",
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  color: "#fff",
  overflow: "hidden",
});

const StyledCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 28,
  background: "#ffffff",
  boxShadow: "0 4px 24px -4px rgba(4,84,255,0.07), 0 1px 4px rgba(0,0,0,0.04)",
  transition: "all 0.45s cubic-bezier(0.175,0.885,0.32,1.275)",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  "&::before": {
    content: '""',
    position: "absolute",
    inset: 0,
    borderRadius: 28,
    padding: 1,
    background: "linear-gradient(135deg, rgba(4,84,255,0.08), transparent)",
    WebkitMask:
      "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
    WebkitMaskComposite: "xor",
    maskComposite: "exclude",
    opacity: 0,
    transition: "opacity 0.3s ease",
  },
  "&:hover": {
    transform: "translateY(-14px) scale(1.02)",
    boxShadow:
      "0 32px 56px -12px rgba(4,84,255,0.18), 0 8px 20px rgba(0,0,0,0.06)",
    "&::before": { opacity: 1 },
  },
}));

const IconWrapper = styled(Box)({
  borderRadius: 20,
  width: 64,
  height: 64,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: 20,
  color: "#fff",
  transition: "transform 0.4s cubic-bezier(0.175,0.885,0.32,1.275)",
  boxShadow: "0 8px 24px -4px rgba(0,0,0,0.18)",
  "&:hover": { transform: "scale(1.1) rotate(5deg)" },
});

const TestimonialCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: 28,
  backgroundColor: "#ffffff",
  boxShadow: "0 4px 24px -4px rgba(0,0,0,0.05)",
  transition: "all 0.4s ease",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  "&::after": {
    content: '"\\201C"',
    position: "absolute",
    top: 12,
    right: 20,
    fontSize: 80,
    lineHeight: 1,
    color: "rgba(4,84,255,0.06)",
    fontFamily: "Georgia, serif",
    pointerEvents: "none",
  },
  "&:hover": {
    transform: "translateY(-10px)",
    boxShadow: "0 30px 48px -12px rgba(4,84,255,0.13)",
  },
}));

const BackToTopButton = styled(IconButton)({
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 1000,
  backgroundColor: "#ff7d0d",
  color: "#fff",
  boxShadow: "0 8px 20px rgba(255,125,13,0.4)",
  transition: "all 0.3s ease",
  "&:hover": {
    backgroundColor: "#e56b00",
    transform: "translateY(-4px) scale(1.05)",
    boxShadow: "0 12px 28px rgba(255,125,13,0.6)",
  },
});

/* ─────────────────────────────────────────────────────────────────
   ANIMATED SECTION WRAPPER
───────────────────────────────────────────────────────────────── */
type Direction = "up" | "down" | "left" | "right" | "fade";

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
  direction?: Direction;
  once?: boolean;
  sx?: React.CSSProperties;
}

function AnimatedSection({
  children,
  delay = 0,
  direction = "up",
  once = true,
  sx = {},
}: AnimatedSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return () => {};
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (once) obs.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.12 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [once]);

  const animMap: Record<Direction, ReturnType<typeof keyframes>> = {
    up: fadeInUp,
    down: fadeInDown,
    left: slideInLeft,
    right: slideInRight,
    fade: fadeIn,
  };

  return (
    <Box
      ref={ref}
      sx={{
        opacity: visible ? 1 : 0,
        animation: visible
          ? `${animMap[direction]} 0.75s cubic-bezier(0.4,0,0.2,1) ${delay}s both`
          : "none",
        transition: "opacity 0.1s",
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

/* ─────────────────────────────────────────────────────────────────
   COMPOSANT PRINCIPAL
───────────────────────────────────────────────────────────────── */
const FinoraLandingPage = () => {
  const navigate = useNavigate(); // ✅ hook placé correctement
  const [email, setEmail] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [scrolled, setScrolled] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const theme = useTheme();

  // Statistiques
  const [countedStats, setCountedStats] = useState<Record<string, string>>({
    "98%": "0",
    "3×": "0",
    "500+": "0",
    "40%": "0",
  });
  const statsRef = useRef<HTMLDivElement>(null);
  const statsTriggered = useRef(false);

  // États pour la section experts‑comptables
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [specialty, setSpecialty] = useState<string | undefined>(undefined);
  const [location, setLocation] = useState<string | undefined>(undefined);
  const [ratingRange, setRatingRange] = useState<string | undefined>(undefined);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [contactAccountantId, setContactAccountantId] = useState<number | null>(
    null,
  );

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
      } as Accountant;
    }) ?? [];

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const scrolledPx = window.scrollY > 20;
      setScrolled(scrolledPx);
      setShowBackToTop(window.scrollY > 600);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Animation des compteurs
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !statsTriggered.current) {
          statsTriggered.current = true;
          const targets: Record<string, number> = {
            "98%": 98,
            "3×": 3,
            "500+": 500,
            "40%": 40,
          };
          const duration = 1500;
          const stepTime = 20;
          const steps = duration / stepTime;
          let currentStep = 0;
          const intervals: Record<string, NodeJS.Timeout> = {};
          for (const [key, target] of Object.entries(targets)) {
            intervals[key] = setInterval(() => {
              currentStep++;
              const value = Math.min(
                target,
                Math.ceil((target * currentStep) / steps),
              );
              setCountedStats((prev) => ({
                ...prev,
                [key]:
                  key === "500+"
                    ? `${value}+`
                    : key === "3×"
                      ? `${value}×`
                      : `${value}%`,
              }));
              if (currentStep >= steps) clearInterval(intervals[key]);
            }, stepTime);
          }
          return () => {
            Object.values(intervals).forEach((interval) =>
              clearInterval(interval),
            );
          };
        }
        return undefined;
      },
      { threshold: 0.5 },
    );
    if (statsRef.current) observer.observe(statsRef.current);
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const features = [
    {
      title: "Gestion Multigénérationnelle",
      desc: "Inscrivez votre cabinet, structurez vos équipes et centralisez votre portefeuille clients.",
      icon: <PeopleIcon sx={{ fontSize: 32 }} />,
      gradient: "linear-gradient(135deg, #0454ff 0%, #2b7aff 100%)",
    },
    {
      title: "Kanban Intelligent & Tâches",
      desc: "Transformez les demandes clients en missions. Assignez des tâches avec dates limites.",
      icon: <ViewKanbanIcon sx={{ fontSize: 32 }} />,
      gradient: "linear-gradient(135deg, #ff7d0d 0%, #ff9e44 100%)",
    },
    {
      title: "Extraction de Données par IA",
      desc: "Gagnez des heures de saisie. Notre modèle IA extrait automatiquement les détails.",
      icon: <AutoAwesomeIcon sx={{ fontSize: 32 }} />,
      gradient: "linear-gradient(135deg, #6c5ce7 0%, #a363d9 100%)",
    },
    {
      title: "Espace de Partage Sécurisé",
      desc: "Un coffre-fort numérique pour chaque client. Échangez des documents en toute conformité.",
      icon: <LockIcon sx={{ fontSize: 32 }} />,
      gradient: "linear-gradient(135deg, #00b894 0%, #00cec9 100%)",
    },
  ];

  const testimonials = [
    {
      quote:
        "Depuis que nous utilisons la plateforme, le temps de traitement des pièces comptables a été divisé par trois. Une véritable révolution pour notre cabinet.",
      name: "Alex Jordan",
      title: "Expert-comptable Associé",
      img: "https://framerusercontent.com/images/aQAfw6UatloRhlkBjVmGTg6WP0.png",
      rating: 5,
    },
    {
      quote:
        "La vue Kanban permet à mon équipe de savoir exactement quoi faire chaque matin. La productivité a augmenté de 40% dès le premier mois.",
      name: "Daniel Cooper",
      title: "Responsable de Cabinet",
      img: "https://framerusercontent.com/images/KcCMMECKZOgi4RCYPbRBT2B8u0.png",
      rating: 5,
    },
    {
      quote:
        "Échanger des documents avec mon comptable n&apos;a jamais été aussi simple et sécurisé. L&apos;interface est intuitive et moderne.",
      name: "Liam Parker",
      title: "Directeur de Cabinet",
      img: "https://framerusercontent.com/images/vm6rgYhGUSG7SRXU6hpw22hnk.png",
      rating: 5,
    },
  ];

  const faqs = [
    {
      q: "Comment fonctionne l&apos;extraction IA ?",
      a: "Notre IA analyse vos scans et PDF pour identifier les montants, dates, TVA et fournisseurs, puis les pré-remplit dans votre système avec une précision de 98%.",
    },
    {
      q: "Puis-je inviter un nombre illimité de clients ?",
      a: "Oui, vous pouvez inviter autant de clients que vous le souhaitez. La plateforme est conçue pour évoluer avec votre cabinet sans limitation.",
    },
    {
      q: "Mes données sont-elles sécurisées ?",
      a: "Absolument. Nous utilisons un chiffrement AES-256 de bout en bout et respectons les normes RGPD et ISO 27001 les plus strictes.",
    },
    {
      q: "La plateforme est-elle disponible sur smartphone ?",
      a: "Oui, nous proposons une application mobile complète pour iOS et Android, avec toutes les fonctionnalités essentielles.",
    },
  ];

  const stats = [
    { key: "98%", label: "Précision IA" },
    { key: "3×", label: "Plus rapide" },
    { key: "500+", label: "Cabinets" },
    { key: "40%", label: "Productivité ↑" },
  ];

  const trustedLogos = [
    "https://cdn-icons-png.flaticon.com/512/5968/5968705.png",
    "https://cdn-icons-png.flaticon.com/512/174/174857.png",
    "https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg",
  ];

  return (
    <Box
      sx={{
        overflowX: "hidden",
      }}
    >
      {/* LOADER */}
      <LoaderOverlay hide={loaded}>
        <LoaderLogo>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <img
              src="https://framerusercontent.com/images/kq857rH86cqGviBRliG7ERQy3MU.png?width=56&height=56"
              alt="Logo Finora"
              style={{ height: 56 }}
            />
            <img
              src="https://framerusercontent.com/images/0eFtMzYADpcGfz0iOHLgxGKIiSM.svg?width=120&height=26"
              alt="Finora"
              style={{ height: 26, filter: "brightness(0) invert(1)" }}
            />
          </Box>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.65)",
              fontSize: "0.8rem",
              letterSpacing: 3,
              textTransform: "uppercase",
              mt: 0.5,
            }}
          >
            Chargement en cours
          </Typography>
        </LoaderLogo>
        <LoaderBarTrack>
          <LoaderBarFill />
        </LoaderBarTrack>
      </LoaderOverlay>

      {/* NAVBAR */}
      <GlassNav scrolled={scrolled}>
        <Container maxWidth="xl">
          <Box
            sx={{
              py: scrolled ? 1 : 1.5,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              transition: "padding 0.4s ease",
            }}
          >
            {scrolled ? (
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
                <Logo />
              </Box>
            ) : (
              <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
                <Logo isOnDark />
              </Box>
            )}

            {scrolled ? (
              <Box
                sx={{
                  display: { xs: "flex", md: "none" },
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                  width: 32,
                  height: 32,
                }}
              >
                <Logo variant="symbol" />
              </Box>
            ) : (
              <Box
                sx={{
                  display: { xs: "flex", md: "none" },
                  justifyContent: "center",
                  alignItems: "center",
                  gap: 1,
                  width: 32,
                  height: 32,
                }}
              >
                <Logo variant="symbol" isOnDark />
              </Box>
            )}

            <Box sx={{ display: { xs: "none", md: "flex" }, gap: 1 }}>
              {[
                { label: "Accueil", id: "hero" },
                { label: "Fonctionnalités", id: "features" },
                { label: "Témoignages", id: "testimonials" },
                { label: "Experts", id: "accountants" },
                { label: "FAQ", id: "faq" },
              ].map((item) => (
                <Button
                  key={item.label}
                  onClick={() => scrollToSection(item.id)}
                  sx={{
                    color: scrolled ? "#1a1a1a" : "rgba(255,255,255,0.92)",
                    textTransform: "none",
                    fontWeight: 500,
                    fontSize: "0.92rem",
                    px: 1.5,
                    borderRadius: 2,
                    transition: "all 0.25s ease",
                    "&:hover": {
                      color: scrolled ? "#0454ff" : "#fff",
                      backgroundColor: scrolled
                        ? "rgba(4,84,255,0.07)"
                        : "rgba(255,255,255,0.12)",
                    },
                  }}
                >
                  {item.label}
                </Button>
              ))}
            </Box>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <CustomButton
                variant="outlined"
                onClick={() => navigate("/register")}
                sx={{
                  textTransform: "none",
                  borderColor: scrolled
                    ? "rgba(0,0,0,0.18)"
                    : "rgba(255,255,255,0.5)",
                  color: scrolled ? "#1a1a1a" : "#fff",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    borderColor: scrolled ? "#0454ff" : "#fff",
                    color: scrolled ? "#0454ff" : "#fff",
                    backgroundColor: scrolled
                      ? "rgba(4,84,255,0.06)"
                      : "rgba(255,255,255,0.1)",
                    transform: "translateY(-1px)",
                  },
                }}
              >
                S&apos;inscrire
              </CustomButton>

              <CustomButton
                variant="contained"
                color="secondary"
                onClick={() => navigate("/sign-in")}
                sx={{
                  textTransform: "none",
                  boxShadow: "0 4px 16px rgba(255,125,13,0.35)",
                  "&:hover": {
                    backgroundColor: "#e56b00",
                    transform: "translateY(-2px)",
                    boxShadow: "0 10px 28px rgba(255,125,13,0.45)",
                  },
                  transition: "all 0.25s ease",
                }}
              >
                Se connecter
              </CustomButton>
            </Box>
          </Box>
        </Container>
      </GlassNav>

      {/* HERO */}
      <HeroSection id="hero">
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage:
              "url('https://framerusercontent.com/images/LTzUgqhBMU0fYD8l2vHeGvu8dQI.jpg?width=5760&height=5760')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(3px) brightness(0.55)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 1,
            background:
              "linear-gradient(135deg, rgba(2,23,160,0.88) 0%, rgba(4,84,255,0.78) 50%, rgba(43,122,255,0.65) 100%)",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: "10%",
            left: "5%",
            zIndex: 2,
            width: 420,
            height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(107,158,255,0.3) 0%, transparent 70%)",
            animation: `${orb1} 14s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: "10%",
            right: "5%",
            zIndex: 2,
            width: 360,
            height: 360,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,125,13,0.2) 0%, transparent 70%)",
            animation: `${orb2} 18s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 2,
            opacity: 0.08,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
            pointerEvents: "none",
          }}
        />
        <Container
          maxWidth="lg"
          sx={{
            position: "relative",
            zIndex: 3,
            pt: { xs: 16, md: 20 },
            pb: 10,
          }}
        >
          <Box sx={{ animation: `${fadeInDown} 0.7s ease 2.9s both` }}>
            <Chip
              label="L'Écosystème Cabinet-Collaborateurs-Clients"
              sx={{
                bgcolor: "rgba(255,255,255,0.13)",
                backdropFilter: "blur(10px)",
                color: "#fff",
                borderRadius: 100,
                px: 2,
                py: 1.5,
                mb: 3,
                fontSize: "0.85rem",
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.2)",
                "& .MuiChip-icon": { color: "rgba(255,255,255,0.8)" },
              }}
              icon={<Sparkle />}
            />
          </Box>

          <Box
            sx={{
              animation: `${fadeInUp} 0.85s cubic-bezier(0.4,0,0.2,1) 3.05s both`,
            }}
          >
            <Typography
              variant="h1"
              sx={{
                fontSize: { xs: "2.6rem", sm: "3.8rem", md: "5.5rem" },
                fontWeight: 900,
                lineHeight: 1.05,
                mb: 3,
                letterSpacing: "-0.03em",
                background:
                  "linear-gradient(135deg, #fff 30%, rgba(180,205,255,0.9) 100%)",
                backgroundSize: "200% auto",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
                animation: `${shimmer} 6s linear 4s infinite`,
              }}
            >
              L&apos;excellence comptable,{" "}
              <Box
                component="span"
                sx={{
                  background:
                    "linear-gradient(135deg, #ff9e44 0%, #ff7d0d 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                propulsée
              </Box>{" "}
              par l&apos;IA.
            </Typography>
          </Box>

          <Box sx={{ animation: `${fadeInUp} 0.85s ease 3.2s both` }}>
            <Typography
              variant="h5"
              sx={{
                fontSize: { xs: "1rem", md: "1.3rem" },
                maxWidth: 640,
                mx: "auto",
                mb: 5,
                opacity: 0.88,
                fontWeight: 400,
                lineHeight: 1.7,
              }}
            >
              Centralisez vos clients, automatisez vos processus et transformez
              chaque flux de documents en actions concrètes.
            </Typography>
          </Box>

          <Box sx={{ animation: `${fadeInUp} 0.85s ease 3.35s both` }}>
            <Box
              component="form"
              onSubmit={(e) => {
                e.preventDefault();
                // Add your submit logic here
              }}
              sx={{
                position: "relative",
                maxWidth: 560,
                mx: "auto",
                mb: 6,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 6,
                background: "rgba(255,255,255,0.08)",
                backdropFilter: "blur(12px)",
                boxShadow:
                  "0 25px 45px -12px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.1)",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  borderRadius: 6,
                  padding: "1.5px",
                  background:
                    "linear-gradient(135deg, rgba(255,255,255,0.3), rgba(255,125,13,0.5), rgba(255,255,255,0.1))",
                  WebkitMask:
                    "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  maskComposite: "exclude",
                },
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 1.5,
                  alignItems: "center",
                }}
              >
                <CustomInput
                  placeholder="Votre adresse email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  fullWidth
                  sx={{
                    flex: 1,
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      backgroundColor: "rgba(255,255,255,0.1)",
                      transition: "all 0.25s ease",
                      "& fieldset": {
                        borderColor: "transparent",
                        transition: "border-color 0.2s",
                      },
                      "&:hover fieldset": {
                        borderColor: "rgba(4,84,255,0.4)",
                      },
                      "&.Mui-focused fieldset": {
                        borderColor: "#ff7d0d",
                        borderWidth: 2,
                      },
                    },
                    "& .MuiInputBase-input": {
                      py: 1.6,
                      px: 2,
                      color: "#fff",
                      "&::placeholder": {
                        color: "rgba(255, 255, 255, 0.79)",
                      },
                    },
                  }}
                />
                <CustomButton
                  type="submit"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    bgcolor: "#ff7d0d",
                    borderRadius: 3,
                    textTransform: "none",
                    whiteSpace: "nowrap",
                    boxShadow: "0 8px 20px rgba(255,125,13,0.4)",
                    transition: "all 0.3s cubic-bezier(0.2, 0.9, 0.4, 1.1)",
                    "&:hover": {
                      bgcolor: "#e56b00",
                      transform: "translateX(4px) scale(1.02)",
                      boxShadow: "0 15px 30px rgba(255,125,13,0.6)",
                    },
                    "&:active": {
                      transform: "translateX(2px) scale(0.98)",
                    },
                  }}
                >
                  Commencer
                </CustomButton>
              </Box>
            </Box>
          </Box>

          <Box
            ref={statsRef}
            sx={{ animation: `${fadeInUp} 0.85s ease 3.5s both` }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                gap: { xs: 3, md: 6 },
                flexWrap: "wrap",
                mb: 8,
              }}
            >
              {stats.map((s) => (
                <Box key={s.label} sx={{ textAlign: "center" }}>
                  <Typography
                    sx={{
                      fontSize: { xs: "1.6rem", md: "2rem" },
                      fontWeight: 900,
                      color: "#fff",
                      lineHeight: 1,
                    }}
                  >
                    {countedStats[s.key] ||
                      (s.key === "500+"
                        ? "500+"
                        : s.key === "3×"
                          ? "3×"
                          : s.key)}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "rgba(255,255,255,0.65)",
                      fontWeight: 500,
                      letterSpacing: 1,
                    }}
                  >
                    {s.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          <Box sx={{ animation: `${fadeInUp} 1s ease 3.65s both` }}>
            <Box
              sx={{
                animation: `${floatAnimation} 7s ease-in-out 5s infinite`,
                position: "relative",
              }}
            >
              <Box
                sx={{
                  position: "absolute",
                  bottom: -40,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: "70%",
                  height: 80,
                  background:
                    "radial-gradient(ellipse, rgba(4,84,255,0.5) 0%, transparent 70%)",
                  filter: "blur(20px)",
                  pointerEvents: "none",
                }}
              />
              <img
                src="https://framerusercontent.com/images/LW0TvSUYOx6XEjwbm3R3AbMjsw.jpg?width=1440&height=1024"
                alt="Aperçu du tableau de bord Finora"
                style={{
                  width: "100%",
                  maxWidth: 1000,
                  borderRadius: 28,
                  boxShadow:
                    "0 60px 100px -20px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.15)",
                  display: "block",
                  margin: "0 auto",
                }}
              />
            </Box>
          </Box>
        </Container>
      </HeroSection>

      {/* SECTION FEATURES */}
      <Box
        id="features"
        sx={{ py: { xs: 8, md: 14 }, bgcolor: "#f8fafc", position: "relative" }}
      >
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            opacity: 0.4,
            zIndex: 0,
            pointerEvents: "none",
            backgroundImage:
              "radial-gradient(rgba(4,84,255,0.08) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <AnimatedSection delay={0.1} direction="up">
            <Box sx={{ textAlign: "center", mb: 8 }}>
              <Chip
                label="Fonctionnalités clés"
                sx={{
                  color: "#0454ff",
                  fontWeight: 700,
                  bgcolor: "#e8f0ff",
                  mb: 2,
                  letterSpacing: 0.5,
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: "1.9rem", md: "2.9rem" },
                  letterSpacing: "-0.03em",
                  background:
                    "linear-gradient(135deg, #0d0d1a 0%, #0454ff 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                Pilotez votre cabinet avec
                <br />
                une précision chirurgicale.
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#64748b",
                  maxWidth: 600,
                  mx: "auto",
                  fontSize: "1.1rem",
                  lineHeight: 1.7,
                }}
              >
                Explorez des fonctionnalités puissantes conçues pour simplifier
                vos processus et décupler la productivité.
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={4}>
            {features.map((feature, idx) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
                <AnimatedSection delay={0.1 + idx * 0.1} direction="up">
                  <StyledCard elevation={0}>
                    <IconWrapper sx={{ background: feature.gradient }}>
                      {feature.icon}
                    </IconWrapper>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 800,
                        mb: 1.5,
                        color: "#0d0d1a",
                        fontSize: "1.05rem",
                      }}
                    >
                      {feature.title}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: "#64748b",
                        lineHeight: 1.7,
                        fontSize: "0.92rem",
                      }}
                    >
                      {feature.desc}
                    </Typography>
                  </StyledCard>
                </AnimatedSection>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* SECTION TRUSTED BY */}
      <Box
        sx={{
          py: 4,
          bgcolor: "#ffffff",
          borderTop: "1px solid #eef2f6",
          borderBottom: "1px solid #eef2f6",
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant="overline"
            sx={{
              display: "block",
              textAlign: "center",
              color: "#64748b",
              fontWeight: 600,
              letterSpacing: 2,
              mb: 3,
            }}
          >
            Ils nous font confiance
          </Typography>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: { xs: 3, md: 8 },
              flexWrap: "wrap",
              opacity: 0.7,
            }}
          >
            {trustedLogos.map((logo, i) => (
              <img
                key={i}
                src={logo}
                alt="logo client"
                style={{
                  height: 40,
                  filter: "grayscale(1)",
                  transition: "filter 0.3s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.filter = "grayscale(0)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.filter = "grayscale(1)")
                }
              />
            ))}
          </Box>
        </Container>
      </Box>

      {/* SECTION TESTIMONIALS */}
      <Box
        id="testimonials"
        sx={{
          py: { xs: 8, md: 14 },
          background: "linear-gradient(180deg, #ffffff 0%, #f0f4ff 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -200,
            right: -200,
            zIndex: 0,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(4,84,255,0.06) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <AnimatedSection delay={0.1} direction="up">
            <Box sx={{ textAlign: "center", mb: 8 }}>
              <Chip
                label="Témoignages"
                sx={{
                  color: "#0454ff",
                  fontWeight: 700,
                  bgcolor: "#e8f0ff",
                  mb: 2,
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: "1.9rem", md: "2.9rem" },
                  letterSpacing: "-0.03em",
                }}
              >
                Adopté par les cabinets,
                <br />
                <Box
                  component="span"
                  sx={{
                    background:
                      "linear-gradient(135deg, #0454ff 0%, #6b9eff 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    color: "transparent",
                  }}
                >
                  plébiscité par leurs clients.
                </Box>
              </Typography>
            </Box>
          </AnimatedSection>

          <Grid container spacing={4}>
            {testimonials.map((t, idx) => (
              <Grid size={{ xs: 12, md: 4 }} key={idx}>
                <AnimatedSection delay={0.1 + idx * 0.12} direction="up">
                  <TestimonialCard elevation={0}>
                    <Box sx={{ display: "flex", gap: 0.5, mb: 2 }}>
                      {[...Array(t.rating)].map((_, i) => (
                        <StarIcon
                          key={i}
                          sx={{ color: "#ffb400", fontSize: 18 }}
                        />
                      ))}
                    </Box>
                    <Typography
                      variant="body1"
                      sx={{
                        mb: 3,
                        fontStyle: "italic",
                        color: "#334155",
                        lineHeight: 1.75,
                        fontSize: "0.97rem",
                        minHeight: 100,
                      }}
                    >
                      &quot;{t.quote}&quot;
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        pt: 2,
                        borderTop: "1px solid #f1f5f9",
                      }}
                    >
                      <Box sx={{ position: "relative" }}>
                        <img
                          src={t.img}
                          alt={t.name}
                          style={{
                            width: 52,
                            height: 52,
                            borderRadius: "50%",
                            objectFit: "cover",
                            border: "3px solid #0454ff",
                          }}
                        />
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: -2,
                            right: -2,
                            width: 16,
                            height: 16,
                            borderRadius: "50%",
                            background: "#00b894",
                            border: "2px solid #fff",
                          }}
                        />
                      </Box>
                      <Box>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: "#1a1a1a",
                            fontSize: "0.95rem",
                          }}
                        >
                          {t.name}
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ color: "#64748b", fontSize: "0.82rem" }}
                        >
                          {t.title}
                        </Typography>
                      </Box>
                    </Box>
                  </TestimonialCard>
                </AnimatedSection>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* SECTION EXPERTS‑COMPTABLES */}
      <Box id="accountants" sx={{ py: { xs: 8, md: 14 }, bgcolor: "#f8fafc" }}>
        <Container maxWidth="lg">
          <AnimatedSection delay={0.1} direction="up">
            <Box sx={{ textAlign: "center", mb: 6 }}>
              <Chip
                label="Trouvez votre expert"
                sx={{
                  color: "#0454ff",
                  fontWeight: 700,
                  bgcolor: "#e8f0ff",
                  mb: 2,
                }}
              />
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  mb: 2,
                  fontSize: { xs: "1.9rem", md: "2.9rem" },
                  letterSpacing: "-0.03em",
                  background:
                    "linear-gradient(135deg, #0d0d1a 0%, #0454ff 100%)",
                  backgroundClip: "text",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
                }}
              >
                Les meilleurs experts‑comptables
                <br />à portée de clic
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#64748b",
                  maxWidth: 600,
                  mx: "auto",
                  fontSize: "1.1rem",
                  lineHeight: 1.7,
                }}
              >
                Filtrez par spécialité, localisation ou note et contactez en
                quelques secondes le professionnel qui répond à vos besoins.
              </Typography>
            </Box>
          </AnimatedSection>

          <AnimatedSection delay={0.15} direction="up">
            <Box
              sx={{
                mb: 5,
                borderRadius: 3,
                p: { xs: 2.5, md: 3 },
                bgcolor: "#E4E7FB",
                background:
                  "url('/assets/filterBarBG.svg') center/cover no-repeat",
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={2}>
                <Stack spacing={1.5}>
                  <CustomInput
                    fullWidth
                    placeholder="Rechercher un comptable ..."
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
                  <Box sx={{ flex: 1, mx: { xs: 0, sm: 1 } }}>
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
                      {ALL_SPECIALTIES_FOR_FILTER.map((s) => (
                        <MenuItem key={s} value={s}>
                          {s}
                        </MenuItem>
                      ))}
                    </CustomSelect>
                  </Box>

                  <Box sx={{ flex: 1, mx: { xs: 0, sm: 1 } }}>
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

                  <Box sx={{ flex: 1, mx: { xs: 0, sm: 1 } }}>
                    <CustomSelect
                      value={ratingRange ?? ""}
                      onChange={(e) =>
                        setRatingRange((e.target.value as string) || undefined)
                      }
                      size="small"
                      IconComponent={KeyboardArrowDownIcon}
                      displayEmpty
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
          </AnimatedSection>

          <AnimatedSection delay={0.2} direction="up">
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
                    scheduleButtonLabel="Devenir client"
                    onScheduleClick={() => scrollToSection("hero")}
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 3 }}
                >
                  Aucun comptable ne correspond à vos critères actuels.
                </Typography>
                <CustomButton
                  variant="outlined"
                  onClick={() => {
                    setSearch(undefined);
                    setSearchDraft("");
                    setSpecialty(undefined);
                    setLocation(undefined);
                    setRatingRange(undefined);
                  }}
                >
                  Réinitialiser les filtres
                </CustomButton>
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Typography variant="body1" color="text.secondary">
                  Chargement des experts...
                </Typography>
              </Box>
            )}
          </AnimatedSection>
        </Container>
      </Box>

      {/* SECTION FAQ */}
      <Box id="faq" sx={{ py: { xs: 8, md: 14 }, bgcolor: "#f8fafc" }}>
        <Container maxWidth="lg">
          <Grid container spacing={6}>
            <Grid size={{ xs: 12, md: 5 }}>
              <AnimatedSection delay={0.1} direction="left">
                <Chip
                  label="FAQ"
                  sx={{
                    color: "#0454ff",
                    fontWeight: 700,
                    bgcolor: "#e8f0ff",
                    mb: 2,
                  }}
                />
                <Typography
                  variant="h4"
                  sx={{
                    fontWeight: 800,
                    mb: 2,
                    fontSize: { xs: "1.8rem", md: "2.3rem" },
                    letterSpacing: "-0.03em",
                  }}
                >
                  Foire aux questions
                </Typography>
                <Typography
                  variant="body1"
                  sx={{ color: "#64748b", mb: 4, lineHeight: 1.7 }}
                >
                  Trouvez rapidement des réponses claires et des solutions à
                  toutes vos questions.
                </Typography>
                <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                  {["Support", "Documentation"].map((label) => (
                    <Button
                      key={label}
                      variant="outlined"
                      sx={{
                        borderRadius: 100,
                        textTransform: "none",
                        fontWeight: 600,
                        borderColor: "#cbd5e1",
                        color: "#64748b",
                        "&:hover": {
                          borderColor: "#0454ff",
                          color: "#0454ff",
                          backgroundColor: "rgba(4,84,255,0.05)",
                          transform: "translateY(-2px)",
                        },
                        transition: "all 0.25s ease",
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Box>
              </AnimatedSection>
            </Grid>
            <Grid size={{ xs: 12, md: 7 }}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                {faqs.map((item, idx) => (
                  <AnimatedSection
                    key={idx}
                    delay={0.05 + idx * 0.1}
                    direction="right"
                  >
                    <Paper
                      sx={{
                        p: 3,
                        borderRadius: 3.5,
                        bgcolor: "#fff",
                        border: "1px solid rgba(4,84,255,0.06)",
                        transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                        "&:hover": {
                          boxShadow: "0 12px 36px -8px rgba(4,84,255,0.12)",
                          transform: "translateX(10px)",
                          borderColor: "rgba(4,84,255,0.2)",
                        },
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 800,
                          mb: 1,
                          color: "#0d0d1a",
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          fontSize: "0.97rem",
                        }}
                      >
                        <Box
                          sx={{
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #0454ff, #2b7aff)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          <Typography
                            sx={{
                              color: "#fff",
                              fontSize: "0.7rem",
                              fontWeight: 800,
                            }}
                          >
                            {idx + 1}
                          </Typography>
                        </Box>
                        {item.q}
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ color: "#64748b", pl: 4.5, lineHeight: 1.7 }}
                      >
                        {item.a}
                      </Typography>
                    </Paper>
                  </AnimatedSection>
                ))}
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA SECTION */}
      <Box
        sx={{
          py: { xs: 8, md: 14 },
          position: "relative",
          overflow: "hidden",
          background:
            "linear-gradient(135deg, #0217a0 0%, #0454ff 50%, #2b7aff 100%)",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: -100,
            left: -100,
            zIndex: 0,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 60%)",
            animation: `${orb1} 12s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            bottom: -80,
            right: -80,
            zIndex: 0,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(255,125,13,0.18) 0%, transparent 60%)",
            animation: `${orb2} 16s ease-in-out infinite`,
            pointerEvents: "none",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            opacity: 0.07,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            pointerEvents: "none",
          }}
        />
        <Container maxWidth="md" sx={{ position: "relative", zIndex: 1 }}>
          <AnimatedSection delay={0.1} direction="up">
            <Chip
              label="Rejoignez-nous"
              sx={{
                bgcolor: "rgba(255,255,255,0.15)",
                backdropFilter: "blur(8px)",
                color: "#fff",
                mb: 3,
                fontWeight: 600,
                border: "1px solid rgba(255,255,255,0.25)",
              }}
            />
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                mb: 2,
                fontSize: { xs: "1.9rem", md: "3rem" },
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              Prêt à transformer
              <br />
              votre cabinet ?
            </Typography>
            <Typography
              variant="body1"
              sx={{
                mb: 5,
                opacity: 0.88,
                fontSize: "1.15rem",
                lineHeight: 1.7,
              }}
            >
              Rejoignez les cabinets qui ont déjà adopté Finora
              <br />
              et boostez votre productivité dès aujourd&apos;hui.
            </Typography>
            <CustomButton
              variant="contained"
              color="secondary"
              size="large"
              endIcon={<ArrowForwardIcon />}
              sx={{
                textTransform: "none",
                boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
                "&:hover": {
                  bgcolor: "#e56b00",
                  transform: "scale(1.06)",
                  boxShadow: "0 24px 50px rgba(0,0,0,0.35)",
                },
                transition: "all 0.3s ease",
              }}
            >
              Demander une démo
            </CustomButton>
          </AnimatedSection>
        </Container>
      </Box>

      {/* FOOTER */}
      <Box sx={{ py: 7, bgcolor: "#fafafa", borderTop: "1px solid #e8ecf2" }}>
        <Container maxWidth="lg">
          <Grid container spacing={4} sx={{ mb: 5 }}>
            <Grid size={{ xs: 12, md: 4 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 2.5,
                }}
              >
                <Logo />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: "#64748b",
                  mb: 3,
                  lineHeight: 1.75,
                  maxWidth: 280,
                }}
              >
                La plateforme de gestion financière nouvelle génération pour les
                cabinets comptables audacieux.
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                {[TwitterIcon, FacebookIcon, LinkedInIcon].map((Icon, i) => (
                  <IconButton
                    key={i}
                    sx={{
                      bgcolor: "#f1f5f9",
                      width: 38,
                      height: 38,
                      transition: "all 0.25s ease",
                      "&:hover": {
                        bgcolor: "#0454ff",
                        color: "#fff",
                        transform: "translateY(-3px)",
                        boxShadow: "0 8px 20px rgba(4,84,255,0.3)",
                      },
                    }}
                  >
                    <Icon fontSize="small" />
                  </IconButton>
                ))}
              </Box>
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  mb: 2.5,
                  color: "#0d0d1a",
                  fontSize: "0.85rem",
                  letterSpacing: 0.5,
                }}
              >
                PAGES
              </Typography>
              {[
                { label: "Accueil", id: "hero" },
                { label: "Fonctionnalités", id: "features" },
                { label: "Témoignages", id: "testimonials" },
                { label: "Experts", id: "accountants" },
                { label: "FAQ", id: "faq" },
              ].map((link) => (
                <Box key={link.label} sx={{ mb: 1 }}>
                  <Button
                    onClick={() => scrollToSection(link.id)}
                    sx={{
                      textTransform: "none",
                      color: "#64748b",
                      p: 0,
                      minWidth: 0,
                      fontSize: "0.92rem",
                      "&:hover": { color: "#0454ff" },
                      transition: "color 0.2s",
                    }}
                  >
                    {link.label}
                  </Button>
                </Box>
              ))}
            </Grid>
            <Grid size={{ xs: 6, md: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  mb: 2.5,
                  color: "#0d0d1a",
                  fontSize: "0.85rem",
                  letterSpacing: 0.5,
                }}
              >
                RESSOURCES
              </Typography>
              {["Blog", "Intégrations", "Contact", "Support"].map((link) => (
                <Box key={link} sx={{ mb: 1 }}>
                  <Button
                    href="#"
                    sx={{
                      textTransform: "none",
                      color: "#64748b",
                      p: 0,
                      minWidth: 0,
                      fontSize: "0.92rem",
                      "&:hover": { color: "#0454ff" },
                      transition: "color 0.2s",
                    }}
                  >
                    {link}
                  </Button>
                </Box>
              ))}
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 800,
                  mb: 2.5,
                  color: "#0d0d1a",
                  fontSize: "0.85rem",
                  letterSpacing: 0.5,
                }}
              >
                NEWSLETTER
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "#64748b", mb: 2, lineHeight: 1.6 }}
              >
                Recevez nos dernières actualités et conseils pour votre cabinet.
              </Typography>
              <Box
                component="form"
                onSubmit={(e) => {
                  e.preventDefault();
                }}
                sx={{
                  display: "flex",
                  gap: 1,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <CustomInput
                  placeholder="Votre email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    bgcolor: "#fff",
                    "& .MuiOutlinedInput-root": {
                      "& fieldset": { borderColor: "#e2e8f0" },
                      "&:hover fieldset": { borderColor: "#0454ff" },
                    },
                  }}
                />
                <CustomButton
                  type="submit"
                  variant="contained"
                  size="large"
                  sx={{
                    bgcolor: "#0454ff",
                    borderRadius: 2.5,
                    textTransform: "none",
                    fontWeight: 700,
                    px: 2.5,
                    "&:hover": {
                      bgcolor: "#2b7aff",
                      transform: "translateY(-1px)",
                    },
                    transition: "all 0.2s ease",
                    whiteSpace: "nowrap",
                  }}
                >
                  S&apos;abonner
                </CustomButton>
              </Box>
            </Grid>
          </Grid>

          <Box
            sx={{
              borderTop: "1px solid #e8ecf2",
              pt: 4,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: "#94a3b8" }}>
              © Finora 2025. Tous droits réservés.
            </Typography>
            <Box sx={{ display: "flex", gap: 3 }}>
              {["Confidentialité", "Conditions", "Cookies"].map((link) => (
                <Button
                  key={link}
                  href="#"
                  sx={{
                    textTransform: "none",
                    color: "#94a3b8",
                    p: 0,
                    minWidth: 0,
                    fontSize: "0.78rem",
                    "&:hover": { color: "#0454ff" },
                  }}
                >
                  {link}
                </Button>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* MODAL DE CONTACT */}
      <ContactAccountantModal
        open={contactModalOpen}
        onClose={() => {
          setContactModalOpen(false);
          setContactAccountantId(null);
        }}
        accountantId={contactAccountantId}
      />

      {/* BOUTON RETOUR HAUT */}
      {showBackToTop && (
        <BackToTopButton
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <ArrowUpwardIcon />
        </BackToTopButton>
      )}
    </Box>
  );
};

export default FinoraLandingPage;
