import { CONFIG } from "src/config-global";
import FactureView from "src/sections/factures/facture-view";

export default function FacturesPage() {
  return (
    <>
      <title>{`Factures - ${CONFIG.appName}`}</title>
      <FactureView />
    </>
  );
}
