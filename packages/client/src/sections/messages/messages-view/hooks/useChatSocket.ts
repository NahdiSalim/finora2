import { useEffect, useCallback, useRef } from "react";
import { getSocket } from "src/lib/socket";

// ── Payload types matching the backend gateway exactly ──────────────────────

export interface SocketMessagePayload {
  id: number;
  roomId: number;
  senderId: number;
  content: string;
  type: "text" | "file" | "image" | "system";
  createdAt: string;
  updatedAt: string;
  mentions: string[];
  readBy: string[];
  deleted: boolean;
  edited: boolean;
  attachments?: string[];
  sender?: {
    id: number;
    username?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface SocketTypingPayload {
  roomId: number;
  userId: number;
  typing: boolean;
}

export interface SocketUserStatusPayload {
  userId: number;
}

// ── Hook options — all callbacks are optional ────────────────────────────────

export interface UseChatSocketOptions {
  /** Called when a new message arrives on any joined room */
  onMessageNew?: (msg: SocketMessagePayload) => void;
  /** Called when a remote user starts or stops typing */
  onTyping?: (data: SocketTypingPayload) => void;
  /** Called when any user comes online */
  onUserOnline?: (data: SocketUserStatusPayload) => void;
  /** Called when any user goes offline */
  onUserOffline?: (data: SocketUserStatusPayload) => void;
}

// ── Hook return ──────────────────────────────────────────────────────────────

export interface UseChatSocketReturn {
  /** Connect the socket — no-op if already connected */
  connect: () => void;
  /** Disconnect the socket */
  disconnect: () => void;
  /** Emit room:join for the given roomId */
  joinRoom: (roomId: number) => void;
  /** Emit room:leave for the given roomId */
  leaveRoom: (roomId: number) => void;
  /** Emit message:send for a text message */
  sendMessage: (roomId: number, content: string) => void;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useChatSocket(
  options: UseChatSocketOptions = {},
): UseChatSocketReturn {
  // Keep option callbacks in refs so event listeners never go stale
  // when the parent re-renders with new function references
  const onMessageNewRef = useRef(options.onMessageNew);
  const onTypingRef = useRef(options.onTyping);
  const onUserOnlineRef = useRef(options.onUserOnline);
  const onUserOfflineRef = useRef(options.onUserOffline);

  useEffect(() => {
    onMessageNewRef.current = options.onMessageNew;
  }, [options.onMessageNew]);
  useEffect(() => {
    onTypingRef.current = options.onTyping;
  }, [options.onTyping]);
  useEffect(() => {
    onUserOnlineRef.current = options.onUserOnline;
  }, [options.onUserOnline]);
  useEffect(() => {
    onUserOfflineRef.current = options.onUserOffline;
  }, [options.onUserOffline]);

  useEffect(() => {
    const socket = getSocket();

    // ── Connection lifecycle ──────────────────────────────────────────────
    const onConnect = () =>
      console.log("[useChatSocket] connected:", socket.id);

    const onDisconnect = (reason: string) =>
      console.log("[useChatSocket] disconnected:", reason);

    const onConnectError = (err: Error) =>
      console.error("[useChatSocket] connect_error:", err.message);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    // ── Incoming events — delegate to stable refs ─────────────────────────
    const onMessageNew = (msg: SocketMessagePayload) =>
      onMessageNewRef.current?.(msg);

    const onTyping = (data: SocketTypingPayload) => onTypingRef.current?.(data);

    const onUserOnline = (data: SocketUserStatusPayload) =>
      onUserOnlineRef.current?.(data);

    const onUserOffline = (data: SocketUserStatusPayload) =>
      onUserOfflineRef.current?.(data);

    socket.on("message:new", onMessageNew);
    socket.on("user:typing", onTyping);
    socket.on("user:online", onUserOnline);
    socket.on("user:offline", onUserOffline);

    // Connect now if not already connected (autoConnect is false in socket.ts)
    if (!socket.connected) {
      socket.connect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("message:new", onMessageNew);
      socket.off("user:typing", onTyping);
      socket.off("user:online", onUserOnline);
      socket.off("user:offline", onUserOffline);
    };
  }, []); // empty deps — listeners are stable via refs, socket is a singleton

  // ── Public API ────────────────────────────────────────────────────────────

  const connect = useCallback(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();
  }, []);

  const disconnect = useCallback(() => {
    getSocket().disconnect();
  }, []);

  const joinRoom = useCallback((roomId: number) => {
    getSocket().emit("room:join", { roomId });
  }, []);

  const leaveRoom = useCallback((roomId: number) => {
    getSocket().emit("room:leave", { roomId });
  }, []);

  const sendMessage = useCallback((roomId: number, content: string) => {
    getSocket().emit("message:send", { roomId, content, type: "text" });
  }, []);

  return { connect, disconnect, joinRoom, leaveRoom, sendMessage };
}
