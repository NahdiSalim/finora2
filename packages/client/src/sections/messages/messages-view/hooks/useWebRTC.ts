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
      const existingPeer = peersRef.current.get(userId);
      if (existingPeer) {
        return existingPeer;
      }

      const pc = new RTCPeerConnection(ICE_SERVERS);

      if (localStream) {
        const tracks = localStream.getTracks();

        tracks.forEach((track) => {
          // Ensure track is enabled
          if (!track.enabled) {
            track.enabled = true;
          }

          pc.addTrack(track, localStream);
        });
      }

      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const existing = prev.find((rs) => rs.userId === userId);
          if (existing) {
            return prev.map((rs) =>
              rs.userId === userId ? { userId, stream: event.streams[0] } : rs,
            );
          }
          return [...prev, { userId, stream: event.streams[0] }];
        });
      };

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("call:ice-candidate", {
            roomId,
            targetUserId: userId,
            candidate: event.candidate,
          });
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "connected" ||
          pc.iceConnectionState === "completed"
        ) {
          setConnectionErrors((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }

        if (pc.iceConnectionState === "failed") {
          setConnectionErrors((prev) =>
            new Map(prev).set(userId, "Connection failed"),
          );
          try {
            pc.restartIce();
          } catch (error) {
            // ICE restart failed
          }
        }

        if (pc.iceConnectionState === "disconnected") {
          setConnectionErrors((prev) =>
            new Map(prev).set(userId, "Connection lost"),
          );
          setTimeout(() => {
            if (
              pc.iceConnectionState === "disconnected" ||
              pc.iceConnectionState === "failed"
            ) {
              closePeerConnection(userId);
            }
          }, 5000);
        }

        if (pc.iceConnectionState === "closed") {
          closePeerConnection(userId);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") {
          setConnectionErrors((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }

        if (pc.connectionState === "failed") {
          setConnectionErrors((prev) =>
            new Map(prev).set(userId, "Peer connection failed"),
          );
          closePeerConnection(userId);
        }
      };

      setPeers((prev) => new Map(prev).set(userId, pc));
      peersRef.current.set(userId, pc);

      return pc;
    },
    [localStream, roomId, socket],
  );

  const makeOffer = useCallback(
    async (userId: number, retryCount: number = 0) => {
      if (!localStream) {
        return;
      }

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

        setConnectionErrors((prev) => {
          const next = new Map(prev);
          next.delete(userId);
          return next;
        });
      } catch (error) {
        setConnectionErrors((prev) =>
          new Map(prev).set(userId, "Failed to create connection offer"),
        );

        if (retryCount < 2) {
          setTimeout(
            () => {
              makeOffer(userId, retryCount + 1);
            },
            1000 * (retryCount + 1),
          );
        }
      }
    },
    [createPeerConnection, roomId, socket, localStream],
  );

  const handleOffer = useCallback(
    async (userId: number, offer: RTCSessionDescriptionInit) => {
      if (!localStream) {
        // Wait a bit for localStream to be ready
        await new Promise((resolve) => setTimeout(resolve, 1000));

        if (!localStream) {
          return;
        }
      }

      const pc = createPeerConnection(userId);

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        const answer = await pc.createAnswer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });

        await pc.setLocalDescription(answer);

        socket.emit("call:answer", {
          roomId,
          targetUserId: userId,
          answer,
        });

        const pendingCandidates =
          pendingIceCandidatesRef.current.get(userId) || [];
        if (pendingCandidates.length > 0) {
          for (const candidate of pendingCandidates) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch (error) {
              // Failed to add ICE candidate
            }
          }
          pendingIceCandidatesRef.current.delete(userId);
        }
      } catch (error) {
        // Failed to handle offer
      }
    },
    [createPeerConnection, roomId, socket, localStream],
  );

  const handleAnswer = useCallback(
    async (userId: number, answer: RTCSessionDescriptionInit) => {
      const pc = peersRef.current.get(userId);

      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));

          const pendingCandidates =
            pendingIceCandidatesRef.current.get(userId) || [];
          if (pendingCandidates.length > 0) {
            for (const candidate of pendingCandidates) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch {
                /* ignored */
              }
            }
          }
        } catch {
          /* ignored */
        }
      } catch (error) {
        // Failed to handle answer
      }
    },
    [],
  );

  const handleIceCandidate = useCallback(
    async (userId: number, candidate: RTCIceCandidateInit) => {
      const pc = peersRef.current.get(userId);

      if (pc) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch {
            /* ignored */
          }
        } else {
          const pending = pendingIceCandidatesRef.current.get(userId) || [];
          pending.push(candidate);
          pendingIceCandidatesRef.current.set(userId, pending);
        }
      } else {
        const pending = pendingIceCandidatesRef.current.get(userId) || [];
        pending.push(candidate);
        pendingIceCandidatesRef.current.set(userId, pending);
      }
    },
    [],
  );

  const closePeerConnection = useCallback((userId: number) => {
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

    pendingIceCandidatesRef.current.delete(userId);
    setRemoteStreams((prev) => prev.filter((rs) => rs.userId !== userId));
  }, []);

  const closeAllConnections = useCallback(() => {
    peersRef.current.forEach((pc) => {
      pc.close();
    });
    peersRef.current.clear();
    pendingIceCandidatesRef.current.clear();
    setPeers(new Map());
    setRemoteStreams([]);
  }, []);

  useEffect(() => {
    if (!localStream) {
      return;
    }

    peersRef.current.forEach((pc, userId) => {
      const senders = pc.getSenders();
      const audioTrack = localStream.getAudioTracks()[0];
      const videoTrack = localStream.getVideoTracks()[0];

      if (audioTrack) {
        const audioSender = senders.find((s) => s.track?.kind === "audio");
        if (audioSender) {
          audioSender.replaceTrack(audioTrack).catch(() => {
            /* ignored */
          });
        } else {
          pc.addTrack(audioTrack, localStream);
        }
      }

      if (videoTrack) {
        const videoSender = senders.find((s) => s.track?.kind === "video");
        if (videoSender) {
          videoSender.replaceTrack(videoTrack).catch(() => {
            /* ignored */
          });
        } else {
          pc.addTrack(videoTrack, localStream);
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
