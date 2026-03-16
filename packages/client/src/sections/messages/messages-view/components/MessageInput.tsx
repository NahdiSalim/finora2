import { useEffect, useMemo, useRef, useState } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import Popover from "@mui/material/Popover";
import InsertEmoticonOutlinedIcon from "@mui/icons-material/InsertEmoticonOutlined";
import SendIcon from "@mui/icons-material/Send";
import CloseIcon from "@mui/icons-material/Close";
import type { EmojiClickData } from "emoji-picker-react";
import EmojiPicker, { Theme } from "emoji-picker-react";

import CustomButton from "../../../../components/common/CustomButton";
import MessageAttachmentButton from "../components/MessageAttachmentButton";

type MessageInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: (file?: File) => void;
  disabled?: boolean;
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
  disabled = false,
}: MessageInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [emojiAnchorEl, setEmojiAnchorEl] = useState<null | HTMLElement>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);

  const hasContent = useMemo(() => {
    return !!getEditorPlainText(value) || hasFlagNode(value) || !!selectedFile;
  }, [value, selectedFile]);

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

    if (selectedFile) {
      onSend(selectedFile);
      setSelectedFile(null);
      resetEditor();
      return;
    }

    if (!getEditorPlainText(value) && !hasFlagNode(value)) return;

    onSend();
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
      {selectedFile && (
        <Box
          sx={{
            mb: 1.25,
            px: 1.5,
            py: 1,
            border: "1px solid #E4E7EC",
            borderRadius: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: "#F9FAFB",
          }}
        >
          <Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>
            {selectedFile.name}
          </Typography>

          <IconButton size="small" onClick={() => setSelectedFile(null)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      )}

      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
        <MessageAttachmentButton
          disabled={disabled}
          onFileSelect={(file) => setSelectedFile(file)}
        />

        <Box
          sx={{
            flex: 1,
            minHeight: 54,
            border: "1px solid #E4E7EC",
            borderRadius: "14px",
            display: "flex",
            alignItems: "flex-end",
            px: 1.5,
            py: 1,
            gap: 1,
          }}
        >
          <IconButton
            onClick={(event) => setEmojiAnchorEl(event.currentTarget)}
            disabled={disabled}
          >
            <InsertEmoticonOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>

          <Box
            ref={editorRef}
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleEditorInput}
            onKeyDown={handleEditorKeyDown}
            data-placeholder="Saisir un message ..."
            sx={{
              flex: 1,
              minHeight: 24,
              outline: "none",
              fontSize: 14,
              whiteSpace: "pre-wrap",
              "&:empty:before": {
                content: "attr(data-placeholder)",
                color: "#98A2B3",
              },
            }}
          />

          <Popover
            open={!disabled && Boolean(emojiAnchorEl)}
            anchorEl={emojiAnchorEl}
            onClose={() => setEmojiAnchorEl(null)}
          >
            <EmojiPicker
              theme={Theme.LIGHT}
              onEmojiClick={handleEmojiClick}
              width={320}
              height={380}
            />
          </Popover>
        </Box>

        <CustomButton
          onClick={handleSend}
          disabled={disabled || !hasContent}
          sx={{
            minWidth: 54,
            width: 54,
            height: 54,
            borderRadius: "14px",
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </CustomButton>
      </Box>
    </Box>
  );
}
