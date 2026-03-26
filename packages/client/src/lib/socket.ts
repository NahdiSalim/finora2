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
  // Keep logs short but still useful to debug reconnect/auth issues
  console.log("[socket.ts] syncAuthToken called:", {
    tokenPresent: !!token,
    tokenLength: token ? token.length : 0,
    connected: s.connected,
    socketId: s.id,
  });
  s.auth = { token };
}

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
      auth: { token: readTokenFromStorage() },
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const s = socket;

    // Central lifecycle logs (helps identify reconnect/token issues)
    s.on("connect", () => {
      console.log("[socket.ts] connected:", { socketId: s.id });
    });
    s.on("disconnect", (reason: string) => {
      console.warn("[socket.ts] disconnected:", { reason, socketId: s.id });
    });
    s.on("connect_error", (err: Error) => {
      console.error("[socket.ts] connect_error:", err.message);
    });

    // Ensure auth token is up-to-date on every reconnect attempt
    s.io.on("reconnect_attempt", (attempt: number) => {
      console.log("[socket.ts] reconnect_attempt:", { attempt });
      syncAuthToken(s);
    });
    s.io.on("reconnect", (attempt: number) => {
      console.log("[socket.ts] reconnect:", { attempt });
    });
    s.io.on("reconnect_failed", () => {
      console.error("[socket.ts] reconnect_failed");
    });
  }
  return socket;
}

/** Connect (or reconnect) with a fresh token */
export function connectSocket(): void {
  const s = getSocket();
  // Always refresh token before connecting
  const token = readTokenFromStorage();
  console.log(
    "[socket.ts] connectSocket called, token present:",
    !!token,
    "| connected:",
    s.connected,
    "| url:",
    SOCKET_URL,
  );
  // Ensure socket.io handshake always uses the latest token
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
