import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";

import type { Message, Conversation } from "../data/types";

type MessageBubbleProps = {
  message: Message;
  conversation?: Conversation;
};

export default function MessageBubble({
  message,
  conversation,
}: MessageBubbleProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const isFileMessage = message.type === "file" && !!message.file;
  const isRequestMessage = message.type === "request" && !!message.request;

  const handleOpenFile = () => {
    if (!message.file?.url) return;
    window.open(message.file.url, "_blank", "noopener,noreferrer");
  };

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
              bgcolor: conversation?.avatarColor,
              color: conversation?.avatarTextColor,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {conversation?.avatar}
          </Avatar>
        )}

        <Box
          sx={{
            maxWidth: "100%",
          }}
        >
          {isRequestMessage ? (
            <Box
              sx={{
                width: "fit-content",
                maxWidth: isMobile ? 220 : 250,
                borderRadius: isMobile ? "14px" : "16px",
                backgroundColor: theme.palette.primary.lighter,
                border: `1px solid ${theme.palette.primary.lighter}`,
                px: isMobile ? "10px" : "12px",
                py: isMobile ? "9px" : "10px",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: isMobile ? 0.875 : 1,
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
                    backgroundColor: theme.palette.common.white,
                    color: theme.palette.primary.main,
                    flexShrink: 0,
                  }}
                >
                  <DescriptionOutlinedIcon
                    sx={{ fontSize: isMobile ? 16 : 18 }}
                  />
                </Box>

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                      minWidth: 0,
                    }}
                  >
                    <LinkOutlinedIcon
                      sx={{
                        fontSize: isMobile ? 12 : 13,
                        color: theme.palette.primary.main,
                        flexShrink: 0,
                      }}
                    />

                    <Typography
                      sx={{
                        fontSize: isMobile ? "11.5px" : "12px",
                        fontWeight: 700,
                        lineHeight: isMobile ? "16px" : "17px",
                        color: (theme.palette.grey as any)[1000],
                        wordBreak: "break-word",
                      }}
                    >
                      {message.request?.title}
                    </Typography>
                  </Box>

                  <Typography
                    sx={{
                      mt: 0.3,
                      fontSize: isMobile ? "10px" : "11px",
                      lineHeight: isMobile ? "14px" : "15px",
                      color: theme.palette.info.main,
                      fontWeight: 400,
                      wordBreak: "break-word",
                    }}
                  >
                    {message.request?.subtitle}
                  </Typography>
                </Box>
              </Box>
            </Box>
          ) : (
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
                      backgroundColor: message.mine
                        ? alpha(theme.palette.common.white, 0.16)
                        : theme.palette.primary.lighter,
                      flexShrink: 0,
                    }}
                  >
                    <InsertDriveFileOutlinedIcon
                      sx={{
                        fontSize: isMobile ? 18 : 20,
                        color: message.mine
                          ? theme.palette.common.white
                          : theme.palette.primary.main,
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
                          ? alpha(theme.palette.common.white, 0.88)
                          : theme.palette.info.light,
                      }}
                    >
                      {message.file?.size}
                    </Typography>
                  </Box>

                  <IconButton
                    size="small"
                    component="a"
                    href={message.file?.url}
                    download={message.file?.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(event) => event.stopPropagation()}
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
  );
}
