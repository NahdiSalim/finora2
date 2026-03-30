/**
 * TEMPORARY — socket connection test only.
 * Remove this file and its usage in app.tsx once the connection is verified.
 */
import { useEffect } from "react";
import { getSocket } from "./socket";

export function useSocketTest(): void {
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => {
      console.log("[socket-test] ✅ connected — id:", socket.id);
    };

    const onDisconnect = (reason: string) => {
      console.log("[socket-test] ❌ disconnected — reason:", reason);
    };

    const onConnectError = (err: Error) => {
      console.error("[socket-test] 🔴 connect_error —", err.message);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);

    // Explicitly connect — autoConnect is false in socket.ts
    socket.connect();

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, []);
}
