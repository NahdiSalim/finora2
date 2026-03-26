import { useEffect, useRef } from "react";
import { connectSocket, getSocket } from "src/lib/socket";

// ── Incoming event shapes ────────────────────────────────────────────────────

export interface SocketMessage {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  type: string;
  createdAt: string;
  fileUrl?: string | null;
  attachments?: string[];
  sender?: {
    id: number;
    username?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface TypingPayload {
  roomId: number;
  userId: number;
  typing: boolean;
}

// ── Hook options ─────────────────────────────────────────────────────────────

interface UseChatSocketOptions {
  onMessageNew?: (msg: SocketMessage) => void;
  onMessageUpdated?: (msg: SocketMessage) => void;
  onMessageDeleted?: (data: { messageId: number; roomId?: number }) => void;
  onTyping?: (data: TypingPayload) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChatSocket(options: UseChatSocketOptions = {}) {
  // Keep options in a ref so callbacks never go stale without re-subscribing
  const optsRef = useRef(options);
  optsRef.current = options;

  useEffect(() => {
    connectSocket();
    const socket = getSocket();

    // Named handlers — required for proper cleanup (no anonymous functions)
    const onMessageNew = (msg: SocketMessage) =>
      optsRef.current.onMessageNew?.(msg);
    const onMessageUpdated = (msg: SocketMessage) =>
      optsRef.current.onMessageUpdated?.(msg);
    const onMessageDeleted = (data: { messageId: number; roomId?: number }) =>
      optsRef.current.onMessageDeleted?.(data);
    const onTyping = (data: TypingPayload) => optsRef.current.onTyping?.(data);

    socket.on("message:new", onMessageNew);
    socket.on("message:updated", onMessageUpdated);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("user:typing", onTyping);

    return () => {
      socket.off("message:new", onMessageNew);
      socket.off("message:updated", onMessageUpdated);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("user:typing", onTyping);
    };
    // Empty deps: connect once, cleanup on unmount
  }, []);

  // ── Emitters ────────────────────────────────────────────────────────────

  const joinRoom = (roomId: number) => {
    getSocket().emit("room:join", { roomId });
  };

  const leaveRoom = (roomId: number) => {
    getSocket().emit("room:leave", { roomId });
  };

  const emitTyping = (roomId: number, typing: boolean) => {
    getSocket().emit(typing ? "typing:start" : "typing:stop", { roomId });
  };

  return { joinRoom, leaveRoom, emitTyping };
}
