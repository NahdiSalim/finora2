import { CONFIG } from "src/config-global";
import NetworkView from "src/sections/network";

export default function Page() {
  return (
    <>
      <title>{`Réseautage - ${CONFIG.appName}`}</title>

      <NetworkView />
    </>
  );
}
