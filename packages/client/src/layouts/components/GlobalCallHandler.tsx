import { useEffect } from "react";
import { connectSocket } from "src/lib/socket";
import GlobalCallModal from "src/components/call/GlobalCallModal";

export function GlobalCallHandler() {
  useEffect(() => {
    console.log("[GlobalCallHandler] Ensuring socket is connected...");
    connectSocket();
  }, []);

  return <GlobalCallModal />;
}
