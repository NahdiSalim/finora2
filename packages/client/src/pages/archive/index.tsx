import { CONFIG } from "src/config-global";
import ArchiveView from "src/sections/archive/archive-view";

export default function Page() {
  return (
    <>
      <title>{`Archive - ${CONFIG.appName}`}</title>

      <ArchiveView />
    </>
  );
}
