import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, Typography, Button, Link } from "@mui/material";
import Lottie from "lottie-react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";

import emailAnimation from "../../../../public/assets/Animations/email-successfully-sent.json";
import { useRouter } from "src/routes/hooks";
import { useForgotPasswordMutation } from "src/lib/services/authApi";
import { useAlert } from "src/contexts/AlertContext";
import DotSpinner from "src/components/common/DotSpinner";

export function CheckEmailView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email");

  const [resendEmail, { isLoading }] = useForgotPasswordMutation();

  // 🔎 Detect provider
  const provider = useMemo(() => {
    if (!email) return null;

    const domain = email.split("@")[1];

    const providers: Record<string, { name: string; url: string }> = {
      "gmail.com": {
        name: "Gmail",
        url: "https://mail.google.com",
      },
      "yahoo.com": {
        name: "Yahoo Mail",
        url: "https://mail.yahoo.com",
      },
      "outlook.com": {
        name: "Outlook",
        url: "https://outlook.live.com",
      },
      "hotmail.com": {
        name: "Outlook",
        url: "https://outlook.live.com",
      },
      "live.com": {
        name: "Outlook",
        url: "https://outlook.live.com",
      },
    };

    return providers[domain] || null;
  }, [email]);

  const handleResend = async () => {
    if (!email) return;

    try {
      await resendEmail({ email }).unwrap();
      showAlert("Email renvoyé avec succès", "success");
    } catch {
      showAlert(`Erreur lors de l'envoi`);
    }
  };

  const openEmailApp = () => {
    if (email) {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <Box
      sx={{
        maxWidth: 400,
        mx: "auto",
        textAlign: "center",
      }}
    >
      {/* LOTTIE */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Lottie
          animationData={emailAnimation}
          loop={false}
          style={{ width: 200, height: 200 }}
        />
      </Box>

      {/* TITLE */}
      <Typography
        sx={{
          fontSize: 28,
          fontWeight: 700,
          mt: 2,
        }}
      >
        Vérifiez votre email
      </Typography>

      <Typography
        sx={{
          color: "#6B7280",
          fontSize: 14,
          mt: 1,
        }}
      >
        Nous avons envoyé un lien de vérification à
      </Typography>

      <Typography
        sx={{
          fontWeight: 600,
          fontSize: 14,
          mt: 1,
        }}
      >
        {email}
      </Typography>

      {/* BUTTONS */}
      <Box sx={{ mt: 4, display: "flex", flexDirection: "column", gap: 2 }}>
        {provider ? (
          <Button
            fullWidth
            variant="contained"
            href={provider.url}
            target="_blank"
            endIcon={<OpenInNewIcon />}
            sx={{
              height: 48,
              borderRadius: 3,
              textTransform: "none",
            }}
          >
            Aller à {provider.name}
          </Button>
        ) : (
          <Button
            fullWidth
            variant="contained"
            onClick={openEmailApp}
            endIcon={<OpenInNewIcon />}
            sx={{
              height: 48,
              borderRadius: 3,
              textTransform: "none",
            }}
          >
            Ouvrir l&apos;application de messagerie
          </Button>
        )}

        {/* RESEND */}
        <Typography sx={{ fontSize: 13 }}>
          Vous n&apos;avez pas reçu l&apos;email ?{" "}
          <Link
            onClick={handleResend}
            sx={{
              cursor: "pointer",
              color: "#2563EB",
              fontWeight: 500,
            }}
          >
            {isLoading ? <DotSpinner size={16} /> : "Cliquez pour le renvoyer"}
          </Link>
        </Typography>

        {/* BACK */}
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push("/sign-in")}
          sx={{
            height: 48,
            borderRadius: 3,
            textTransform: "none",
          }}
        >
          Retour à la connexion
        </Button>
      </Box>
    </Box>
  );
}
