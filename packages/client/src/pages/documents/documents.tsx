import { CONFIG } from "src/config-global";
import DocumentsView from "src/sections/documents/documents";

export default function Page() {
  return (
    <>
      <title>{`Profil - ${CONFIG.appName}`}</title>

      <DocumentsView />
    </>
  );
}
