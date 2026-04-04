import { useState, useEffect, useCallback } from "react";

export type CallType = "audio" | "video";

export function useMediaStream(callType: CallType | null) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);

  const startStream = useCallback(
    async (overrideCallType?: CallType) => {
      const typeToUse = overrideCallType || callType;

      if (!typeToUse) {
        return;
      }

      if (stream) {
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

        const mediaStream =
          await navigator.mediaDevices.getUserMedia(constraints);

        mediaStream.getAudioTracks().forEach((track) => {
          track.enabled = true;
        });

        if (callType === "video") {
          mediaStream.getVideoTracks().forEach((track) => {
            track.enabled = true;
          });
        }

        setStream(mediaStream);
        setAudioEnabled(true);
        setVideoEnabled(typeToUse === "video");
      } catch (err: any) {
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
        return false;
      }

      const newState = !audioTracks[0].enabled;
      audioTracks.forEach((track) => {
        track.enabled = newState;
      });

      setAudioEnabled(newState);
      return newState;
    }
    return false;
  }, [stream]);

  const toggleVideo = useCallback(() => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        return false;
      }

      const newState = !videoTracks[0].enabled;
      videoTracks.forEach((track) => {
        track.enabled = newState;
      });

      setVideoEnabled(newState);
      return newState;
    }
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
