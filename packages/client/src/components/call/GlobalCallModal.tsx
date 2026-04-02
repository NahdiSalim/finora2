import { useEffect, useRef } from "react";
import {
  Box,
  Avatar,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  alpha,
  Tooltip,
  Alert,
} from "@mui/material";
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  Minimize2,
  Users,
} from "lucide-react";
import { useGlobalCall } from "src/contexts/GlobalCallContext";
import AudioVisualizer from "src/components/call/AudioVisualizer";
import AudioDebugger from "src/components/call/AudioDebugger";
import { RINGTONE_CONFIG } from "src/components/call/ringtone-config";
import { generateRingtoneDataUrl } from "src/components/call/ringtone-generator";

export default function GlobalCallModal() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const {
    callState,
    isMinimized,
    callType,
    roomName,
    isGroup,
    participants,
    incomingCallData,
    localStream,
    remoteStreams,
    isAudioEnabled,
    isVideoEnabled,
    mediaError,
    connectionErrors,
    callDuration,
    acceptCall,
    rejectCall,
    endCall,
    toggleMinimize,
    toggleAudio,
    toggleVideo,
  } = useGlobalCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const remoteAudioRefs = useRef<Map<number, HTMLAudioElement>>(new Map());
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const isRingingRef = useRef(false);

  // Debug logging for audio state
  useEffect(() => {
    if (callState === "active") {
      console.log("[GlobalCallModal] === AUDIO DEBUG ===");
      console.log(
        "[GlobalCallModal] Local stream:",
        localStream ? "exists" : "null",
      );
      if (localStream) {
        const audioTracks = localStream.getAudioTracks();
        console.log(
          "[GlobalCallModal] Local audio tracks:",
          audioTracks.length,
        );
        audioTracks.forEach((track, idx) => {
          console.log(`[GlobalCallModal] Track ${idx}:`, {
            id: track.id,
            label: track.label,
            enabled: track.enabled,
            muted: track.muted,
            readyState: track.readyState,
          });
        });
      }
      console.log("[GlobalCallModal] isAudioEnabled:", isAudioEnabled);
      console.log("[GlobalCallModal] Remote streams:", remoteStreams.length);
      console.log(
        "[GlobalCallModal] Remote audio elements:",
        remoteAudioRefs.current.size,
      );
    }
  }, [callState, localStream, isAudioEnabled, remoteStreams]);

  // Format call duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Ringtone management
  useEffect(() => {
    if (callState === "incoming") {
      isRingingRef.current = true;
      playRingtone();
    } else {
      isRingingRef.current = false;
      stopRingtone();
    }

    return () => {
      stopRingtone();
    };
  }, [callState]);

  const playRingtone = async () => {
    try {
      if (RINGTONE_CONFIG.USE_AUDIO_FILE) {
        const audio = new Audio(RINGTONE_CONFIG.AUDIO_FILE_PATH);
        audio.loop = true;
        audio.volume = RINGTONE_CONFIG.GENERATED.volume;
        await audio.play().catch(() => {});
        audioElementRef.current = audio;
      } else {
        const audio = new Audio(generateRingtoneDataUrl());
        audio.loop = true;
        audio.volume = RINGTONE_CONFIG.GENERATED.volume;
        await audio.play().catch(() => {});
        audioElementRef.current = audio;
      }
    } catch (error) {
      console.error("[GlobalCallModal] Error playing ringtone:", error);
    }
  };

  const stopRingtone = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
      audioElementRef.current = null;
    }
  };

  // Attach video streams
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    remoteStreams.forEach((rs) => {
      const videoElement = remoteVideoRefs.current.get(rs.userId);
      if (videoElement && rs.stream) {
        videoElement.srcObject = rs.stream;
      }
    });
  }, [remoteStreams]);

  // Attach audio streams (crucial for audio calls)
  useEffect(() => {
    console.log(
      "[GlobalCallModal] Attaching remote audio streams:",
      remoteStreams.length,
    );

    remoteStreams.forEach((rs) => {
      let audioElement = remoteAudioRefs.current.get(rs.userId);

      if (!audioElement) {
        audioElement = new Audio();
        audioElement.autoplay = true;
        audioElement.volume = 1.0;
        remoteAudioRefs.current.set(rs.userId, audioElement);
        console.log(
          "[GlobalCallModal] Created audio element for user:",
          rs.userId,
        );
      }

      if (rs.stream) {
        const audioTracks = rs.stream.getAudioTracks();
        console.log(
          "[GlobalCallModal] Remote stream audio tracks for user",
          rs.userId,
          ":",
          audioTracks.map((t) => ({
            id: t.id,
            enabled: t.enabled,
            label: t.label,
            muted: t.muted,
            readyState: t.readyState,
          })),
        );

        if (audioTracks.length === 0) {
          console.warn(
            "[GlobalCallModal] No audio tracks in remote stream for user:",
            rs.userId,
          );
        }

        audioElement.srcObject = rs.stream;
        audioElement
          .play()
          .then(() => {
            console.log(
              "[GlobalCallModal] Successfully playing audio for user:",
              rs.userId,
              "volume:",
              audioElement.volume,
            );
          })
          .catch((err) => {
            console.error(
              "[GlobalCallModal] Error playing remote audio for user:",
              rs.userId,
              err,
            );
          });
      }
    });

    // Cleanup removed streams
    const currentUserIds = new Set(remoteStreams.map((rs) => rs.userId));
    remoteAudioRefs.current.forEach((audio, userId) => {
      if (!currentUserIds.has(userId)) {
        audio.pause();
        audio.srcObject = null;
        remoteAudioRefs.current.delete(userId);
        console.log(
          "[GlobalCallModal] Removed audio element for user:",
          userId,
        );
      }
    });

    return () => {
      console.log("[GlobalCallModal] Cleaning up all audio elements");
      remoteAudioRefs.current.forEach((audio, userId) => {
        console.log(
          "[GlobalCallModal] Pausing audio element for user:",
          userId,
        );
        audio.pause();
        audio.srcObject = null;
      });
      remoteAudioRefs.current.clear();
    };
  }, [remoteStreams]);

  // Don't render if idle
  if (callState === "idle") return null;

  // Render minimized floating window
  if (isMinimized && callState === "active") {
    return (
      <Box
        onClick={toggleMinimize}
        sx={{
          position: "fixed",
          top: 80,
          right: 20,
          width: 280,
          bgcolor: theme.palette.background.paper,
          borderRadius: 2,
          boxShadow: theme.shadows[20],
          cursor: "pointer",
          zIndex: 9999,
          border: `2px solid ${theme.palette.primary.main}`,
          overflow: "hidden",
          transition: "all 0.3s ease",
          "&:hover": {
            transform: "scale(1.02)",
            boxShadow: theme.shadows[24],
          },
        }}
      >
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
          }}
        >
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              bgcolor: theme.palette.primary.main,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.7 },
              },
            }}
          >
            {callType === "video" ? (
              <VideoIcon size={24} color="white" />
            ) : (
              <Phone size={24} color="white" />
            )}
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {roomName || participants[0]?.name || "Appel en cours"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDuration(callDuration)}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              endCall();
            }}
            sx={{
              bgcolor: theme.palette.error.main,
              color: "white",
              "&:hover": {
                bgcolor: theme.palette.error.dark,
              },
            }}
          >
            <PhoneOff size={18} />
          </IconButton>
        </Box>

        {isAudioEnabled && localStream && (
          <Box sx={{ px: 2, pb: 2 }}>
            <AudioVisualizer stream={localStream} size={40} />
          </Box>
        )}
      </Box>
    );
  }

  // Render incoming call modal
  if (callState === "incoming" && incomingCallData) {
    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(0, 0, 0, 0.7)",
        }}
      >
        <Box
          sx={{
            bgcolor: theme.palette.background.paper,
            borderRadius: 4,
            p: 4,
            maxWidth: 400,
            width: "90%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            boxShadow: theme.shadows[24],
          }}
        >
          <Box
            sx={{
              position: "relative",
              animation: "pulse 2s infinite",
              "@keyframes pulse": {
                "0%, 100%": { transform: "scale(1)", opacity: 1 },
                "50%": { transform: "scale(1.05)", opacity: 0.8 },
              },
            }}
          >
            <Avatar
              src={incomingCallData.callerAvatar}
              sx={{
                width: 100,
                height: 100,
                fontSize: 40,
                bgcolor: theme.palette.primary.main,
                border: `4px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              }}
            >
              {incomingCallData.callerName.charAt(0).toUpperCase()}
            </Avatar>
            <Box
              sx={{
                position: "absolute",
                bottom: 0,
                right: 0,
                bgcolor:
                  incomingCallData.callType === "video"
                    ? theme.palette.info.main
                    : theme.palette.success.main,
                borderRadius: "50%",
                p: 1,
                border: `3px solid ${theme.palette.background.paper}`,
              }}
            >
              {incomingCallData.callType === "video" ? (
                <VideoIcon size={20} color="white" />
              ) : (
                <Phone size={20} color="white" />
              )}
            </Box>
          </Box>

          <Box sx={{ textAlign: "center" }}>
            <Typography variant="h5" fontWeight={600} gutterBottom>
              {incomingCallData.callerName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {incomingCallData.callType === "video"
                ? "Appel vidéo entrant..."
                : "Appel vocal entrant..."}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 4, mt: 2 }}>
            <Box sx={{ textAlign: "center" }}>
              <IconButton
                onClick={rejectCall}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: theme.palette.error.main,
                  color: "white",
                  "&:hover": {
                    bgcolor: theme.palette.error.dark,
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s",
                  mb: 1,
                }}
              >
                <PhoneOff size={28} />
              </IconButton>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                Refuser
              </Typography>
            </Box>

            <Box sx={{ textAlign: "center" }}>
              <IconButton
                onClick={acceptCall}
                sx={{
                  width: 64,
                  height: 64,
                  bgcolor: theme.palette.success.main,
                  color: "white",
                  animation: "bounce 2s infinite",
                  "&:hover": {
                    bgcolor: theme.palette.success.dark,
                    transform: "scale(1.05)",
                  },
                  transition: "all 0.2s",
                  "@keyframes bounce": {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                  },
                  mb: 1,
                }}
              >
                <Phone size={28} />
              </IconButton>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
              >
                Accepter
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // Render active call modal (expanded)
  if (callState === "active" && !isMinimized) {
    const displayName = roomName || participants[0]?.name || "Appel en cours";

    return (
      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          bgcolor: "#000",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            {isGroup && <Users size={20} color="white" />}
            <Box>
              <Typography variant="subtitle1" color="white" fontWeight={600}>
                {displayName}
              </Typography>
              <Typography variant="caption" color="rgba(255,255,255,0.7)">
                {formatDuration(callDuration)}
              </Typography>
              {/* Debug info */}
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 10,
                }}
              >
                Mic: {isAudioEnabled ? "ON" : "OFF"} | Stream:{" "}
                {localStream ? "✓" : "✗"} | Local audio:{" "}
                {localStream?.getAudioTracks()[0]?.enabled ? "✓" : "✗"} |
                Remote: {remoteStreams.length}
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Minimiser">
            <IconButton onClick={toggleMinimize} sx={{ color: "white" }}>
              <Minimize2 size={20} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Video Grid */}
        <Box
          sx={{
            flex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: remoteStreams.length > 1 ? "repeat(2, 1fr)" : "1fr",
            },
            gap: 2,
            p: 2,
            overflow: "auto",
          }}
        >
          {/* Local stream */}
          {callType === "video" && (
            <Box
              sx={{
                position: "relative",
                bgcolor: "#2a2a2a",
                borderRadius: 2,
                overflow: "hidden",
                aspectRatio: "16/9",
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  transform: "scaleX(-1)",
                }}
              />
              <Box
                sx={{
                  position: "absolute",
                  bottom: 12,
                  left: 12,
                  bgcolor: alpha("#000", 0.6),
                  color: "white",
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 2,
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                Vous
              </Box>
              {!isVideoEnabled && (
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "column",
                    gap: 2,
                    bgcolor: alpha("#000", 0.8),
                  }}
                >
                  <VideoOff size={48} color="white" />
                  {isAudioEnabled && (
                    <AudioVisualizer stream={localStream} size={60} />
                  )}
                </Box>
              )}
            </Box>
          )}

          {/* Remote streams */}
          {remoteStreams.length > 0 ? (
            remoteStreams.map((rs) => {
              const participant = participants.find((p) => p.id === rs.userId);
              return (
                <Box
                  key={rs.userId}
                  sx={{
                    position: "relative",
                    bgcolor: "#2a2a2a",
                    borderRadius: 2,
                    overflow: "hidden",
                    aspectRatio: "16/9",
                  }}
                >
                  {callType === "video" ? (
                    <video
                      ref={(el) => {
                        if (el) remoteVideoRefs.current.set(rs.userId, el);
                      }}
                      autoPlay
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <Avatar
                        src={participant?.avatar}
                        sx={{
                          width: 80,
                          height: 80,
                          fontSize: 32,
                          bgcolor: theme.palette.primary.main,
                        }}
                      >
                        {participant?.name?.charAt(0).toUpperCase()}
                      </Avatar>
                      <Typography variant="h6" color="white">
                        {participant?.name}
                      </Typography>
                      <AudioVisualizer stream={rs.stream} size={60} />
                    </Box>
                  )}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 12,
                      left: 12,
                      bgcolor: alpha("#000", 0.6),
                      color: "white",
                      px: 1.5,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: 12,
                      fontWeight: 500,
                    }}
                  >
                    {participant?.name || `Utilisateur ${rs.userId}`}
                  </Box>
                </Box>
              );
            })
          ) : (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 2,
                color: "white",
                minHeight: 300,
              }}
            >
              <Avatar
                sx={{
                  width: 100,
                  height: 100,
                  fontSize: 40,
                  bgcolor: theme.palette.primary.main,
                }}
              >
                {participants[0]?.name?.charAt(0).toUpperCase() || "?"}
              </Avatar>
              <Typography variant="h6">
                {participants[0]?.name || "En attente..."}
              </Typography>
              <Typography variant="body2" color="rgba(255,255,255,0.6)">
                Connexion en cours...
              </Typography>
            </Box>
          )}
        </Box>

        {/* Error alerts */}
        {(mediaError || connectionErrors.size > 0) && (
          <Box sx={{ px: 2, pb: 2 }}>
            {mediaError && (
              <Alert severity="error" sx={{ mb: 1 }}>
                {mediaError}
              </Alert>
            )}
            {Array.from(connectionErrors.entries()).map(([userId, error]) => {
              const participant = participants.find((p) => p.id === userId);
              return (
                <Alert key={userId} severity="warning" sx={{ mb: 1 }}>
                  Problème de connexion avec{" "}
                  {participant?.name || `Utilisateur ${userId}`}: {error}
                </Alert>
              );
            })}
          </Box>
        )}

        {/* Controls */}
        <Box
          sx={{
            p: 3,
            background:
              "linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
            display: "flex",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Tooltip
            title={isAudioEnabled ? "Couper le micro" : "Activer le micro"}
          >
            <IconButton
              onClick={() => {
                console.log(
                  "[GlobalCallModal] Microphone button clicked! Current state:",
                  isAudioEnabled,
                );
                console.log(
                  "[GlobalCallModal] Local stream exists:",
                  !!localStream,
                );
                if (localStream) {
                  console.log(
                    "[GlobalCallModal] Audio tracks before toggle:",
                    localStream
                      .getAudioTracks()
                      .map((t) => ({ enabled: t.enabled, id: t.id })),
                  );
                }
                toggleAudio();
                setTimeout(() => {
                  if (localStream) {
                    console.log(
                      "[GlobalCallModal] Audio tracks after toggle:",
                      localStream
                        .getAudioTracks()
                        .map((t) => ({ enabled: t.enabled, id: t.id })),
                    );
                  }
                }, 100);
              }}
              sx={{
                width: 56,
                height: 56,
                bgcolor: isAudioEnabled
                  ? alpha("#fff", 0.2)
                  : theme.palette.error.main,
                color: "white",
                "&:hover": {
                  bgcolor: isAudioEnabled
                    ? alpha("#fff", 0.3)
                    : theme.palette.error.dark,
                },
              }}
            >
              {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
            </IconButton>
          </Tooltip>

          {callType === "video" && (
            <Tooltip
              title={isVideoEnabled ? "Couper la caméra" : "Activer la caméra"}
            >
              <IconButton
                onClick={toggleVideo}
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: isVideoEnabled
                    ? alpha("#fff", 0.2)
                    : theme.palette.error.main,
                  color: "white",
                  "&:hover": {
                    bgcolor: isVideoEnabled
                      ? alpha("#fff", 0.3)
                      : theme.palette.error.dark,
                  },
                }}
              >
                {isVideoEnabled ? (
                  <VideoIcon size={24} />
                ) : (
                  <VideoOff size={24} />
                )}
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Raccrocher">
            <IconButton
              onClick={endCall}
              sx={{
                width: 56,
                height: 56,
                bgcolor: theme.palette.error.main,
                color: "white",
                "&:hover": {
                  bgcolor: theme.palette.error.dark,
                  transform: "scale(1.05)",
                },
              }}
            >
              <PhoneOff size={24} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Audio Debug Monitor */}
        <AudioDebugger
          localStream={localStream}
          remoteStreams={remoteStreams}
          isAudioEnabled={isAudioEnabled}
          isVideoEnabled={isVideoEnabled}
        />
      </Box>
    );
  }

  return null;
}
