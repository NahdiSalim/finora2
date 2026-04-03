import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { getSocket } from "src/lib/socket";
import {
  useMediaStream,
  type CallType,
} from "src/sections/messages/messages-view/hooks/useMediaStream";
import { useWebRTC } from "src/sections/messages/messages-view/hooks/useWebRTC";

type CallState = "idle" | "incoming" | "active";

export type CallParticipant = {
  id: number;
  name: string;
  avatar?: string;
};

type IncomingCallData = {
  callId: number;
  callerId: number;
  callerName: string;
  callerAvatar?: string;
  roomId: number;
  callType: CallType;
};

type GlobalCallContextValue = {
  // State
  callState: CallState;
  isMinimized: boolean;
  callType: CallType | null;
  roomId: number | null;
  roomName: string | null;
  isGroup: boolean;
  participants: CallParticipant[];
  incomingCallData: IncomingCallData | null;

  // Media state
  localStream: MediaStream | null;
  remoteStreams: Array<{ userId: number; stream: MediaStream }>;
  isAudioEnabled: boolean;
  isVideoEnabled: boolean;
  mediaError: string | null;
  connectionErrors: Map<number, string>;
  callDuration: number;

  // Actions
  initiateCall: (
    roomId: number,
    type: CallType,
    participants: CallParticipant[],
    roomName?: string,
    isGroup?: boolean,
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  endCall: () => void;
  toggleMinimize: () => void;
  toggleAudio: () => void;
  toggleVideo: () => void;
};

const GlobalCallContext = createContext<GlobalCallContextValue | undefined>(
  undefined,
);

export function GlobalCallProvider({ children }: { children: ReactNode }) {
  // Call state
  const [callState, setCallState] = useState<CallState>("idle");
  const [isMinimized, setIsMinimized] = useState(false);
  const [callType, setCallType] = useState<CallType | null>(null);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [isGroup, setIsGroup] = useState(false);
  const [participants, setParticipants] = useState<CallParticipant[]>([]);
  const [incomingCallData, setIncomingCallData] =
    useState<IncomingCallData | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const callStartTimeRef = useRef<number>(0);
  const currentUserIdRef = useRef<number>(0);
  const callIdRef = useRef<number | null>(null);

  // Get current user ID from auth state
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        currentUserIdRef.current = payload.sub || 0;
      } catch (error) {
        console.error("[GlobalCallContext] Error parsing token:", error);
      }
    }
  }, []);

  // WebRTC hooks
  const {
    stream: localStream,
    error: mediaError,
    startStream,
    stopStream,
    toggleAudio: toggleAudioStream,
    toggleVideo: toggleVideoStream,
    isAudioEnabled,
    isVideoEnabled,
  } = useMediaStream(callType);

  // Debug: Log when local stream changes
  useEffect(() => {
    console.log("[GlobalCallContext] Local stream changed:", {
      exists: !!localStream,
      id: localStream?.id,
      audioTracks: localStream?.getAudioTracks().length,
      videoTracks: localStream?.getVideoTracks().length,
      callState,
      callType,
    });
  }, [localStream, callState, callType]);

  const {
    remoteStreams,
    connectionErrors,
    makeOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeerConnection,
    closeAllConnections,
  } = useWebRTC(roomId || 0, localStream);

  // Reset all call state
  const resetCallState = useCallback(() => {
    console.log("[GlobalCallContext] Resetting call state");
    setCallState("idle");
    setIsMinimized(false);
    setCallType(null);
    setRoomId(null);
    setRoomName(null);
    setIsGroup(false);
    setParticipants([]);
    setIncomingCallData(null);
    callIdRef.current = null;
    stopStream();
    closeAllConnections();
  }, [stopStream, closeAllConnections]);

  // Call duration timer
  useEffect(() => {
    if (callState !== "active") {
      setCallDuration(0);
      return undefined;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor(
        (Date.now() - callStartTimeRef.current) / 1000,
      );
      setCallDuration(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [callState]);

  // Socket event listeners
  useEffect(() => {
    const socketInstance = getSocket();
    console.log("[GlobalCallContext] Setting up socket listeners");

    // Incoming call
    socketInstance.on(
      "call:incoming",
      (data: {
        callId: number;
        callerId: number;
        roomId: number;
        callType: CallType;
        initiatorName: string;
      }) => {
        console.log("[GlobalCallContext] Incoming call:", data);
        setIncomingCallData({
          callId: data.callId,
          callerId: data.callerId,
          callerName: data.initiatorName,
          roomId: data.roomId,
          callType: data.callType,
        });
        setCallState("incoming");
      },
    );

    // WebRTC signaling
    socketInstance.on(
      "call:offer",
      async (data: {
        callerId: number;
        roomId: number;
        offer: RTCSessionDescriptionInit;
      }) => {
        console.log("[GlobalCallContext] Received offer from:", data.callerId);
        await handleOffer(data.callerId, data.offer);
      },
    );

    socketInstance.on(
      "call:answer",
      async (data: {
        callerId: number;
        roomId: number;
        answer: RTCSessionDescriptionInit;
      }) => {
        console.log("[GlobalCallContext] Received answer from:", data.callerId);
        await handleAnswer(data.callerId, data.answer);
      },
    );

    socketInstance.on(
      "call:ice-candidate",
      async (data: {
        callerId: number;
        roomId: number;
        candidate: RTCIceCandidateInit;
      }) => {
        console.log(
          "[GlobalCallContext] Received ICE candidate from:",
          data.callerId,
        );
        await handleIceCandidate(data.callerId, data.candidate);
      },
    );

    socketInstance.on(
      "call:accepted",
      (data: { acceptedBy: number; roomId: number; userName?: string }) => {
        console.log("[GlobalCallContext] Call accepted by:", data.acceptedBy);

        // Only set state if we're the initiator waiting for acceptance
        if (callState !== "active") {
          setCallState("active");
          callStartTimeRef.current = Date.now();
        }

        // Add to participants list if not already there
        setParticipants((prev) => {
          if (prev.some((p) => p.id === data.acceptedBy)) {
            return prev;
          }
          return [
            ...prev,
            {
              id: data.acceptedBy,
              name: data.userName || `User ${data.acceptedBy}`,
            },
          ];
        });

        // Create offer to the user who just accepted
        makeOffer(data.acceptedBy);
      },
    );

    socketInstance.on(
      "call:user-joined",
      (data: { userId: number; roomId: number; userName?: string }) => {
        console.log("[GlobalCallContext] User joined call:", data.userId);

        // If we're already in an active call and someone else joins, create offer to them
        if (
          callState === "active" &&
          data.userId !== currentUserIdRef.current
        ) {
          console.log(
            "[GlobalCallContext] Creating offer to newly joined user:",
            data.userId,
          );
          makeOffer(data.userId);

          // Add to participants list if not already there
          setParticipants((prev) => {
            if (prev.some((p) => p.id === data.userId)) {
              return prev;
            }
            return [
              ...prev,
              {
                id: data.userId,
                name: data.userName || `User ${data.userId}`,
              },
            ];
          });
        }
      },
    );

    // New handler: Notify newly joined user of all existing participants
    socketInstance.on(
      "call:existing-participants",
      (data: { participants: Array<{ userId: number; userName: string }> }) => {
        console.log(
          "[GlobalCallContext] Received existing participants:",
          data.participants,
        );

        // Add existing participants to the list
        // Don't create offers here - existing participants will offer to us
        data.participants.forEach((participant) => {
          if (participant.userId !== currentUserIdRef.current) {
            console.log(
              "[GlobalCallContext] Adding existing participant:",
              participant.userId,
            );

            setParticipants((prev) => {
              if (prev.some((p) => p.id === participant.userId)) {
                return prev;
              }
              return [
                ...prev,
                {
                  id: participant.userId,
                  name: participant.userName,
                },
              ];
            });
          }
        });
      },
    );

    socketInstance.on(
      "call:rejected",
      (data: { rejectedBy: number; roomId: number; callEnded?: boolean }) => {
        console.log("[GlobalCallContext] Call rejected by:", data.rejectedBy);

        // Only end the call if explicitly told to (no other participants accepted)
        if (data.callEnded) {
          resetCallState();
        } else {
          // Call continues with other participants - just log the rejection
          console.log(
            "[GlobalCallContext] Call continues with other participants",
          );
        }
      },
    );

    socketInstance.on(
      "call:ended",
      (data: { endedBy: number; roomId: number }) => {
        console.log("[GlobalCallContext] Call ended by:", data.endedBy);
        resetCallState();
      },
    );

    socketInstance.on(
      "call:user-left",
      (data: { userId: number; roomId: number }) => {
        console.log("[GlobalCallContext] User left call:", data.userId);

        // Remove participant from list
        setParticipants((prev) => prev.filter((p) => p.id !== data.userId));

        // Close peer connection to this user
        closePeerConnection(data.userId);
      },
    );

    return () => {
      socketInstance.off("call:incoming");
      socketInstance.off("call:offer");
      socketInstance.off("call:answer");
      socketInstance.off("call:ice-candidate");
      socketInstance.off("call:accepted");
      socketInstance.off("call:user-joined");
      socketInstance.off("call:existing-participants");
      socketInstance.off("call:user-left");
      socketInstance.off("call:rejected");
      socketInstance.off("call:ended");
    };
  }, [
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    makeOffer,
    closePeerConnection,
    callState,
    resetCallState,
  ]);

  // Initiate a call
  const initiateCall = useCallback(
    async (
      rid: number,
      type: CallType,
      parts: CallParticipant[],
      rName?: string,
      isGrp?: boolean,
    ) => {
      console.log("[GlobalCallContext] Initiating call:", { rid, type, parts });

      // Don't allow starting a call if already in one
      if (callState !== "idle") {
        console.warn(
          "[GlobalCallContext] Cannot initiate call - already in a call",
        );
        return;
      }

      setCallType(type);
      setRoomId(rid);
      setRoomName(rName || null);
      setIsGroup(isGrp || false);
      setParticipants(parts);
      setCallState("active");
      callStartTimeRef.current = Date.now();

      try {
        console.log(
          "[GlobalCallContext] Requesting media stream for type:",
          type,
        );
        await startStream(type);
        console.log("[GlobalCallContext] Media stream started successfully");
      } catch (error) {
        console.error(
          "[GlobalCallContext] Failed to start media stream:",
          error,
        );
        resetCallState();
        alert(
          "Impossible d'accéder au microphone/caméra. Veuillez autoriser l'accès dans les paramètres du navigateur.",
        );
        return;
      }

      const socketInstance = getSocket();
      const participantIds = parts.map((p) => p.id);

      socketInstance.emit(
        "call:initiate",
        {
          roomId: rid,
          callType: type,
          participants: [currentUserIdRef.current, ...participantIds],
        },
        (response: any) => {
          if (response?.success && response?.callId) {
            callIdRef.current = response.callId;
            console.log(
              "[GlobalCallContext] Call initiated with ID:",
              response.callId,
            );
          } else {
            console.error(
              "[GlobalCallContext] Failed to initiate call:",
              response,
            );
            resetCallState();
            alert(
              "Erreur lors de l'initiation de l'appel. Veuillez réessayer.",
            );
          }
        },
      );
    },
    [startStream, resetCallState, callState],
  );

  // Accept incoming call
  const acceptCall = useCallback(async () => {
    if (!incomingCallData) {
      console.warn("[GlobalCallContext] No incoming call to accept");
      return;
    }

    console.log("[GlobalCallContext] Accepting call:", incomingCallData);

    const incomingType = incomingCallData.callType;
    setCallType(incomingType);
    setRoomId(incomingCallData.roomId);
    setCallState("active");
    callStartTimeRef.current = Date.now();

    // Set caller as participant
    setParticipants([
      {
        id: incomingCallData.callerId,
        name: incomingCallData.callerName,
        avatar: incomingCallData.callerAvatar,
      },
    ]);

    try {
      console.log(
        "[GlobalCallContext] Requesting media stream for incoming call type:",
        incomingType,
      );
      await startStream(incomingType);
      console.log("[GlobalCallContext] Media stream started for incoming call");
    } catch (error) {
      console.error("[GlobalCallContext] Failed to start media stream:", error);
      resetCallState();
      alert("Impossible d'accéder au microphone/caméra.");
      return;
    }

    // Save the callId for later use
    callIdRef.current = incomingCallData.callId;

    const socketInstance = getSocket();
    socketInstance.emit("call:accept", {
      roomId: incomingCallData.roomId,
      callerId: incomingCallData.callerId,
      callId: incomingCallData.callId,
    });

    setIncomingCallData(null);
  }, [incomingCallData, startStream, resetCallState]);

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (!incomingCallData) return;

    console.log("[GlobalCallContext] Rejecting call:", incomingCallData);

    const socketInstance = getSocket();
    socketInstance.emit("call:reject", {
      roomId: incomingCallData.roomId,
      callerId: incomingCallData.callerId,
      callId: incomingCallData.callId,
    });

    resetCallState();
  }, [incomingCallData, resetCallState]);

  // End active call
  const endCall = useCallback(() => {
    if (!roomId) return;

    console.log("[GlobalCallContext] Ending call:", {
      roomId,
      callId: callIdRef.current,
    });

    const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
    const participantIds = participants.map((p) => p.id);

    const socketInstance = getSocket();
    socketInstance.emit("call:end", {
      roomId,
      participants: [currentUserIdRef.current, ...participantIds],
      duration,
      callId: callIdRef.current,
    });

    resetCallState();
  }, [roomId, participants, resetCallState]);

  // Toggle minimize
  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    console.log("[GlobalCallContext] toggleAudio called");
    console.log("[GlobalCallContext] localStream exists:", !!localStream);
    console.log("[GlobalCallContext] Current isAudioEnabled:", isAudioEnabled);

    if (!localStream) {
      console.error(
        "[GlobalCallContext] Cannot toggle audio - no local stream!",
      );
      return;
    }

    const newState = toggleAudioStream();
    console.log("[GlobalCallContext] Audio toggled to:", newState);

    // Log current track states
    const audioTracks = localStream.getAudioTracks();
    console.log(
      "[GlobalCallContext] Audio tracks after toggle:",
      audioTracks.map((t) => ({
        id: t.id,
        enabled: t.enabled,
        label: t.label,
        readyState: t.readyState,
      })),
    );
  }, [toggleAudioStream, localStream, isAudioEnabled]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    const newState = toggleVideoStream();
    console.log("[GlobalCallContext] Video toggled to:", newState);

    // Log current track states
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      console.log(
        "[GlobalCallContext] Video tracks after toggle:",
        videoTracks.map((t) => ({
          id: t.id,
          enabled: t.enabled,
          label: t.label,
        })),
      );
    }
  }, [toggleVideoStream, localStream]);

  const value = useMemo<GlobalCallContextValue>(
    () => ({
      callState,
      isMinimized,
      callType,
      roomId,
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
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMinimize,
      toggleAudio,
      toggleVideo,
    }),
    [
      callState,
      isMinimized,
      callType,
      roomId,
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
      initiateCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMinimize,
      toggleAudio,
      toggleVideo,
    ],
  );

  return (
    <GlobalCallContext.Provider value={value}>
      {children}
    </GlobalCallContext.Provider>
  );
}

export function useGlobalCall() {
  const context = useContext(GlobalCallContext);
  if (!context) {
    throw new Error("useGlobalCall must be used within GlobalCallProvider");
  }
  return context;
}
