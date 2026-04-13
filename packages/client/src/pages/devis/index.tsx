import { CONFIG } from "src/config-global";
import DevisView from "src/sections/devis/devis-view";

export default function DevisPage() {
  return (
    <>
      <title>{`Devis - ${CONFIG.appName}`}</title>
      <DevisView />
    </>
  );
}
