import { useEffect } from "react";
import { connectSocket } from "src/lib/socket";
import GlobalCallModal from "src/components/call/GlobalCallModal";

export function GlobalCallHandler() {
  useEffect(() => {
    connectSocket();
  }, []);

  return <GlobalCallModal />;
}
