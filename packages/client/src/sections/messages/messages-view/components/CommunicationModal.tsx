import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

import CustomButton from "../../../../components/common/CustomButton";

type CommunicationModalProps = {
  open: boolean;
  contactName: string;
  onClose: () => void;
  onChooseWhatsApp: () => void;
  onChoosePlatform: () => void;
};

export default function CommunicationModal({
  open,
  contactName,
  onClose,
  onChooseWhatsApp,
  onChoosePlatform,
}: CommunicationModalProps) {
  return (
    <Dialog
      open={open}
      onClose={(_, reason) => {
        if (reason === "backdropClick" || reason === "escapeKeyDown") {
          onClose();
          return;
        }
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "22px",
          p: 0,
          overflow: "hidden",
          boxShadow: "0px 24px 80px rgba(15, 23, 42, 0.18)",
        },
      }}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(17, 24, 39, 0.42)",
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box
          sx={{
            px: 3.5,
            pt: 3,
            pb: 2.6,
            borderBottom: "1px solid #F1F1F1",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#1F2937",
                  lineHeight: 1.3,
                }}
              >
                Choisir un mode de communication
              </Typography>

              <Typography
                sx={{
                  mt: 1,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#6B7280",
                  lineHeight: 1.5,
                }}
              >
                Comment aimeriez-vous discuter avec {contactName} ?
              </Typography>
            </Box>

            <IconButton
              onClick={onClose}
              sx={{
                mt: -0.25,
                mr: -0.5,
                color: "#8C8C8C",
              }}
            >
              <CloseIcon sx={{ fontSize: 22 }} />
            </IconButton>
          </Box>
        </Box>

        <Box
          sx={{
            px: 3.5,
            pt: 3,
            pb: 2.8,
          }}
        >
          <CustomButton
            fullWidth
            onClick={onChooseWhatsApp}
            startIcon={<WhatsAppIcon />}
            sx={{
              mb: 2.4,
              height: 54,
              borderRadius: "12px",
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: "#22C55E",
              color: "#FFFFFF",
              boxShadow: "0px 8px 20px rgba(34,197,94,0.25)",
              "&:hover": {
                backgroundColor: "#16A34A",
              },
              "& .MuiButton-startIcon": {
                marginRight: "10px",
                display: "flex",
                alignItems: "center",
              },
              "& .MuiButton-startIcon svg": {
                fontSize: "30px !important",
              },
            }}
          >
            Chat via WhatsApp
          </CustomButton>

          <CustomButton
            fullWidth
            onClick={onChoosePlatform}
            startIcon={<ChatBubbleOutlineIcon />}
            sx={{
              height: 54,
              borderRadius: "12px",
              fontSize: 15,
              fontWeight: 600,
              backgroundColor: "#1D4ED8",
              color: "#FFFFFF",
              boxShadow: "0px 8px 20px rgba(37,99,235,0.25)",
              "&:hover": {
                backgroundColor: "#1E40AF",
              },
              "& .MuiButton-startIcon": {
                marginRight: "10px",
                display: "flex",
                alignItems: "center",
              },
              "& .MuiButton-startIcon svg": {
                fontSize: "28px !important",
              },
            }}
          >
            Continuer ici sur la plateforme
          </CustomButton>

          <Typography
            sx={{
              mt: 2.3,
              px: 1,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 500,
              color: "#9CA3AF",
              lineHeight: 1.6,
            }}
          >
            L&apos;historique de vos conversations sera enregistré, quelle que
            soit l&apos;option que vous choisissez.
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
