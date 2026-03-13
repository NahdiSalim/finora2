import { CONFIG } from "src/config-global";
import RequestView from "src/sections/requests/request-view";

export default function RequestPage() {
  return (
    <>
      <title>{`Requests - ${CONFIG.appName}`}</title>

      <RequestView />
    </>
  );
}
