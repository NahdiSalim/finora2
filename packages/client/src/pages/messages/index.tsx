import { CONFIG } from "src/config-global";
import MessagesView from "src/sections/messages/messages-view";

export default function MessagesPage() {
  return (
    <>
      <title>{`Messagerie - ${CONFIG.appName}`}</title>

      <MessagesView />
    </>
  );
}
