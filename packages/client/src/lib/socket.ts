import { io, type Socket } from "socket.io-client";

// The WebSocket gateway attaches to the root NestJS HTTP server (no port
// option in @WebSocketGateway), which is the same host as the REST API
// but without the /api prefix.
const SOCKET_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace("/api", "") ??
  "http://localhost:3000";

let socket: Socket | null = null;

/**
 * Returns the singleton socket instance.
 * Creates it on first call; subsequent calls return the same instance.
 *
 * autoConnect is intentionally false — the caller must call socket.connect()
 * inside a React useEffect, never at module evaluation time.
 * This avoids React 19 dispatcher issues caused by synchronous socket events
 * firing during component render.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // Backend reads the JWT from client.handshake.auth.token
      auth: { token: localStorage.getItem("token") ?? "" },
      transports: ["websocket"],
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
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
