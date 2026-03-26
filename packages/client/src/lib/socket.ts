import { io, type Socket } from "socket.io-client";

// Strip /api suffix to get the WebSocket base URL
const SOCKET_URL = (import.meta.env.VITE_API_URL as string)
  .replace(/\/api\/?$/, "")
  .replace(/\/$/, "");

let socket: Socket | null = null;

/** Returns the singleton socket instance (creates it if needed) */
export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ["websocket"],
      auth: { token: localStorage.getItem("token") ?? "" },
    });
  }
  return socket;
}

/** Connect (or reconnect) with a fresh token */
export function connectSocket(): void {
  const s = getSocket();
  // Always refresh the token before connecting
  s.auth = { token: localStorage.getItem("token") ?? "" };
  if (!s.connected) s.connect();
}

/** Gracefully disconnect and destroy the singleton */
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
