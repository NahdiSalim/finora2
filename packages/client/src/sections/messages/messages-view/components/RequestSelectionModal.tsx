import Box from "@mui/material/Box";
import Dialog from "@mui/material/Dialog";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import useMediaQuery from "@mui/material/useMediaQuery";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import { useTheme } from "@mui/material/styles";

import type { MessageRequest } from "../data/types";

type RequestSelectionModalProps = {
  open: boolean;
  onClose: () => void;
  requests: MessageRequest[];
  onAdd: (request: MessageRequest) => void;
};

export default function RequestSelectionModal({
  open,
  onClose,
  requests,
  onAdd,
}: RequestSelectionModalProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      fullScreen={false}
      BackdropProps={{
        sx: {
          backgroundColor: "rgba(16, 24, 40, 0.36)",
        },
      }}
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: isMobile ? "calc(100% - 24px)" : "448px",
          maxHeight: isMobile ? "72dvh" : "calc(100dvh - 64px)",
          borderRadius: isMobile ? "18px" : "20px",
          overflow: "hidden",
          backgroundColor: theme.palette.common.white,
          boxShadow: "0px 20px 48px rgba(16, 24, 40, 0.18)",
          m: isMobile ? 0 : 2,
          transform: isMobile ? "none" : "translateY(-24px)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          px: isMobile ? "12px" : "14px",
          pt: isMobile ? "14px" : "14px",
          pb: isMobile ? "12px" : "10px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 2,
            mb: isMobile ? "10px" : "10px",
            flexShrink: 0,
          }}
        >
          <Box sx={{ pr: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: isMobile ? "15px" : "16px",
                lineHeight: isMobile ? "22px" : "24px",
                fontWeight: 700,
                color: (theme.palette.grey as any)[1000],
              }}
            >
              Sélectionner une demande
            </Typography>

            <Typography
              sx={{
                mt: "4px",
                fontSize: isMobile ? "10px" : "12px",
                lineHeight: isMobile ? "15px" : "18px",
                fontWeight: 400,
                color: theme.palette.info.light,
                whiteSpace: "nowrap",
              }}
            >
              Choisissez une demande à joindre dans la conversation
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            sx={{
              mt: "-2px",
              mr: "-4px",
              color: theme.palette.info.light,
              width: 28,
              height: 28,
              flexShrink: 0,
            }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            maxHeight: isMobile ? "34dvh" : "320px",
            overflowY: "scroll",
            overflowX: "hidden",
            pr: "4px",
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "8px" : "6px",
            scrollbarWidth: "thin",
            scrollbarColor: `${theme.palette.info.lighter} transparent`,
            "&::-webkit-scrollbar": {
              width: 6,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: theme.palette.info.lighter,
              borderRadius: "999px",
            },
            "&::-webkit-scrollbar-track": {
              backgroundColor: "transparent",
            },
          }}
        >
          {requests.map((request) => (
            <Box
              key={request.id}
              onClick={() => onAdd(request)}
              sx={{
                border: "1px solid",
                borderColor: "#E6EAF2",
                borderRadius: isMobile ? "12px" : "14px",
                px: isMobile ? "10px" : "12px",
                py: isMobile ? "10px" : "10px",
                minHeight: isMobile ? 66 : 68,
                display: "flex",
                alignItems: "center",
                gap: isMobile ? "10px" : "12px",
                cursor: "pointer",
                backgroundColor: theme.palette.common.white,
                transition: "all 0.15s ease",
                "&:hover": {
                  borderColor: theme.palette.primary.light,
                  backgroundColor: "#F8FBFF",
                },
              }}
            >
              <Box
                sx={{
                  width: isMobile ? 32 : 36,
                  height: isMobile ? 32 : 36,
                  minWidth: isMobile ? 32 : 36,
                  borderRadius: isMobile ? "8px" : "10px",
                  backgroundColor: theme.palette.primary.lighter,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: theme.palette.primary.main,
                  flexShrink: 0,
                }}
              >
                <DescriptionOutlinedIcon
                  sx={{ fontSize: isMobile ? 16 : 18 }}
                />
              </Box>

              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontSize: isMobile ? "12px" : "13px",
                    lineHeight: "18px",
                    fontWeight: 700,
                    color: (theme.palette.grey as any)[1000],
                    whiteSpace: "nowrap",
                    overflow: "visible",
                    textOverflow: "clip",
                  }}
                >
                  {request.title}
                </Typography>

                <Box
                  sx={{
                    mt: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    minWidth: 0,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      minWidth: 0,
                      flex: 1,
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: isMobile ? "9.5px" : "11px",
                        lineHeight: "16px",
                        fontWeight: 400,
                        color: theme.palette.info.light,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                      }}
                    >
                      {request.subtitle}
                    </Typography>

                    {request.dateLabel && (
                      <Typography
                        component="span"
                        sx={{
                          fontSize: isMobile ? "9.5px" : "11px",
                          lineHeight: "16px",
                          fontWeight: 400,
                          color: theme.palette.info.light,
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {request.dateLabel}
                      </Typography>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      flexWrap: "nowrap",
                      justifyContent: "flex-end",
                      flexShrink: 0,
                      minWidth: isMobile ? 94 : "auto",
                    }}
                  >
                    {request.status && (
                      <Chip
                        label={request.status}
                        size="small"
                        sx={{
                          height: isMobile ? 22 : 24,
                          borderRadius: "9px",
                          backgroundColor: "#F4F3FF",
                          color: "#7A5AF8",
                          fontSize: isMobile ? "7.5px" : "10px",
                          fontWeight: 600,
                          flexShrink: 0,
                          "& .MuiChip-label": {
                            px: isMobile ? "5px" : "8px",
                          },
                        }}
                      />
                    )}

                    {request.urgency && (
                      <Chip
                        label={request.urgency}
                        size="small"
                        sx={{
                          height: isMobile ? 22 : 24,
                          borderRadius: "9px",
                          backgroundColor: theme.palette.error.lighter,
                          color: theme.palette.error.main,
                          fontSize: isMobile ? "7.5px" : "10px",
                          fontWeight: 600,
                          flexShrink: 0,
                          "& .MuiChip-label": {
                            px: isMobile ? "5px" : "8px",
                          },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    </Dialog>
  );
}
