import { CONFIG } from "src/config-global";
import DocumentDetailsView from "src/sections/documents/document-details";

export default function Page() {
  return (
    <>
      <title>{`Profil - ${CONFIG.appName}`}</title>

      <DocumentDetailsView />
    </>
  );
}
