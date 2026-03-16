import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import IconButton from "@mui/material/IconButton";

import type { Message, Conversation } from "../data/types";

type MessageBubbleProps = {
  message: Message;
  conversation?: Conversation;
};

export default function MessageBubble({
  message,
  conversation,
}: MessageBubbleProps) {
  const isFileMessage = message.type === "file" && message.file;

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: message.mine ? "flex-end" : "flex-start",
        mb: 1.6,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          flexDirection: message.mine ? "row-reverse" : "row",
          maxWidth: "100%",
        }}
      >
        {!message.mine && (
          <Avatar
            sx={{
              width: 32,
              height: 32,
              fontSize: 13,
              bgcolor: conversation?.avatarColor,
              color: conversation?.avatarTextColor,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            {conversation?.avatar}
          </Avatar>
        )}

        <Box sx={{ maxWidth: "100%" }}>
          <Paper
            elevation={0}
            sx={{
              py: isFileMessage ? 1.25 : 1.2,
              px: isFileMessage ? 1.4 : 1.6,
              maxWidth: isFileMessage ? 330 : message.large ? 420 : 340,
              borderRadius: message.mine
                ? "18px 18px 6px 18px"
                : "18px 18px 18px 6px",
              backgroundColor: message.mine ? "#2F6BFF" : "#F2F4F7",
              color: message.mine ? "#FFFFFF" : "#344054",
              border: message.mine ? "none" : "1px solid #EAECF0",
            }}
          >
            {isFileMessage ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <InsertDriveFileOutlinedIcon
                  sx={{
                    fontSize: 20,
                    color: message.mine ? "#FFFFFF" : "#2F6BFF",
                    flexShrink: 0,
                  }}
                />

                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 13,
                      fontWeight: 700,
                      lineHeight: 1.3,
                    }}
                  >
                    {message.file?.name}
                  </Typography>

                  <Typography
                    sx={{
                      fontSize: 11.5,
                      opacity: message.mine ? 0.9 : 0.72,
                      mt: 0.2,
                      lineHeight: 1.25,
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
                  sx={{
                    color: message.mine ? "#FFFFFF" : "#2F6BFF",
                    flexShrink: 0,
                    p: 0.45,
                  }}
                >
                  <DownloadOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ) : message.html ? (
              <Box
                sx={{
                  fontSize: 14,
                  lineHeight: 1.5,
                  fontWeight: 500,
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
                    fontSize: 14,
                    lineHeight: 1.5,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    fontWeight: 500,
                    fontFamily:
                      '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji","Segoe UI Symbol",sans-serif',
                  }}
                >
                  {message.text}
                </Typography>
              )
            )}
          </Paper>

          {message.time && (
            <Typography
              sx={{
                display: "block",
                mt: 0.55,
                textAlign: message.mine ? "right" : "left",
                px: 0.5,
                color: "#98A2B3",
                fontSize: 11,
                lineHeight: 1,
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
