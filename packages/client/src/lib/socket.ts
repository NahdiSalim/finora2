import { io, type Socket } from "socket.io-client";

// The WebSocket gateway attaches to the root NestJS HTTP server (same host as
// the REST API, but without the /api suffix).
const SOCKET_URL =
  (import.meta.env.VITE_API_URL as string | undefined)
    ?.replace(/\/api\/?$/, "")
    .replace(/\/$/, "") ?? "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Returns the singleton socket instance.
 * Creates it on first call; subsequent calls return the same instance.
 *
 * autoConnect is intentionally false — the caller must call connectSocket()
 * inside a React useEffect, never at module evaluation time.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") ?? "" },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }

  return socket;
}

/** Connect (or reconnect) with a fresh token */
export function connectSocket(): void {
  const s = getSocket();
  s.auth = { token: localStorage.getItem("token") ?? "" };

  if (!s.connected) {
    s.connect();
  }
}

/**
 * Disconnects and destroys the singleton.
 * Call this on logout so the next getSocket() picks up a fresh token.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Whether the socket is currently connected */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
