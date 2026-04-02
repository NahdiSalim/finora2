import { useState, useCallback, useEffect, useRef } from "react";
import { getSocket } from "src/lib/socket";

export type RemoteStream = {
  userId: number;
  stream: MediaStream;
};

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export function useWebRTC(roomId: number, localStream: MediaStream | null) {
  const [peers, setPeers] = useState<Map<number, RTCPeerConnection>>(new Map());
  const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
  const [connectionErrors, setConnectionErrors] = useState<Map<number, string>>(
    new Map(),
  );
  const socket = getSocket();
  const peersRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  const pendingIceCandidatesRef = useRef<Map<number, RTCIceCandidateInit[]>>(
    new Map(),
  );

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  const createPeerConnection = useCallback(
    (userId: number): RTCPeerConnection => {
      console.log("[useWebRTC] Creating peer connection for user:", userId);

      const existingPeer = peersRef.current.get(userId);
      if (existingPeer) {
        console.log(
          "[useWebRTC] Peer connection already exists for user:",
          userId,
        );
        return existingPeer;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStream) {
        localStream.getTracks().forEach((track) => {
          console.log(
            "[useWebRTC] Adding local track:",
            track.kind,
            "enabled:",
            track.enabled,
            "id:",
            track.id,
          );
          pc.addTrack(track, localStream);
        });
        console.log(
          "[useWebRTC] Total tracks added:",
          localStream.getTracks().length,
        );
      } else {
        console.warn(
          "[useWebRTC] No local stream available when creating peer connection",
        );
      }

      pc.ontrack = (event) => {
        console.log("[useWebRTC] Received remote track from user:", userId, {
          kind: event.track.kind,
          id: event.track.id,
          enabled: event.track.enabled,
          muted: event.track.muted,
          readyState: event.track.readyState,
          label: event.track.label,
        });

        const stream = event.streams[0];
        if (stream) {
          console.log("[useWebRTC] Remote stream info:", {
            id: stream.id,
            active: stream.active,
            audioTracks: stream.getAudioTracks().length,
            videoTracks: stream.getVideoTracks().length,
          });
        }

        setRemoteStreams((prev) => {
          const existing = prev.find((rs) => rs.userId === userId);
          if (existing) {
            console.log(
              "[useWebRTC] Updating existing remote stream for user:",
              userId,
            );
            return prev.map((rs) =>
              rs.userId === userId ? { userId, stream: event.streams[0] } : rs,
            );
          }
          console.log("[useWebRTC] Adding new remote stream for user:", userId);
          return [...prev, { userId, stream: event.streams[0] }];
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[useWebRTC] Sending ICE candidate to user:", userId);
          socket.emit("call:ice-candidate", {
            roomId,
            targetUserId: userId,
            candidate: event.candidate,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(
          "[useWebRTC] ICE connection state:",
          pc.iceConnectionState,
          "for user:",
          userId,
        );

        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          // Clear any previous errors for this user
          setConnectionErrors((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }

        if (pc.iceConnectionState === "failed") {
          console.error("[useWebRTC] ICE connection failed for user:", userId);
          setConnectionErrors((prev) =>
            new Map(prev).set(userId, "Connection failed"),
          );
          // Try to restart ICE
          try {
            pc.restartIce();
          } catch (error) {
            console.error("[useWebRTC] Error restarting ICE:", error);
          }
        }

        if (pc.iceConnectionState === "disconnected") {
          console.warn("[useWebRTC] Connection disconnected for user:", userId);
          setConnectionErrors((prev) =>
            new Map(prev).set(userId, "Connection lost"),
          );
          // Wait a bit before closing - might reconnect
          setTimeout(() => {
            if (
              pc.iceConnectionState === "disconnected" ||
              pc.iceConnectionState === "failed"
            ) {
              console.warn(
                "[useWebRTC] Connection still disconnected, closing for user:",
                userId,
              );
              closePeerConnection(userId);
            }
          }, 5000);
        }

        if (pc.iceConnectionState === "closed") {
          closePeerConnection(userId);
        }
      };

      pc.onconnectionstatechange = () => {
        console.log(
          "[useWebRTC] Connection state:",
          pc.connectionState,
          "for user:",
          userId,
        );

        if (pc.connectionState === "connected") {
          console.log(
            "[useWebRTC] Peer connection established for user:",
            userId,
          );
          setConnectionErrors((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }

        if (pc.connectionState === "failed") {
          console.error("[useWebRTC] Peer connection failed for user:", userId);
          setConnectionErrors((prev) =>
            new Map(prev).set(userId, "Peer connection failed"),
          );
          closePeerConnection(userId);
        }
      };

      pc.onicegatheringstatechange = () => {
        console.log(
          "[useWebRTC] ICE gathering state:",
          pc.iceGatheringState,
          "for user:",
          userId,
        );
      };

      pc.onnegotiationneeded = async () => {
        console.log("[useWebRTC] Negotiation needed for user:", userId);
      };

      setPeers((prev) => new Map(prev).set(userId, pc));
      peersRef.current.set(userId, pc);

      return pc;
    },
    [localStream, roomId, socket],
  );

  const makeOffer = useCallback(
    async (userId: number, retryCount: number = 0) => {
      console.log(
        "[useWebRTC] Making offer to user:",
        userId,
        "retry:",
        retryCount,
      );
      const pc = createPeerConnection(userId);

      try {
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);

        socket.emit("call:offer", {
          roomId,
          targetUserId: userId,
          offer,
        });

        console.log("[useWebRTC] Offer sent to user:", userId);

        // Clear any previous errors for this user
        setConnectionErrors((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      } catch (error) {
        console.error("[useWebRTC] Error creating offer:", error);
        setConnectionErrors((prev) =>
          new Map(prev).set(userId, "Failed to create connection offer"),
        );

        // Retry up to 2 times
        if (retryCount < 2) {
          console.log("[useWebRTC] Retrying offer creation for user:", userId);
          setTimeout(
            () => {
              makeOffer(userId, retryCount + 1);
            },
            1000 * (retryCount + 1),
          );
        }
      }
    },
    [createPeerConnection, roomId, socket],
  );

  const handleOffer = useCallback(
    async (userId: number, offer: RTCSessionDescriptionInit) => {
      console.log("[useWebRTC] Handling offer from user:", userId);
      const pc = createPeerConnection(userId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          roomId,
          targetUserId: userId,
          answer,
        });

        console.log("[useWebRTC] Answer sent to user:", userId);

        // Process any pending ICE candidates now that remote description is set
        const pendingCandidates =
          pendingIceCandidatesRef.current.get(userId) || [];
        if (pendingCandidates.length > 0) {
          console.log(
            "[useWebRTC] Processing",
            pendingCandidates.length,
            "pending ICE candidates for user:",
            userId,
          );
          for (const candidate of pendingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              console.error(
                "[useWebRTC] Error adding pending ICE candidate:",
                error,
              );
            }
          }
          pendingIceCandidatesRef.current.delete(userId);
        }
      } catch (error) {
        console.error("[useWebRTC] Error handling offer:", error);
      }
    },
    [createPeerConnection, roomId, socket],
  );

  const handleAnswer = useCallback(
    async (userId: number, answer: RTCSessionDescriptionInit) => {
      console.log("[useWebRTC] Handling answer from user:", userId);
      const pc = peersRef.current.get(userId);

      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
          console.log("[useWebRTC] Remote description set for user:", userId);

          // Process any pending ICE candidates now that remote description is set
          const pendingCandidates =
            pendingIceCandidatesRef.current.get(userId) || [];
          if (pendingCandidates.length > 0) {
            console.log(
              "[useWebRTC] Processing",
              pendingCandidates.length,
              "pending ICE candidates for user:",
              userId,
            );
            for (const candidate of pendingCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch (error) {
                console.error(
                  "[useWebRTC] Error adding pending ICE candidate:",
                  error,
                );
              }
            }
            pendingIceCandidatesRef.current.delete(userId);
          }
        } catch (error) {
          console.error("[useWebRTC] Error handling answer:", error);
        }
      } else {
        console.warn("[useWebRTC] No peer connection found for user:", userId);
      }
    },
    [],
  );

  const handleIceCandidate = useCallback(
    async (userId: number, candidate: RTCIceCandidateInit) => {
      console.log("[useWebRTC] Received ICE candidate from user:", userId);
      const pc = peersRef.current.get(userId);

      if (pc) {
        // Only add if remote description is set, otherwise queue it
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
            console.log("[useWebRTC] ICE candidate added for user:", userId);
          } catch (error) {
            console.error("[useWebRTC] Error adding ICE candidate:", error);
          }
        } else {
          console.log(
            "[useWebRTC] Queuing ICE candidate (remote description not set yet) for user:",
            userId,
          );
          const pending = pendingIceCandidatesRef.current.get(userId) || [];
          pending.push(candidate);
          pendingIceCandidatesRef.current.set(userId, pending);
        }
      } else {
        console.warn(
          "[useWebRTC] No peer connection found for user:",
          userId,
          "- queuing candidate",
        );
        const pending = pendingIceCandidatesRef.current.get(userId) || [];
        pending.push(candidate);
        pendingIceCandidatesRef.current.set(userId, pending);
      }
    },
    [],
  );

  const closePeerConnection = useCallback((userId: number) => {
    console.log("[useWebRTC] Closing peer connection for user:", userId);
    const pc = peersRef.current.get(userId);

    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
      setPeers((prev) => {
        const newMap = new Map(prev);
        newMap.delete(userId);
        return newMap;
      });
    }

    // Clean up pending ICE candidates
    pendingIceCandidatesRef.current.delete(userId);

    setRemoteStreams((prev) => prev.filter((rs) => rs.userId !== userId));
  }, []);

  const closeAllConnections = useCallback(() => {
    console.log("[useWebRTC] Closing all peer connections");
    peersRef.current.forEach((pc, userId) => {
      pc.close();
      console.log("[useWebRTC] Closed connection for user:", userId);
    });
    peersRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    setPeers(new Map());
    setRemoteStreams([]);
  }, []);

  // When local stream changes, update all existing peer connections
  useEffect(() => {
    if (!localStream) return;

    console.log(
      "[useWebRTC] Local stream updated, adding tracks to existing peers",
    );

    peersRef.current.forEach((pc, userId) => {
      // Check if tracks are already added
      const senders = pc.getSenders();
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];

      // Add or replace audio track
      if (audioTrack) {
        const audioSender = senders.find((s) => s.track?.kind === "audio");
        if (audioSender) {
          audioSender.replaceTrack(audioTrack).catch((err) => {
            console.error("[useWebRTC] Error replacing audio track:", err);
          });
        } else {
          pc.addTrack(audioTrack, localStream);
          console.log(
            "[useWebRTC] Added audio track to existing peer:",
            userId,
          );
        }
      }

      // Add or replace video track
      if (videoTrack) {
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(videoTrack).catch((err) => {
            console.error("[useWebRTC] Error replacing video track:", err);
          });
        } else {
          pc.addTrack(videoTrack, localStream);
          console.log(
            "[useWebRTC] Added video track to existing peer:",
            userId,
          );
        }
      }
    });
  }, [localStream]);

  useEffect(() => {
    return () => {
      closeAllConnections();
    };
  }, [closeAllConnections]);

  return {
    peers,
    remoteStreams,
    connectionErrors,
    createPeerConnection,
    makeOffer,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeerConnection,
    closeAllConnections,
  };
}
