import {
  useState,
  useRef,
  useCallback,
  useEffect,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import {
  Box,
  IconButton,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  Send,
  Plus,
  Mic,
  MicOff,
  Square,
  X,
  FileText,
  Image,
  Play,
  Pause,
} from "lucide-react";
import type { ChatAttachment } from "src/lib/services/chatbotApi";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttachedFile {
  file: File;
  previewUrl?: string; // blob URL for images (revoked on remove / unmount)
  type: "image" | "document";
}

interface AttachedAudio {
  blob: Blob;
  url: string; // blob URL for in-browser playback
  durationSec: number;
}

export interface ChatInputBarProps {
  value: string;
  onChange: (v: string) => void;
  /**
   * Called after any file/audio has been uploaded to the backend.
   * `attachment` is the server-returned metadata (url, name, mimeType, size, objectPath).
   * Text already includes the mention line for the AI context.
   */
  onSend: (text: string, attachment?: ChatAttachment) => void;
  /**
   * Upload a File or Blob to POST /chatbot/upload and return server metadata.
   * Provided by ChatbotWidget via the uploadAttachment RTK mutation.
   */
  uploadFile: (file: File | Blob, name?: string) => Promise<ChatAttachment>;
  /** Abort the current streaming response and unlock input. */
  onStop?: () => void;
  onKeyDown?: (e: KeyboardEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  isTyping?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCEPTED_TYPES = "image/*,.pdf,.doc,.docx,.xls,.xlsx";
const MAX_FILE_SIZE_MB = 10;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ─── File Preview Chip ────────────────────────────────────────────────────────

function FilePreviewChip({
  attached,
  onRemove,
}: {
  attached: AttachedFile;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const isImage = attached.type === "image";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.6,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.primary.main, 0.08),
        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        maxWidth: 220,
      }}
    >
      {isImage && attached.previewUrl ? (
        <Box
          component="img"
          src={attached.previewUrl}
          sx={{
            width: 24,
            height: 24,
            borderRadius: 0.75,
            objectFit: "cover",
            flexShrink: 0,
          }}
        />
      ) : (
        <Box
          sx={{
            color: theme.palette.primary.main,
            flexShrink: 0,
            display: "flex",
          }}
        >
          {isImage ? <Image size={16} /> : <FileText size={16} />}
        </Box>
      )}
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            display: "block",
            fontWeight: 600,
            fontSize: "0.72rem",
            color: "text.primary",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {attached.file.name}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.65rem", color: "text.disabled" }}
        >
          {formatBytes(attached.file.size)}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          p: 0.25,
          color: "text.secondary",
          "&:hover": { color: "error.main" },
        }}
      >
        <X size={12} />
      </IconButton>
    </Box>
  );
}

// ─── Audio Preview Chip ───────────────────────────────────────────────────────

function AudioPreviewChip({
  audio,
  onRemove,
}: {
  audio: AttachedAudio;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    audioRef.current = new Audio(audio.url);
    audioRef.current.onended = () => setPlaying(false);
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [audio.url]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.6,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.secondary.main, 0.08),
        border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
      }}
    >
      <IconButton
        size="small"
        onClick={togglePlay}
        sx={{
          p: 0.5,
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.1),
          "&:hover": { bgcolor: alpha(theme.palette.secondary.main, 0.2) },
        }}
      >
        {playing ? <Pause size={12} /> : <Play size={12} />}
      </IconButton>
      <Box>
        <Typography
          variant="caption"
          sx={{ fontWeight: 600, fontSize: "0.72rem", color: "text.primary" }}
        >
          Message vocal
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: "block", fontSize: "0.65rem", color: "text.disabled" }}
        >
          {formatDuration(audio.durationSec)}
        </Typography>
      </Box>
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          p: 0.25,
          color: "text.secondary",
          "&:hover": { color: "error.main" },
        }}
      >
        <X size={12} />
      </IconButton>
    </Box>
  );
}

// ─── Recording Indicator ──────────────────────────────────────────────────────

function RecordingIndicator({
  seconds,
  onStop,
}: {
  seconds: number;
  onStop: () => void;
}) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 1.5,
        py: 0.6,
        borderRadius: 2,
        bgcolor: alpha(theme.palette.error.main, 0.08),
        border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
      }}
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: "error.main",
          animation: "recPulse 1s ease-in-out infinite",
          "@keyframes recPulse": {
            "0%, 100%": { opacity: 1 },
            "50%": { opacity: 0.3 },
          },
        }}
      />
      <Typography
        variant="caption"
        sx={{ fontWeight: 600, fontSize: "0.75rem", color: "error.main" }}
      >
        {formatDuration(seconds)}
      </Typography>
      <Tooltip title="Arrêter l'enregistrement">
        <IconButton
          size="small"
          onClick={onStop}
          sx={{
            p: 0.5,
            color: "error.main",
            bgcolor: alpha(theme.palette.error.main, 0.1),
            "&:hover": { bgcolor: alpha(theme.palette.error.main, 0.2) },
          }}
        >
          <Square size={11} />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ChatInputBar({
  value,
  onChange,
  onSend,
  uploadFile,
  onStop,
  onKeyDown,
  disabled = false,
  isTyping = false,
  inputRef,
}: ChatInputBarProps) {
  const theme = useTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Attachment state ───────────────────────────────────────────────────────
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // ── Recording state ────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [attachedAudio, setAttachedAudio] = useState<AttachedAudio | null>(
    null,
  );
  const [micError, setMicError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [isUploading, setIsUploading] = useState(false);

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasContent =
    value.trim().length > 0 || !!attachedFile || !!attachedAudio;
  const canSend =
    hasContent && !isTyping && !disabled && !isRecording && !isUploading;

  // ── File picker ────────────────────────────────────────────────────────────
  const handleFileChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setFileError(`Fichier trop volumineux (max ${MAX_FILE_SIZE_MB} Mo)`);
      return;
    }

    const isImage = file.type.startsWith("image/");
    const attached: AttachedFile = {
      file,
      type: isImage ? "image" : "document",
    };

    if (isImage) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        attached.previewUrl = ev.target?.result as string;
        setAttachedFile({ ...attached });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachedFile(attached);
    }
  }, []);

  // ── Recording ──────────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setMicError(null);
    setAttachedAudio(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError("Microphone non supporté par ce navigateur.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Prefer webm/opus (Chrome/Edge), fall back to webm, then mp4 (Safari).
      // Avoid audio/ogg — Chrome's MediaRecorder does not support it.
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : MediaRecorder.isTypeSupported("audio/mp4")
            ? "audio/mp4"
            : "";

      const recorderOptions = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartRef.current = Date.now();

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const effectiveMime = recorder.mimeType || mimeType;
        const blob = new Blob(audioChunksRef.current, { type: effectiveMime });

        if (blob.size === 0) {
          setMicError(
            "Enregistrement vide — aucune donnée audio capturée. Veuillez réessayer.",
          );
          setIsRecording(false);
          setRecordingSeconds(0);
          if (recordingTimerRef.current)
            clearInterval(recordingTimerRef.current);
          return;
        }

        const url = URL.createObjectURL(blob);
        const durationSec = Math.round(
          (Date.now() - recordingStartRef.current) / 1000,
        );
        setAttachedAudio({ blob, url, durationSec });
        setIsRecording(false);
        setRecordingSeconds(0);
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      };

      // 250ms timeslice: gives the encoder enough time to produce a non-empty
      // first chunk and avoids the Chrome race where stop() races with ondataavailable.
      recorder.start(250);
      setIsRecording(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingSeconds((s) => s + 1),
        1000,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (
        msg.includes("Permission") ||
        msg.includes("NotAllowed") ||
        msg.includes("denied")
      ) {
        setMicError(
          "Accès au microphone refusé. Autorisez-le dans les paramètres du navigateur.",
        );
      } else if (
        msg.includes("NotFound") ||
        msg.includes("Requested device not found")
      ) {
        setMicError("Aucun microphone détecté.");
      } else {
        setMicError("Impossible d'accéder au microphone.");
      }
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (attachedFile?.previewUrl)
        URL.revokeObjectURL(attachedFile.previewUrl);
      if (attachedAudio?.url) URL.revokeObjectURL(attachedAudio.url);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Send ───────────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    if (!canSend) return;

    let text = value.trim();
    let uploadedAttachment: ChatAttachment | undefined;

    if (attachedFile || attachedAudio) {
      setIsUploading(true);
      try {
        if (attachedFile) {
          uploadedAttachment = await uploadFile(attachedFile.file);
        } else if (attachedAudio) {
          if (attachedAudio.blob.size === 0) {
            setFileError("Enregistrement vide — veuillez réenregistrer.");
            setIsUploading(false);
            return;
          }
          // Strip codec parameter: "audio/webm;codecs=opus" → "audio/webm"
          // The backend ALLOWED_MIME_TYPES set uses bare types without codec qualifiers.
          const rawMime = attachedAudio.blob.type;
          const normalizedMime = rawMime.split(";")[0].trim() || "audio/webm";
          const ext = normalizedMime.includes("webm")
            ? "webm"
            : normalizedMime.includes("ogg")
              ? "ogg"
              : normalizedMime.includes("mp4")
                ? "mp4"
                : "webm";
          const mention = `\n[Message vocal : ${formatDuration(attachedAudio.durationSec)}]`;
          text = text ? text + mention : mention.trim();
          const audioFile = new File(
            [attachedAudio.blob],
            `message-vocal-${Date.now()}.${ext}`,
            { type: normalizedMime },
          );
          uploadedAttachment = await uploadFile(audioFile);
        }
      } catch {
        setFileError("Échec de l'envoi du fichier. Veuillez réessayer.");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    onSend(text, uploadedAttachment);

    // Reset local state
    if (attachedFile?.previewUrl) URL.revokeObjectURL(attachedFile.previewUrl);
    if (attachedAudio?.url) URL.revokeObjectURL(attachedAudio.url);
    setAttachedFile(null);
    setAttachedAudio(null);
    setFileError(null);
    setMicError(null);
  }, [canSend, value, attachedFile, attachedAudio, onSend, uploadFile]);

  const handleKeyDownInternal = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
        return;
      }
      onKeyDown?.(e);
    },
    [handleSend, onKeyDown],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        px: 1.5,
        pt: 1,
        pb: {
          xs: `calc(${theme.spacing(1)} + env(safe-area-inset-bottom))`,
          sm: 1,
        },
        borderTop: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
        bgcolor: theme.palette.background.paper,
        flexShrink: 0,
      }}
    >
      {/* ── Previews / errors row ─────────────────────────────────────────── */}
      {(attachedFile ||
        attachedAudio ||
        isRecording ||
        fileError ||
        micError) && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 0.75,
            mb: 0.75,
            px: 0.5,
          }}
        >
          {isRecording && (
            <RecordingIndicator
              seconds={recordingSeconds}
              onStop={stopRecording}
            />
          )}
          {attachedFile && !isRecording && (
            <FilePreviewChip
              attached={attachedFile}
              onRemove={() => {
                if (attachedFile.previewUrl)
                  URL.revokeObjectURL(attachedFile.previewUrl);
                setAttachedFile(null);
              }}
            />
          )}
          {attachedAudio && !isRecording && (
            <AudioPreviewChip
              audio={attachedAudio}
              onRemove={() => {
                URL.revokeObjectURL(attachedAudio.url);
                setAttachedAudio(null);
              }}
            />
          )}
          {fileError && (
            <Chip
              label={fileError}
              size="small"
              onDelete={() => setFileError(null)}
              sx={{
                height: 24,
                fontSize: "0.7rem",
                bgcolor: alpha(theme.palette.error.main, 0.08),
                color: "error.main",
                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                "& .MuiChip-deleteIcon": { color: "error.main", fontSize: 14 },
              }}
            />
          )}
          {micError && (
            <Chip
              label={micError}
              size="small"
              onDelete={() => setMicError(null)}
              sx={{
                height: 24,
                fontSize: "0.7rem",
                maxWidth: 260,
                bgcolor: alpha(theme.palette.error.main, 0.08),
                color: "error.main",
                border: `1px solid ${alpha(theme.palette.error.main, 0.25)}`,
                "& .MuiChip-deleteIcon": { color: "error.main", fontSize: 14 },
                "& .MuiChip-label": {
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                },
              }}
            />
          )}
        </Box>
      )}

      {/* ── Input row ─────────────────────────────────────────────────────── */}
      <Box sx={{ display: "flex", alignItems: "flex-end", gap: 0.5 }}>
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          hidden
          aria-hidden="true"
          onChange={handleFileChange}
        />

        {/* ── Text field with embedded + and mic buttons ──────────────────── */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "flex-end",
            borderRadius: 3,
            border: `1.5px solid ${alpha(theme.palette.divider, 0.5)}`,
            bgcolor: alpha(theme.palette.background.default, 0.6),
            transition: "border-color 0.2s",
            "&:focus-within": {
              borderColor: theme.palette.primary.main,
              bgcolor: theme.palette.background.paper,
            },
            px: 0.5,
            py: 0.5,
            gap: 0.25,
          }}
        >
          {/* + (attach) button — left inside field */}
          <Tooltip title="Joindre photos et fichiers" placement="top">
            <span>
              <IconButton
                size="small"
                disabled={disabled || isTyping || isRecording || isUploading}
                onClick={() => {
                  setFileError(null);
                  fileInputRef.current?.click();
                }}
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  color: attachedFile
                    ? theme.palette.primary.main
                    : alpha(theme.palette.text.secondary, 0.7),
                  borderRadius: 2,
                  "&:hover": {
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: theme.palette.primary.main,
                  },
                  "&.Mui-disabled": { opacity: 0.35 },
                }}
              >
                <Plus size={16} />
              </IconButton>
            </span>
          </Tooltip>

          {/* Text input */}
          <TextField
            inputRef={inputRef}
            fullWidth
            multiline
            maxRows={4}
            placeholder="Posez votre question…"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDownInternal}
            disabled={disabled || isTyping || isUploading}
            size="small"
            variant="standard"
            slotProps={{
              input: { disableUnderline: true },
              htmlInput: { "aria-label": "Saisir un message" },
            }}
            sx={{
              flex: 1,
              alignSelf: "flex-end",
              "& .MuiInputBase-root": {
                fontSize: "0.875rem",
                lineHeight: 1.55,
                py: 0.6,
                px: 0.5,
              },
              "& .MuiInputBase-input": { py: 0 },
              "& textarea": { resize: "none" },
            }}
          />

          {/* Mic button — right inside field */}
          <Tooltip
            title={
              isRecording
                ? "Arrêter l'enregistrement"
                : attachedAudio
                  ? "Réenregistrer"
                  : "Message vocal"
            }
            placement="top"
          >
            <span>
              <IconButton
                size="small"
                disabled={disabled || isTyping || !!attachedFile || isUploading}
                onClick={isRecording ? stopRecording : startRecording}
                sx={{
                  width: 32,
                  height: 32,
                  flexShrink: 0,
                  borderRadius: 2,
                  color: isRecording
                    ? theme.palette.error.main
                    : attachedAudio
                      ? theme.palette.secondary.main
                      : alpha(theme.palette.text.secondary, 0.7),
                  bgcolor: isRecording
                    ? alpha(theme.palette.error.main, 0.1)
                    : "transparent",
                  "&:hover": {
                    bgcolor: isRecording
                      ? alpha(theme.palette.error.main, 0.18)
                      : alpha(theme.palette.secondary.main, 0.08),
                    color: isRecording
                      ? theme.palette.error.main
                      : theme.palette.secondary.main,
                  },
                  "&.Mui-disabled": { opacity: 0.35 },
                }}
              >
                {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* ── Stop button (while streaming) / Send button ───────────────── */}
        {isTyping && onStop ? (
          <Tooltip title="Arrêter la réponse" placement="top">
            <IconButton
              onClick={onStop}
              sx={{
                width: 40,
                height: 40,
                flexShrink: 0,
                borderRadius: 2.5,
                alignSelf: "flex-end",
                bgcolor: alpha(theme.palette.error.main, 0.1),
                color: theme.palette.error.main,
                border: `1.5px solid ${alpha(theme.palette.error.main, 0.3)}`,
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: alpha(theme.palette.error.main, 0.18),
                  transform: "scale(1.06)",
                },
              }}
            >
              <Square size={16} />
            </IconButton>
          </Tooltip>
        ) : (
          <Tooltip
            title={isUploading ? "Envoi en cours…" : "Envoyer"}
            placement="top"
          >
            <span>
              <IconButton
                onClick={handleSend}
                disabled={!canSend}
                sx={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: 2.5,
                  alignSelf: "flex-end",
                  background: canSend
                    ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                    : alpha(theme.palette.action.disabled, 0.1),
                  color: canSend ? "#fff" : theme.palette.action.disabled,
                  transition: "all 0.2s",
                  "&:hover": {
                    transform: canSend ? "scale(1.06)" : "none",
                    background: canSend
                      ? `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`
                      : alpha(theme.palette.action.disabled, 0.1),
                  },
                  "&.Mui-disabled": {
                    background: alpha(theme.palette.action.disabled, 0.1),
                    color: theme.palette.action.disabled,
                  },
                }}
              >
                {isUploading ? (
                  <CircularProgress
                    size={16}
                    thickness={4}
                    sx={{ color: theme.palette.primary.main }}
                  />
                ) : (
                  <Send size={18} />
                )}
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
