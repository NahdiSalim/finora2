import { useState, useEffect, useCallback } from "react";

export type CallType = "audio" | "video";

export function useMediaStream(callType: CallType | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  // Debug: Log when stream changes
  useEffect(() => {
    console.log("[useMediaStream] ⚡ Stream state changed:", {
      streamId: stream?.id || "null",
      audioTracks: stream?.getAudioTracks().length || 0,
      videoTracks: stream?.getVideoTracks().length || 0,
      audioEnabled,
      videoEnabled,
    });
  }, [stream, audioEnabled, videoEnabled]);

  const startStream = useCallback(
    async (overrideCallType?: CallType) => {
      const typeToUse = overrideCallType || callType;

      if (!typeToUse) {
        console.warn(
          "[useMediaStream] Cannot start stream - no callType provided",
        );
        return;
      }

      console.log("[useMediaStream] Starting stream for callType:", typeToUse);
      console.log("[useMediaStream] Existing stream:", stream?.id || "none");

      // If we already have a stream, stop it first
      if (stream) {
        console.log(
          "[useMediaStream] Stopping existing stream before starting new one",
        );
        stream.getTracks().forEach((track) => track.stop());
      }

      setIsLoading(true);
      setError(null);

      try {
        const constraints: MediaStreamConstraints = {
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video:
            typeToUse === "video"
              ? {
                  width: { ideal: 1280 },
                  height: { ideal: 720 },
                  facingMode: "user",
                }
              : false,
        };

        console.log(
          "[useMediaStream] Requesting getUserMedia with constraints:",
          constraints,
        );
        const mediaStream =
          await navigator.mediaDevices.getUserMedia(constraints);
        console.log(
          "[useMediaStream] getUserMedia success, got stream:",
          mediaStream.id,
        );

        // Ensure audio is enabled by default
        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        // Video enabled by default for video calls
        if (callType === "video") {
          mediaStream.getVideoTracks().forEach((track) => {
            track.enabled = true;
          });
        }

        console.log(
          "[useMediaStream] Setting stream in state:",
          mediaStream.id,
        );
        setStream(mediaStream);
        setAudioEnabled(true);
        setVideoEnabled(typeToUse === "video");

        console.log("[useMediaStream] ✅ Stream started successfully:", {
          streamId: mediaStream.id,
          callType: typeToUse,
          audioTracks: mediaStream.getAudioTracks().length,
          videoTracks: mediaStream.getVideoTracks().length,
          audioTrackDetails: mediaStream.getAudioTracks().map((t) => ({
            id: t.id,
            label: t.label,
            enabled: t.enabled,
            muted: t.muted,
            readyState: t.readyState,
          })),
          videoTrackDetails: mediaStream.getVideoTracks().map((t) => ({
            id: t.id,
            enabled: t.enabled,
            readyState: t.readyState,
          })),
        });
      } catch (err: any) {
        console.error("[useMediaStream] Error getting media:", err);

        let errorMessage =
          "Erreur lors de l'accès aux périphériques multimédias.";

        if (
          err.name === "NotAllowedError" ||
          err.name === "PermissionDeniedError"
        ) {
          errorMessage =
            "Permission refusée. Veuillez autoriser l'accès à votre caméra/microphone dans les paramètres du navigateur.";
        } else if (
          err.name === "NotFoundError" ||
          err.name === "DevicesNotFoundError"
        ) {
          errorMessage = `Aucun ${typeToUse === "video" ? "caméra/microphone" : "microphone"} trouvé. Vérifiez que votre appareil est connecté.`;
        } else if (
          err.name === "NotReadableError" ||
          err.name === "TrackStartError"
        ) {
          errorMessage =
            "Impossible d'accéder à l'appareil. Il est peut-être déjà utilisé par une autre application.";
        } else if (
          err.name === "OverconstrainedError" ||
          err.name === "ConstraintNotSatisfiedError"
        ) {
          errorMessage =
            "Les paramètres de l'appareil ne sont pas compatibles. Essayez un autre appareil.";
        } else if (err.name === "TypeError") {
          errorMessage =
            "Votre navigateur ne supporte pas l'accès aux périphériques multimédias.";
        } else if (err.message) {
          errorMessage = `Erreur: ${err.message}`;
        }

        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [callType, stream],
  );

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
        console.log("[useMediaStream] Stopped track:", track.kind);
      });
      setStream(null);
      setAudioEnabled(false);
      setVideoEnabled(false);
    }
  }, [stream]);

  const toggleAudio = useCallback(() => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length === 0) {
        console.warn("[useMediaStream] No audio tracks found to toggle");
        return false;
      }

      const newState = !audioTracks[0].enabled;
      audioTracks.forEach((track) => {
        track.enabled = newState;
        console.log(
          "[useMediaStream] Audio track toggled:",
          track.enabled,
          "id:",
          track.id,
        );
      });

      setAudioEnabled(newState);
      return newState;
    }
    console.warn("[useMediaStream] No stream available to toggle audio");
    return false;
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        console.warn("[useMediaStream] No video tracks found to toggle");
        return false;
      }

      const newState = !videoTracks[0].enabled;
      videoTracks.forEach((track) => {
        track.enabled = newState;
        console.log(
          "[useMediaStream] Video track toggled:",
          track.enabled,
          "id:",
          track.id,
        );
      });

      setVideoEnabled(newState);
      return newState;
    }
    console.warn("[useMediaStream] No stream available to toggle video");
    return false;
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  return {
    stream,
    error,
    isLoading,
    startStream,
    stopStream,
    toggleAudio,
    toggleVideo,
    isAudioEnabled: audioEnabled,
    isVideoEnabled: videoEnabled,
  };
}
