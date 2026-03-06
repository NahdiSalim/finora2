import { CONFIG } from "src/config-global";

import { VisitorView } from "src/sections/visitor";

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Visiteur - ${CONFIG.appName}`}</title>

      <VisitorView />
    </>
  );
}
