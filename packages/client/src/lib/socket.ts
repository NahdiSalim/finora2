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
    const token = readTokenFromStorage();

    // Only try to connect if we have a token
    if (!token) {
      console.warn("[Socket.IO] No auth token found, skipping connection");
    }

    socket = io(SOCKET_URL, {
      autoConnect: !!token, // Only auto-connect if we have a token
      transports: ["websocket", "polling"], // Try websocket first, fallback to polling
      auth: { token },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    const s = socket;

    // Connection lifecycle logging
    s.on("connect", () => {
      console.log("[Socket.IO] Connected successfully");
    });

    s.on("disconnect", (reason) => {
      console.warn("[Socket.IO] Disconnected:", reason);
    });

    s.on("connect_error", (error) => {
      console.error("[Socket.IO] Connection error:", error.message);
      // If auth failed, don't retry
      if (error.message.includes("auth") || error.message.includes("401")) {
        s.disconnect();
      }
    });

    s.io.on("reconnect_attempt", (attemptNumber) => {
      console.log(`[Socket.IO] Reconnection attempt ${attemptNumber}`);
      syncAuthToken(s);
    });

    s.io.on("reconnect", (attemptNumber) => {
      console.log(`[Socket.IO] Reconnected after ${attemptNumber} attempts`);
    });

    s.io.on("reconnect_failed", () => {
      console.error("[Socket.IO] Reconnection failed");
    });
  }
  return socket;
}

/** Connect (or reconnect) with a fresh token */
export function connectSocket(): void {
  const token = readTokenFromStorage();

  if (!token) {
    console.warn("[Socket.IO] Cannot connect without auth token");
    return;
  }

  const s = getSocket();
  s.auth = { token };
  if (!s.connected) {
    console.log("[Socket.IO] Connecting...");
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
  console.log("[Socket.IO] Reconnecting with fresh token...");
  s.connect();
}

/**
 * Disconnect without destroying the singleton.
 * Use this when navigating away — the socket can reconnect later.
 */
export function disconnectSocket(): void {
  if (socket?.connected) {
    console.log("[Socket.IO] Disconnecting...");
    socket.disconnect();
  }
  // Do NOT null out socket — keep the singleton for reconnection
}

/**
 * Fully destroy the singleton (call on logout only).
 */
export function destroySocket(): void {
  if (socket) {
    console.log("[Socket.IO] Destroying socket...");
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/** Whether the socket is currently connected */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
