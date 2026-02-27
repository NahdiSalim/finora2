import { CONFIG } from "src/config-global";
import ClientView from "src/sections/clients/client-view";

export default function Page() {
  return (
    <>
      <title>{`Clients - ${CONFIG.appName}`}</title>

      <ClientView />
    </>
  );
}
