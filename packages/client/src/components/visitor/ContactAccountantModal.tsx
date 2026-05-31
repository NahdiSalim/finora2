import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  IconButton,
  Stack,
} from "@mui/material";
import { X } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import CustomInput from "src/components/common/CustomInput";
import { useSendContactMessageMutation } from "src/lib/services/contactApi";

const DEFAULT_SUBJECT = "Demande de contact via le site";

export type ContactAccountantModalProps = {
  open: boolean;
  onClose: () => void;
  accountantId: number | null;
};

export function ContactAccountantModal({
  open,
  onClose,
  accountantId,
}: ContactAccountantModalProps) {
  const [visitorName, setVisitorName] = useState("");
  const [visitorEmail, setVisitorEmail] = useState("");
  const [visitorPhone, setVisitorPhone] = useState("");
  const [visitorCompany, setVisitorCompany] = useState("");
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [message, setMessage] = useState("");
  const [sendContactMessage, { isLoading, isError }] =
    useSendContactMessageMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accountantId == null) return;
    try {
      await sendContactMessage({
        accountantId,
        body: {
          visitorName,
          visitorEmail,
          visitorPhone: visitorPhone || undefined,
          visitorCompany: visitorCompany || undefined,
          subject,
          message,
        },
      }).unwrap();
      setVisitorName("");
      setVisitorEmail("");
      setVisitorPhone("");
      setVisitorCompany("");
      setSubject(DEFAULT_SUBJECT);
      setMessage("");
      onClose();
    } catch {
      // Error handled by isError
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setVisitorName("");
      setVisitorEmail("");
      setVisitorPhone("");
      setVisitorCompany("");
      setSubject(DEFAULT_SUBJECT);
      setMessage("");
      onClose();
    }
  };

  const valid =
    accountantId != null &&
    visitorName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(visitorEmail.trim()) &&
    subject.trim().length >= 5 &&
    message.trim().length >= 10;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, p: 0 },
      }}
    >
      <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Prendre contact avec un comptable
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Envoyez votre demande et démarrez une collaboration.
            </Typography>
          </Box>
          <IconButton size="small" onClick={handleClose} aria-label="Fermer">
            <X size={20} />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: 3, pb: 3, pt: 2 }}>
        <form onSubmit={handleSubmit}>
          <Stack spacing={2}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <CustomInput
                label="Nom et prénom"
                required
                fullWidth
                value={visitorName}
                onChange={(e) => setVisitorName(e.target.value)}
                placeholder="Attijari"
                inputProps={{ minLength: 2, maxLength: 100 }}
              />
              <CustomInput
                label="Adresse email"
                type="email"
                required
                fullWidth
                value={visitorEmail}
                onChange={(e) => setVisitorEmail(e.target.value)}
                placeholder="votre@email.com"
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2,
              }}
            >
              <CustomInput
                label="Téléphone"
                fullWidth
                value={visitorPhone}
                onChange={(e) => setVisitorPhone(e.target.value)}
                placeholder="+216 ..."
              />
              <CustomInput
                label="Nom de l’entreprise"
                fullWidth
                value={visitorCompany}
                onChange={(e) => setVisitorCompany(e.target.value)}
                placeholder="Nom de votre société"
              />
            </Box>

            <CustomInput
              label="Sujet"
              required
              fullWidth
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={DEFAULT_SUBJECT}
              inputProps={{ minLength: 5, maxLength: 200 }}
            />

            <CustomInput
              label="Contenu"
              required
              fullWidth
              multiline
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Décrivez brièvement votre besoin..."
              inputProps={{ minLength: 10, maxLength: 2000 }}
            />
            {isError && (
              <Typography variant="body2" color="error">
                L&apos;envoi a échoué. Veuillez réessayer.
              </Typography>
            )}
            <Stack
              direction="row"
              spacing={1}
              justifyContent="flex-end"
              sx={{ pt: 1 }}
            >
              <CustomButton
                variant="outlined"
                onClick={handleClose}
                disabled={isLoading}
              >
                Annuler
              </CustomButton>
              <CustomButton
                type="submit"
                variant="contained"
                disabled={!valid || isLoading}
              >
                Envoyer
              </CustomButton>
            </Stack>
          </Stack>
        </form>
      </DialogContent>
    </Dialog>
  );
}
