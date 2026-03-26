import { io, type Socket } from "socket.io-client";

// Strip /api suffix to get the WebSocket base URL
const SOCKET_URL =
  (import.meta.env.VITE_API_URL as string | undefined)
    ?.replace(/\/api\/?$/, "")
    .replace(/\/$/, "") ?? "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Returns the singleton socket instance.
 * Creates it on first call; subsequent calls return the same instance.
 */
export function getSocket(): Socket {
  if (!socket) {
    console.log("[socket.ts] creating new socket instance, url:", SOCKET_URL);
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") ?? "" },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
  }
  return socket;
}

/** Connect (or reconnect) with a fresh token */
export function connectSocket(): void {
  const s = getSocket();
  // Always refresh token before connecting
  const token = localStorage.getItem("token") ?? "";
  console.log(
    "[socket.ts] connectSocket called, token present:",
    !!token,
    "| connected:",
    s.connected,
    "| url:",
    SOCKET_URL,
  );
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
}

/**
 * Disconnect without destroying the singleton.
 * Use this when navigating away — the socket can reconnect later.
 */
export function disconnectSocket(): void {
  socket?.disconnect();
  // Do NOT null out socket — keep the singleton for reconnection
}

/**
 * Fully destroy the singleton (call on logout only).
 */
export function destroySocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Whether the socket is currently connected */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
