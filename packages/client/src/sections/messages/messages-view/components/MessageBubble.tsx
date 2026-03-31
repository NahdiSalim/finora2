import type { MouseEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import PictureAsPdfOutlinedIcon from "@mui/icons-material/PictureAsPdfOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";
import { CheckSquare, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useDashboardBase } from "../../../../hooks/useDashboardBase";

import type { Message, Conversation } from "../data/types";

type MessageBubbleProps = {
  message: Message;
  conversation?: Conversation;
};

type FileCategory = "image" | "pdf" | "doc" | "xls" | "other";

/**
 * Determines the display category of a file.
 *
 * `type` can be:
 *  - a category string set by mapApiMessageToMessage ("image", "pdf", "doc", "xls", "file")
 *  - a MIME type from the local File object for optimistic messages ("image/jpeg", etc.)
 *
 * Filename extension is used as the final fallback.
 */
function detectFileCategory(name: string, type: string): FileCategory {
  const t = type.toLowerCase();

  if (t === "image" || t.startsWith("image/")) return "image";
  if (t === "pdf" || t === "application/pdf") return "pdf";
  if (
    t === "doc" ||
    t.includes("word") ||
    t.includes(".document") ||
    t.includes(".presentation")
  )
    return "doc";
  if (
    t === "xls" ||
    t.includes("sheet") ||
    t.includes("excel") ||
    t.includes(".spreadsheet")
  )
    return "xls";

  // Fallback to filename extension
  const lower = name.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lower)) return "image";
  if (lower.endsWith(".pdf")) return "pdf";
  if (/\.docx?$/.test(lower)) return "doc";
  if (/\.(xlsx?|csv)$/.test(lower)) return "xls";

  return "other";
}

const FILE_CATEGORY_LABELS: Record<FileCategory, string> = {
  image: "Image",
  pdf: "PDF",
  doc: "Document",
  xls: "Tableur",
  other: "Fichier",
};

export default function MessageBubble({
  message,
  conversation,
}: MessageBubbleProps) {
  const theme = useTheme();
  const navigate = useNavigate();
  const dashboardBase = useDashboardBase();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [imageError, setImageError] = useState(false);

  const isFileMessage = message.type === "file" && !!message.file;
  const isRequestMessage = message.type === "request" && !!message.request;
  const isTaskMessage = message.type === "task" && !!message.task;
  const isAppointmentMessage =
    message.type === "appointment" && !!message.appointment;

  const fileCategory: FileCategory = isFileMessage
    ? detectFileCategory(message.file!.name, message.file!.type)
    : "other";

  const isImageFile = isFileMessage && fileCategory === "image";

  const handleOpenFile = () => {
    if (!message.file?.url) return;
    window.open(message.file.url, "_blank", "noopener,noreferrer");
  };

  const handleDownloadFile = async (event: MouseEvent) => {
    event.stopPropagation();
    const url = message.file?.url;
    const name = message.file?.name;
    if (!url || !name) return;
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Icon component and color for non-image file cards
  const FileIconComponent =
    fileCategory === "pdf"
      ? PictureAsPdfOutlinedIcon
      : fileCategory === "doc"
        ? DescriptionOutlinedIcon
        : fileCategory === "xls"
          ? TableChartOutlinedIcon
          : InsertDriveFileOutlinedIcon;

  const fileIconColor = message.mine
    ? theme.palette.common.white
    : fileCategory === "pdf"
      ? "#F04438"
      : fileCategory === "doc"
        ? "#2563EB"
        : fileCategory === "xls"
          ? "#16A34A"
          : theme.palette.primary.main;

  const fileIconBg = message.mine
    ? alpha(theme.palette.common.white, 0.16)
    : fileCategory === "pdf"
      ? alpha("#F04438", 0.1)
      : fileCategory === "doc"
        ? alpha("#2563EB", 0.1)
        : fileCategory === "xls"
          ? alpha("#16A34A", 0.1)
          : theme.palette.primary.lighter;

  // Second line in file card: type label + size (when available)
  const fileSubLabel = [
    FILE_CATEGORY_LABELS[fileCategory],
    message.file?.size || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: message.mine ? "flex-end" : "flex-start",
        mb: isMobile ? 1.5 : 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: isMobile ? 0.75 : 1,
          flexDirection: message.mine ? "row-reverse" : "row",
          maxWidth: "100%",
        }}
      >
        {!message.mine && (
          <Avatar
            sx={{
              width: isMobile ? 28 : 34,
              height: isMobile ? 28 : 34,
              fontSize: isMobile ? 11.5 : 13,
              bgcolor:
                conversation?.isGroup && message.senderAvatar
                  ? alpha(theme.palette.secondary.main, 0.15)
                  : conversation?.avatarColor,
              color:
                conversation?.isGroup && message.senderAvatar
                  ? theme.palette.secondary.main
                  : conversation?.avatarTextColor,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {conversation?.isGroup && message.senderAvatar
              ? message.senderAvatar
              : conversation?.avatar}
          </Avatar>
        )}

        <Box
          sx={{
            maxWidth: "100%",
            display: "flex",
            flexDirection: "column",
            gap: 0.5,
          }}
        >
          {/* Sender name for group messages */}
          {!message.mine && conversation?.isGroup && message.senderName && (
            <Typography
              sx={{
                fontSize: 12,
                fontWeight: 600,
                color: theme.palette.text.secondary,
                ml: 0.5,
              }}
            >
              {message.senderName}
            </Typography>
          )}

          <Box
            sx={{
              maxWidth: "100%",
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 0.75 : 1,
            }}
          >
            {isRequestMessage ? (
              <>
                {/* ── Request bubble ────────────────────────────────────────── */}
                <Box
                  onClick={() =>
                    message.request?.id &&
                    navigate(`${dashboardBase}/requests/${message.request.id}`)
                  }
                  sx={{
                    width: "fit-content",
                    maxWidth: isMobile ? "100%" : 280,
                    borderRadius: isMobile ? "12px" : "14px",
                    backgroundColor: "#EFF6FF",
                    border: "1px solid #DBEAFE",
                    px: isMobile ? 1.25 : 1.5,
                    py: isMobile ? 1 : 1.25,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: theme.shadows[1],
                      borderColor: theme.palette.primary.main,
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 1 : 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: alpha(
                          theme.palette.primary.main,
                          0.08,
                        ),
                        color: theme.palette.primary.main,
                        flexShrink: 0,
                      }}
                    >
                      <DescriptionOutlinedIcon
                        sx={{ fontSize: isMobile ? 18 : 20 }}
                      />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: isMobile ? "13px" : "14px",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: theme.palette.text.primary,
                          wordBreak: "break-word",
                          mb: 0.25,
                        }}
                      >
                        {message.request?.title}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: isMobile ? "11px" : "12px",
                          lineHeight: 1.4,
                          color: theme.palette.text.secondary,
                          fontWeight: 400,
                          wordBreak: "break-word",
                        }}
                      >
                        {message.request?.subtitle}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {message.text && (
                  <Paper
                    elevation={0}
                    sx={{
                      px: isMobile ? 1.25 : 1.5,
                      py: isMobile ? 0.875 : 1,
                      borderRadius: message.mine
                        ? isMobile
                          ? "16px 16px 6px 16px"
                          : "18px 18px 6px 18px"
                        : isMobile
                          ? "16px 16px 16px 6px"
                          : "18px 18px 18px 6px",
                      backgroundColor: message.mine
                        ? theme.palette.primary.main
                        : theme.palette.grey[100],
                      color: message.mine
                        ? theme.palette.common.white
                        : theme.palette.text.primary,
                      wordBreak: "break-word",
                      maxWidth: isMobile ? "100%" : 280,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: isMobile ? "13px" : "14px",
                        lineHeight: isMobile ? "18px" : "20px",
                        fontWeight: 400,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: message.html || message.text,
                      }}
                    />
                  </Paper>
                )}
              </>
            ) : isTaskMessage ? (
              <>
                {/* ── Task bubble ────────────────────────────────────────── */}
                <Box
                  onClick={() =>
                    message.task?.id &&
                    navigate(`${dashboardBase}/tasks/${message.task.id}`)
                  }
                  sx={{
                    width: "fit-content",
                    maxWidth: isMobile ? "100%" : 280,
                    borderRadius: isMobile ? "12px" : "14px",
                    backgroundColor: "#F5F3FF",
                    border: "1px solid #E9D5FF",
                    px: isMobile ? 1.25 : 1.5,
                    py: isMobile ? 1 : 1.25,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: theme.shadows[1],
                      borderColor: "#8B5CF6",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 1 : 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: alpha("#8B5CF6", 0.08),
                        color: "#8B5CF6",
                        flexShrink: 0,
                      }}
                    >
                      <CheckSquare size={isMobile ? 18 : 20} />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: isMobile ? "13px" : "14px",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: theme.palette.text.primary,
                          wordBreak: "break-word",
                          mb: 0.25,
                        }}
                      >
                        {message.task?.title}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: isMobile ? "11px" : "12px",
                          lineHeight: 1.4,
                          color: theme.palette.text.secondary,
                          fontWeight: 400,
                          wordBreak: "break-word",
                        }}
                      >
                        Tâche
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                {message.text && (
                  <Paper
                    elevation={0}
                    sx={{
                      px: isMobile ? 1.25 : 1.5,
                      py: isMobile ? 0.875 : 1,
                      borderRadius: message.mine
                        ? isMobile
                          ? "16px 16px 6px 16px"
                          : "18px 18px 6px 18px"
                        : isMobile
                          ? "16px 16px 16px 6px"
                          : "18px 18px 18px 6px",
                      backgroundColor: message.mine
                        ? theme.palette.primary.main
                        : theme.palette.grey[100],
                      color: message.mine
                        ? theme.palette.common.white
                        : theme.palette.text.primary,
                      wordBreak: "break-word",
                      maxWidth: isMobile ? "100%" : 280,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: isMobile ? "13px" : "14px",
                        lineHeight: isMobile ? "18px" : "20px",
                        fontWeight: 400,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: message.html || message.text,
                      }}
                    />
                  </Paper>
                )}
              </>
            ) : isAppointmentMessage ? (
              <>
                {/* ── Appointment bubble ────────────────────────────────────────── */}
                <Box
                  onClick={() =>
                    message.appointment?.id &&
                    navigate(
                      `${dashboardBase}/meetings/${message.appointment.id}`,
                    )
                  }
                  sx={{
                    width: "fit-content",
                    maxWidth: isMobile ? "100%" : 280,
                    borderRadius: isMobile ? "12px" : "14px",
                    backgroundColor: "#ECFDF5",
                    border: "1px solid #D1FAE5",
                    px: isMobile ? 1.25 : 1.5,
                    py: isMobile ? 1 : 1.25,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    "&:hover": {
                      boxShadow: theme.shadows[1],
                      borderColor: "#10B981",
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 1 : 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        width: isMobile ? 36 : 40,
                        height: isMobile ? 36 : 40,
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: alpha("#10B981", 0.08),
                        color: "#10B981",
                        flexShrink: 0,
                      }}
                    >
                      <Calendar size={isMobile ? 18 : 20} />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        sx={{
                          fontSize: isMobile ? "13px" : "14px",
                          fontWeight: 600,
                          lineHeight: 1.4,
                          color: theme.palette.text.primary,
                          wordBreak: "break-word",
                          mb: 0.25,
                        }}
                      >
                        {message.appointment?.title}
                      </Typography>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Clock
                          size={isMobile ? 12 : 13}
                          color={theme.palette.text.secondary}
                        />
                        <Typography
                          sx={{
                            fontSize: isMobile ? "11px" : "12px",
                            lineHeight: 1.4,
                            color: theme.palette.text.secondary,
                            fontWeight: 400,
                          }}
                        >
                          {message.appointment?.startTime &&
                            format(
                              new Date(message.appointment.startTime),
                              "dd MMM yyyy • HH:mm",
                              { locale: fr },
                            )}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                </Box>
                {message.text && (
                  <Paper
                    elevation={0}
                    sx={{
                      px: isMobile ? 1.25 : 1.5,
                      py: isMobile ? 0.875 : 1,
                      borderRadius: message.mine
                        ? isMobile
                          ? "16px 16px 6px 16px"
                          : "18px 18px 6px 18px"
                        : isMobile
                          ? "16px 16px 16px 6px"
                          : "18px 18px 18px 6px",
                      backgroundColor: message.mine
                        ? theme.palette.primary.main
                        : theme.palette.grey[100],
                      color: message.mine
                        ? theme.palette.common.white
                        : theme.palette.text.primary,
                      wordBreak: "break-word",
                      maxWidth: isMobile ? "100%" : 280,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: isMobile ? "13px" : "14px",
                        lineHeight: isMobile ? "18px" : "20px",
                        fontWeight: 400,
                      }}
                      dangerouslySetInnerHTML={{
                        __html: message.html || message.text,
                      }}
                    />
                  </Paper>
                )}
              </>
            ) : isImageFile ? (
              // ── Image thumbnail bubble ──────────────────────────────────
              <Box
                sx={{
                  position: "relative",
                  width: "fit-content",
                  maxWidth: isMobile ? 200 : 280,
                  borderRadius: message.mine
                    ? isMobile
                      ? "16px 16px 6px 16px"
                      : "18px 18px 6px 18px"
                    : isMobile
                      ? "16px 16px 16px 6px"
                      : "18px 18px 18px 6px",
                  overflow: "hidden",
                  cursor: "pointer",
                  backgroundColor: "#D1D5DB",
                  border: `1px solid ${message.mine ? "transparent" : theme.palette.grey[300]}`,
                }}
                onClick={handleOpenFile}
              >
                {!imageError && message.file!.url ? (
                  <Box
                    component="img"
                    src={message.file!.url}
                    alt={message.file!.name}
                    onError={() => setImageError(true)}
                    sx={{
                      display: "block",
                      width: "100%",
                      maxHeight: isMobile ? 180 : 220,
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <Box
                    sx={{
                      width: isMobile ? 160 : 220,
                      height: isMobile ? 100 : 140,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.75,
                    }}
                  >
                    <ImageOutlinedIcon
                      sx={{ fontSize: 28, color: "#94A3B8" }}
                    />
                    <Typography
                      sx={{ fontSize: isMobile ? 10 : 11, color: "#94A3B8" }}
                    >
                      Image non disponible
                    </Typography>
                  </Box>
                )}

                {/* Semi-transparent footer: filename + download */}
                <Box
                  sx={{
                    px: isMobile ? 1 : 1.25,
                    py: isMobile ? 0.5 : 0.625,
                    backgroundColor: "rgba(0,0,0,0.38)",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Typography
                    noWrap
                    sx={{
                      flex: 1,
                      fontSize: isMobile ? 10 : 11,
                      fontWeight: 500,
                      color: "#FFFFFF",
                      lineHeight: 1.3,
                    }}
                  >
                    {message.file!.name}
                  </Typography>

                  <IconButton
                    size="small"
                    onClick={handleDownloadFile}
                    sx={{ color: "#FFFFFF", p: 0.25, flexShrink: 0 }}
                  >
                    <DownloadOutlinedIcon
                      sx={{ fontSize: isMobile ? 13 : 14 }}
                    />
                  </IconButton>
                </Box>
              </Box>
            ) : (
              // ── Text / non-image file bubble ────────────────────────────
              <Paper
                elevation={0}
                sx={{
                  py: isFileMessage
                    ? isMobile
                      ? "10px"
                      : "12px"
                    : isMobile
                      ? "8px"
                      : "10px",
                  px: isFileMessage
                    ? isMobile
                      ? "12px"
                      : "14px"
                    : isMobile
                      ? "12px"
                      : "16px",
                  maxWidth: isFileMessage
                    ? isMobile
                      ? 260
                      : 340
                    : message.large
                      ? isMobile
                        ? 280
                        : 430
                      : isMobile
                        ? 250
                        : 360,
                  borderRadius: message.mine
                    ? isMobile
                      ? "16px 16px 6px 16px"
                      : "18px 18px 6px 18px"
                    : isMobile
                      ? "16px 16px 16px 6px"
                      : "18px 18px 18px 6px",
                  backgroundColor: message.mine
                    ? theme.palette.primary.main
                    : theme.palette.info.lighter,
                  color: message.mine
                    ? theme.palette.primary.contrastText
                    : (theme.palette.grey as any)[1000],
                  border: message.mine
                    ? "none"
                    : `1px solid ${theme.palette.grey[300]}`,
                  boxShadow: "none",
                  cursor: isFileMessage ? "pointer" : "default",
                }}
                onClick={isFileMessage ? handleOpenFile : undefined}
              >
                {isFileMessage ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: isMobile ? 1 : 1.25,
                    }}
                  >
                    <Box
                      sx={{
                        width: isMobile ? 32 : 36,
                        height: isMobile ? 32 : 36,
                        borderRadius: isMobile ? "8px" : "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: fileIconBg,
                        flexShrink: 0,
                      }}
                    >
                      <FileIconComponent
                        sx={{
                          fontSize: isMobile ? 18 : 20,
                          color: fileIconColor,
                        }}
                      />
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        noWrap
                        sx={{
                          fontSize: isMobile ? "12px" : "13px",
                          fontWeight: 600,
                          lineHeight: isMobile ? "17px" : "18px",
                          color: "inherit",
                        }}
                      >
                        {message.file?.name}
                      </Typography>

                      <Typography
                        sx={{
                          mt: 0.25,
                          fontSize: isMobile ? "10px" : "11px",
                          lineHeight: isMobile ? "14px" : "16px",
                          color: message.mine
                            ? alpha(theme.palette.common.white, 0.78)
                            : theme.palette.info.light,
                        }}
                      >
                        {fileSubLabel}
                      </Typography>
                    </Box>

                    <IconButton
                      size="small"
                      onClick={handleDownloadFile}
                      sx={{
                        color: message.mine
                          ? theme.palette.common.white
                          : theme.palette.primary.main,
                        flexShrink: 0,
                        p: 0.5,
                      }}
                    >
                      <DownloadOutlinedIcon
                        sx={{ fontSize: isMobile ? 15 : 16 }}
                      />
                    </IconButton>
                  </Box>
                ) : message.html ? (
                  <Box
                    sx={{
                      fontSize: isMobile ? "13px" : "14px",
                      lineHeight: isMobile ? "20px" : "22px",
                      fontWeight: 400,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      "& img[data-flag-image]": {
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        objectFit: "cover",
                        verticalAlign: "middle",
                        display: "inline-block",
                      },
                      "& span[data-flag-code]": {
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 18,
                        height: 18,
                        margin: "0 2px",
                        verticalAlign: "middle",
                      },
                    }}
                    dangerouslySetInnerHTML={{ __html: message.html }}
                  />
                ) : (
                  !!message.text && (
                    <Typography
                      sx={{
                        fontSize: isMobile ? "13px" : "14px",
                        lineHeight: isMobile ? "20px" : "22px",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                        fontWeight: 400,
                        color: "inherit",
                        fontFamily:
                          '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif',
                      }}
                    >
                      {message.text}
                    </Typography>
                  )
                )}
              </Paper>
            )}

            {message.time && (
              <Typography
                sx={{
                  display: "block",
                  mt: isMobile ? "5px" : "6px",
                  textAlign: message.mine ? "right" : "left",
                  px: "4px",
                  color: theme.palette.info.light,
                  fontSize: isMobile ? "10px" : "11px",
                  fontWeight: 400,
                  lineHeight: isMobile ? "14px" : "16px",
                }}
              >
                {message.time}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
