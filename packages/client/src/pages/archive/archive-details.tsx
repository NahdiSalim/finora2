import { CONFIG } from "src/config-global";
import ArchiveDetailsView from "src/sections/archive/archive-details";

export default function Page() {
  return (
    <>
      <title>{`Archive - ${CONFIG.appName}`}</title>
      <ArchiveDetailsView />
    </>
  );
}
