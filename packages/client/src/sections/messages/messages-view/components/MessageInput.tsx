import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Popover from "@mui/material/Popover";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import InsertEmoticonOutlinedIcon from "@mui/icons-material/InsertEmoticonOutlined";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import { CheckSquare, Calendar } from "lucide-react";
import type { EmojiClickData } from "emoji-picker-react";
import EmojiPicker, { Theme } from "emoji-picker-react";

import CustomButton from "../../../../components/common/CustomButton";
import MessageAttachmentButton from "../components/MessageAttachmentButton";
import RequestSelectionModal from "../components/RequestSelectionModal";
import TaskSelectionModal from "../components/TaskSelectionModal";
import AppointmentSelectionModal from "../components/AppointmentSelectionModal";
import type {
  MessageRequest,
  MessageTask,
  MessageAppointment,
} from "../data/types";

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (
    text: string,
    file?: File,
    request?: MessageRequest,
    task?: MessageTask,
    appointment?: MessageAppointment,
  ) => void;
  requests: MessageRequest[];
  disabled?: boolean;
  recipientType?: "client" | "collaborator" | null;
  recipientId?: number | null;
  onFocus?: () => void;
};

const FLAG_SPAN_CLASS = "finora-flag-chip";

function isFlagEmoji(emoji: string) {
  const codePoints = Array.from(emoji).map((char) => char.codePointAt(0) || 0);

  return (
    codePoints.length === 2 &&
    codePoints.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)
  );
}

function flagEmojiToCountryCode(emoji: string) {
  const chars = Array.from(emoji);
  if (chars.length !== 2) return null;

  const letters = chars.map((char) => {
    const cp = char.codePointAt(0);
    if (!cp) return "";
    return String.fromCharCode(cp - 0x1f1e6 + 65);
  });

  return letters.join("").toLowerCase();
}

function getFlagImageUrl(countryCode: string) {
  return `https://flagcdn.com/w40/${countryCode}.png`;
}

function getEditorPlainText(html: string) {
  if (!html) return "";
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent || "").replace(/\u00a0/g, " ").trim();
}

function hasFlagNode(html: string) {
  return html.includes('data-flag-code="');
}

export default function MessageInput({
  value,
  onChange,
  onSend,
  requests,
  disabled = false,
  recipientType,
  recipientId,
  onFocus,
}: MessageInputProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<MessageRequest | null>(
    null,
  );
  const [selectedTask, setSelectedTask] = useState<MessageTask | null>(null);
  const [selectedAppointment, setSelectedAppointment] =
    useState<MessageAppointment | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const [openRequestModal, setOpenRequestModal] = useState(false);
  const [openTaskModal, setOpenTaskModal] = useState(false);
  const [openAppointmentModal, setOpenAppointmentModal] = useState(false);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const hasContent = useMemo(() => {
    return (
      !!getEditorPlainText(value) ||
      hasFlagNode(value) ||
      !!selectedFile ||
      !!selectedRequest ||
      !!selectedTask ||
      !!selectedAppointment
    );
  }, [value, selectedFile, selectedRequest, selectedTask, selectedAppointment]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (editor.innerHTML !== value) {
      editor.innerHTML = value || "";
    }
  }, [value]);

  useEffect(() => {
    if (disabled) {
      setEmojiAnchorEl(null);
      setOpenRequestModal(false);
    }
  }, [disabled]);

  const syncValueFromEditor = () => {
    const editor = editorRef.current;
    if (!editor) return;
    onChange(editor.innerHTML);
  };

  const resetEditor = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
    }
    onChange("");
  };

  const focusEditor = () => {
    if (disabled) return;
    editorRef.current?.focus();
  };

  const placeCaretAfterNode = (node: Node) => {
    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.setStartAfter(node);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);
  };

  const insertTextAtCursor = (text: string) => {
    if (disabled) return;

    const editor = editorRef.current;
    if (!editor) return;

    focusEditor();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.appendChild(document.createTextNode(text));
      syncValueFromEditor();
      focusEditor();
      return;
    }

    const range = selection.getRangeAt(0);
    range.deleteContents();

    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    placeCaretAfterNode(textNode);
    syncValueFromEditor();
    focusEditor();
  };

  const insertFlagAtCursor = (emoji: string) => {
    if (disabled) return;

    const editor = editorRef.current;
    if (!editor) return;

    const countryCode = flagEmojiToCountryCode(emoji);
    if (!countryCode) {
      insertTextAtCursor(emoji);
      return;
    }

    focusEditor();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      editor.appendChild(document.createTextNode(" "));
    }

    const activeSelection = window.getSelection();
    if (!activeSelection || activeSelection.rangeCount === 0) return;

    const range = activeSelection.getRangeAt(0);
    range.deleteContents();

    const span = document.createElement("span");
    span.className = FLAG_SPAN_CLASS;
    span.setAttribute("data-flag-code", countryCode);
    span.setAttribute("contenteditable", "false");
    span.style.display = "inline-flex";
    span.style.alignItems = "center";
    span.style.justifyContent = "center";
    span.style.width = "18px";
    span.style.height = "18px";
    span.style.margin = "0 2px";
    span.style.verticalAlign = "middle";

    const img = document.createElement("img");
    img.src = getFlagImageUrl(countryCode);
    img.alt = emoji;
    img.width = 18;
    img.height = 18;
    img.style.borderRadius = "50%";
    img.setAttribute("data-flag-image", "true");

    span.appendChild(img);

    const spacer = document.createTextNode("\u00A0");

    range.insertNode(spacer);
    range.insertNode(span);

    placeCaretAfterNode(spacer);
    syncValueFromEditor();
    focusEditor();
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    if (disabled) return;

    const emoji = emojiData.emoji;

    if (isFlagEmoji(emoji)) {
      insertFlagAtCursor(emoji);
    } else {
      insertTextAtCursor(emoji);
    }

    setEmojiAnchorEl(null);
  };

  const handleSend = () => {
    if (disabled) return;

    const hasAttachments =
      selectedFile || selectedRequest || selectedTask || selectedAppointment;
    const plainText = getEditorPlainText(value);
    const hasText = plainText || hasFlagNode(value);

    if (!hasAttachments && !hasText) return;

    onSend(
      value,
      selectedFile || undefined,
      selectedRequest || undefined,
      selectedTask || undefined,
      selectedAppointment || undefined,
    );

    setSelectedFile(null);
    setSelectedRequest(null);
    setSelectedTask(null);
    setSelectedAppointment(null);
    resetEditor();
  };

  const handleEditorInput = () => {
    if (disabled) {
      if (editorRef.current) {
        editorRef.current.innerHTML = value || "";
      }
      return;
    }

    syncValueFromEditor();
  };

  const handleEditorKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  return (
    <Box sx={{ width: "100%" }}>
      {selectedRequest && (
        <Box
          sx={{
            mb: isMobile ? 1 : 1.25,
            px: isMobile ? 1.25 : 1.5,
            py: isMobile ? 0.875 : 1,
            border: "1px solid",
            borderColor: theme.palette.primary.lighter,
            borderRadius: isMobile ? "10px" : "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? 1 : 1.25,
            backgroundColor: theme.palette.primary.lighter,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 1 : 1.25,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              sx={{
                width: isMobile ? 34 : 40,
                height: isMobile ? 34 : 40,
                minWidth: isMobile ? 34 : 40,
                borderRadius: isMobile ? "8px" : "10px",
                backgroundColor: theme.palette.common.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.palette.primary.main,
              }}
            >
              <DescriptionOutlinedIcon sx={{ fontSize: isMobile ? 18 : 20 }} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
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
                    fontSize: 14,
                    color: theme.palette.primary.main,
                    flexShrink: 0,
                  }}
                />

                <Typography
                  noWrap
                  sx={{
                    fontSize: isMobile ? 12.5 : 13,
                    fontWeight: 700,
                    lineHeight: "18px",
                    color: (theme.palette.grey as any)[1000],
                  }}
                >
                  {selectedRequest.title}
                </Typography>
              </Box>

              <Typography
                noWrap
                sx={{
                  mt: 0.25,
                  fontSize: isMobile ? 10.5 : 11,
                  fontWeight: 400,
                  lineHeight: "16px",
                  color: theme.palette.info.main,
                }}
              >
                {selectedRequest.subtitle}
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={() => setSelectedRequest(null)}
            sx={{
              color: theme.palette.error.main,
              flexShrink: 0,
              p: 0.5,
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {selectedTask && (
        <Box
          sx={{
            mb: isMobile ? 1 : 1.25,
            px: isMobile ? 1.25 : 1.5,
            py: isMobile ? 0.875 : 1,
            border: "1px solid",
            borderColor: "#8B5CF6",
            borderRadius: isMobile ? "10px" : "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? 1 : 1.25,
            backgroundColor: "#F5F3FF",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 1 : 1.25,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              sx={{
                width: isMobile ? 34 : 40,
                height: isMobile ? 34 : 40,
                minWidth: isMobile ? 34 : 40,
                borderRadius: isMobile ? "8px" : "10px",
                backgroundColor: theme.palette.common.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#8B5CF6",
              }}
            >
              <CheckSquare size={isMobile ? 18 : 20} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
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
                    fontSize: 14,
                    color: "#8B5CF6",
                    flexShrink: 0,
                  }}
                />

                <Typography
                  noWrap
                  sx={{
                    fontSize: isMobile ? 12.5 : 13,
                    fontWeight: 700,
                    lineHeight: "18px",
                    color: (theme.palette.grey as any)[1000],
                  }}
                >
                  {selectedTask.title}
                </Typography>
              </Box>

              <Typography
                noWrap
                sx={{
                  mt: 0.25,
                  fontSize: isMobile ? 10.5 : 11,
                  fontWeight: 400,
                  lineHeight: "16px",
                  color: theme.palette.info.main,
                }}
              >
                Tâche
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={() => setSelectedTask(null)}
            sx={{
              color: theme.palette.error.main,
              flexShrink: 0,
              p: 0.5,
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {selectedAppointment && (
        <Box
          sx={{
            mb: isMobile ? 1 : 1.25,
            px: isMobile ? 1.25 : 1.5,
            py: isMobile ? 0.875 : 1,
            border: "1px solid",
            borderColor: "#10B981",
            borderRadius: isMobile ? "10px" : "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: isMobile ? 1 : 1.25,
            backgroundColor: "#ECFDF5",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 1 : 1.25,
              minWidth: 0,
              flex: 1,
            }}
          >
            <Box
              sx={{
                width: isMobile ? 34 : 40,
                height: isMobile ? 34 : 40,
                minWidth: isMobile ? 34 : 40,
                borderRadius: isMobile ? "8px" : "10px",
                backgroundColor: theme.palette.common.white,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#10B981",
              }}
            >
              <Calendar size={isMobile ? 18 : 20} />
            </Box>

            <Box sx={{ minWidth: 0 }}>
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
                    fontSize: 14,
                    color: "#10B981",
                    flexShrink: 0,
                  }}
                />

                <Typography
                  noWrap
                  sx={{
                    fontSize: isMobile ? 12.5 : 13,
                    fontWeight: 700,
                    lineHeight: "18px",
                    color: (theme.palette.grey as any)[1000],
                  }}
                >
                  {selectedAppointment.title}
                </Typography>
              </Box>

              <Typography
                noWrap
                sx={{
                  mt: 0.25,
                  fontSize: isMobile ? 10.5 : 11,
                  fontWeight: 400,
                  lineHeight: "16px",
                  color: theme.palette.info.main,
                }}
              >
                Rendez-vous
              </Typography>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={() => setSelectedAppointment(null)}
            sx={{
              color: theme.palette.error.main,
              flexShrink: 0,
              p: 0.5,
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      {selectedFile && (
        <Box
          sx={{
            mb: isMobile ? 1 : 1.25,
            px: isMobile ? 1.25 : 1.5,
            py: isMobile ? 0.875 : 1,
            border: "1px solid",
            borderColor: theme.palette.grey[200],
            borderRadius: isMobile ? "10px" : "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: theme.palette.grey[100],
          }}
        >
          <Typography
            noWrap
            sx={{
              fontSize: isMobile ? 12 : 12.5,
              fontWeight: 600,
              color: theme.palette.grey[900],
              pr: 1,
            }}
          >
            {selectedFile.name}
          </Typography>

          <IconButton
            size="small"
            onClick={() => setSelectedFile(null)}
            sx={{
              color: theme.palette.info.light,
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: isMobile ? 0.75 : 1,
        }}
      >
        <MessageAttachmentButton
          disabled={disabled}
          recipientType={recipientType}
          onFileSelect={(file) => {
            setSelectedFile(file);
          }}
          onRequestClick={() => {
            setOpenRequestModal(true);
          }}
          onTaskClick={() => {
            setOpenTaskModal(true);
          }}
          onAppointmentClick={() => {
            setOpenAppointmentModal(true);
          }}
        />

        <Box
          sx={{
            flex: 1,
            minHeight: isMobile ? 38 : 40,
            border: "1px solid",
            borderColor: theme.palette.grey[200],
            borderRadius: isMobile ? "10px" : "12px",
            display: "flex",
            alignItems: "center",
            px: isMobile ? "8px" : "10px",
            py: "2px",
            gap: isMobile ? "6px" : "8px",
            backgroundColor: theme.palette.grey[100],
          }}
        >
          <IconButton
            onClick={(event) => setEmojiAnchorEl(event.currentTarget)}
            disabled={disabled}
            sx={{
              width: isMobile ? 26 : 28,
              height: isMobile ? 26 : 28,
              color: theme.palette.info.light,
              flexShrink: 0,
            }}
          >
            <InsertEmoticonOutlinedIcon sx={{ fontSize: isMobile ? 17 : 18 }} />
          </IconButton>

          <Box
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleEditorKeyDown}
            onFocus={onFocus}
            data-placeholder="Saisir un message ..."
            sx={{
              flex: 1,
              minHeight: 20,
              maxHeight: isMobile ? 84 : 100,
              overflowY: "auto",
              outline: "none",
              fontSize: isMobile ? "12.5px" : "13px",
              fontWeight: 400,
              lineHeight: isMobile ? "18px" : "20px",
              color: (theme.palette.grey as any)[1000],
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              py: "4px",
              "&:empty:before": {
                content: "attr(data-placeholder)",
                color: theme.palette.info.light,
              },
              "& img": {
                verticalAlign: "middle",
              },
            }}
          />

          <Popover
            open={!disabled && Boolean(emojiAnchorEl)}
            anchorEl={emojiAnchorEl}
            onClose={() => setEmojiAnchorEl(null)}
            anchorOrigin={{
              vertical: "top",
              horizontal: "left",
            }}
            transformOrigin={{
              vertical: "bottom",
              horizontal: "left",
            }}
            PaperProps={{
              sx: {
                maxWidth: isMobile ? "calc(100vw - 24px)" : "none",
              },
            }}
          >
            <EmojiPicker
              theme={Theme.LIGHT}
              onEmojiClick={handleEmojiClick}
              width={isMobile ? 280 : 320}
              height={isMobile ? 340 : 380}
            />
          </Popover>
        </Box>

        <CustomButton
          variant="contained"
          color="secondary"
          onClick={handleSend}
          disabled={disabled || !hasContent}
          sx={{
            minWidth: isMobile ? 38 : 40,
            width: isMobile ? 38 : 40,
            height: isMobile ? 38 : 40,
            borderRadius: isMobile ? "10px" : "10px",
            p: 0,
            boxShadow: "none",
          }}
        >
          <SendIcon sx={{ fontSize: isMobile ? 17 : 18 }} />
        </CustomButton>
      </Box>

      <RequestSelectionModal
        open={openRequestModal}
        onClose={() => setOpenRequestModal(false)}
        clientId={recipientType === "client" ? recipientId || null : null}
        onAdd={(request) => {
          setSelectedRequest(request);
          setOpenRequestModal(false);
        }}
      />

      <TaskSelectionModal
        open={openTaskModal}
        onClose={() => setOpenTaskModal(false)}
        collaboratorId={
          recipientType === "collaborator" ? recipientId || null : null
        }
        onSelect={(task) => {
          setSelectedTask(task);
          setOpenTaskModal(false);
        }}
      />

      <AppointmentSelectionModal
        open={openAppointmentModal}
        onClose={() => setOpenAppointmentModal(false)}
        clientId={recipientType === "client" ? recipientId || null : null}
        onSelect={(appointment) => {
          setSelectedAppointment(appointment);
          setOpenAppointmentModal(false);
        }}
      />
    </Box>
  );
}
