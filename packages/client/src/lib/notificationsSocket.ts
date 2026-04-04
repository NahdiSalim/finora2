import { io, type Socket } from "socket.io-client";

/**
 * HTTP origin for the API (same rules as socket.ts: strip trailing /api).
 * Used to build `origin/notifications` for the Nest NotificationGateway namespace.
 */
function notificationsHttpBase(): string {
  const trimmed = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  const stripped = trimmed?.replace(/\/api\/?$/i, "").replace(/\/$/, "") ?? "";
  if (stripped && /^https?:\/\//i.test(stripped)) {
    try {
      return new URL(stripped).origin;
    } catch {
      /* fall through */
    }
  }
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return "http://localhost:3000";
}

let socket: Socket | null = null;
let refCount = 0;

function readToken(): string {
  return localStorage.getItem("token") ?? "";
}

function ensureSocket(): Socket {
  if (!socket) {
    const base = notificationsHttpBase();
    socket = io(`${base}/notifications`, {
      autoConnect: false,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      auth: { token: readToken() },
    });

    socket.io.on("reconnect_attempt", () => {
      if (socket) {
        socket.auth = { token: readToken() };
      }
    });

    socket.on("connect", () => {
      socket?.emit("subscribe");
    });
  }
  return socket;
}

/**
 * Increment refcount and connect. Use with releaseNotificationsSocket in pairs.
 */
export function acquireNotificationsSocket(): Socket {
  refCount += 1;
  const s = ensureSocket();
  s.auth = { token: readToken() };
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function releaseNotificationsSocket(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0 && socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * After silent token refresh (HTTP headers), reconnect so the handshake uses the new JWT.
 */
export function reconnectNotificationsSocketWithFreshToken(): void {
  if (refCount === 0 || !socket) return;
  const s = socket;
  s.auth = { token: readToken() };
  if (s.connected) {
    s.disconnect();
  }
  s.connect();
}
