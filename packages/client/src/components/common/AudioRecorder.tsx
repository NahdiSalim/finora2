import { useState, useRef, useEffect } from "react";
import { Box, IconButton, Typography, useTheme, alpha } from "@mui/material";
import { Mic, Square, Play, Pause, Trash2 } from "lucide-react";

interface AudioRecorderProps {
  onAudioReady: (audioBlob: Blob, duration: number) => void;
  onDelete: () => void;
  maxDuration?: number; // in seconds
}

export default function AudioRecorder({
  onAudioReady,
  onDelete,
  maxDuration = 300, // 5 minutes default
}: AudioRecorderProps) {
  const theme = useTheme();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioURL, setAudioURL] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (audioURL) {
        URL.revokeObjectURL(audioURL);
      }
    };
  }, [audioURL]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : MediaRecorder.isTypeSupported("audio/ogg")
          ? "audio/ogg"
          : "audio/wav";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioURL(url);
        onAudioReady(audioBlob, recordingTime);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => {
          const newTime = prev + 1;
          if (newTime >= maxDuration) {
            stopRecording();
            return maxDuration;
          }
          return newTime;
        });
      }, 1000);
    } catch {
      setError(
        "Impossible d'accéder au microphone. Veuillez vérifier les permissions.",
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const togglePlayPause = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(audioURL!);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDelete = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (audioURL) {
      URL.revokeObjectURL(audioURL);
    }
    setAudioURL(null);
    setIsPlaying(false);
    setRecordingTime(0);
    audioChunksRef.current = [];
    onDelete();
  };

  // Recording UI
  if (isRecording) {
    return (
      <Box
        sx={{
          p: 3,
          bgcolor: alpha(theme.palette.error.main, 0.05),
          borderRadius: 2,
          border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Box
              sx={{
                width: 12,
                height: 12,
                borderRadius: "50%",
                bgcolor: theme.palette.error.main,
                animation: "pulse 1.5s ease-in-out infinite",
                "@keyframes pulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.3 },
                },
              }}
            />
            <Typography variant="body1" fontWeight={600}>
              Enregistrement en cours...
            </Typography>
          </Box>
          <Typography
            variant="h6"
            sx={{ fontFamily: "monospace", fontWeight: 600 }}
          >
            {formatTime(recordingTime)}
          </Typography>
        </Box>
        <Box sx={{ mt: 2, display: "flex", justifyContent: "center" }}>
          <IconButton
            onClick={stopRecording}
            sx={{
              bgcolor: theme.palette.error.main,
              color: "white",
              "&:hover": {
                bgcolor: theme.palette.error.dark,
              },
              width: 56,
              height: 56,
            }}
          >
            <Square size={24} fill="white" />
          </IconButton>
        </Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", textAlign: "center", mt: 1 }}
        >
          Durée maximale: {formatTime(maxDuration)}
        </Typography>
      </Box>
    );
  }

  // Playback UI
  if (audioURL) {
    return (
      <Box
        sx={{
          p: 3,
          bgcolor: alpha(theme.palette.primary.main, 0.05),
          borderRadius: 2,
          border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Typography variant="body1" fontWeight={600}>
            Enregistrement terminé
          </Typography>
          <Typography
            variant="body2"
            sx={{ fontFamily: "monospace", color: "text.secondary" }}
          >
            {formatTime(recordingTime)}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <IconButton
            onClick={togglePlayPause}
            sx={{
              bgcolor: theme.palette.primary.main,
              color: "white",
              "&:hover": {
                bgcolor: theme.palette.primary.dark,
              },
              width: 48,
              height: 48,
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
          </IconButton>
          <IconButton
            onClick={handleDelete}
            sx={{
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.2),
              },
              width: 48,
              height: 48,
            }}
          >
            <Trash2 size={20} />
          </IconButton>
        </Box>
      </Box>
    );
  }

  // Initial state - show record button
  return (
    <Box sx={{ textAlign: "center" }}>
      {error && (
        <Typography
          variant="body2"
          color="error"
          sx={{
            mb: 2,
            p: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            borderRadius: 1,
          }}
        >
          {error}
        </Typography>
      )}
      <IconButton
        onClick={startRecording}
        sx={{
          bgcolor: theme.palette.primary.main,
          color: "white",
          "&:hover": {
            bgcolor: theme.palette.primary.dark,
          },
          width: 80,
          height: 80,
          mb: 2,
        }}
      >
        <Mic size={32} />
      </IconButton>
      <Typography variant="body1" fontWeight={600}>
        Cliquez pour enregistrer
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Durée maximale: {formatTime(maxDuration)}
      </Typography>
    </Box>
  );
}
