import { io, type Socket } from "socket.io-client";

// Strip /api suffix to get the WebSocket base URL
const SOCKET_URL =
  (import.meta.env.VITE_API_URL as string | undefined)
    ?.replace(/\/api\/?$/, "")
    .replace(/\/$/, "") ?? "http://localhost:3000";

let socket: Socket | null = null;

function readTokenFromStorage(): string {
  return localStorage.getItem("token") ?? "";
}

function syncAuthToken(s: Socket): void {
  const token = readTokenFromStorage();
  s.auth = { token };
}

/**
 * Returns the singleton socket instance.
 * Creates it on first call; subsequent calls return the same instance.
 */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: readTokenFromStorage() },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const s = socket;

    s.io.on("reconnect_attempt", () => {
      syncAuthToken(s);
    });
  }
  return socket;
}

/** Connect (or reconnect) with a fresh token */
export function connectSocket(): void {
  const s = getSocket();
  const token = readTokenFromStorage();
  s.auth = { token };
  if (!s.connected) {
    s.connect();
  }
}

/**
 * Update socket auth with the latest token and force a fresh connection.
 * Call this after a successful token refresh so the socket doesn't keep
 * retrying with the expired token.
 */
export function reconnectSocketWithFreshToken(): void {
  const s = getSocket();
  const token = readTokenFromStorage();
  s.auth = { token };
  if (s.connected) {
    s.disconnect();
  }
  s.connect();
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
