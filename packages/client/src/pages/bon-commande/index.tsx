import { CONFIG } from "src/config-global";
import BonCommandeView from "src/sections/bon-commande/bon-commande-view";

export default function BonCommandePage() {
  return (
    <>
      <title>{`Bons de commande - ${CONFIG.appName}`}</title>
      <BonCommandeView />
    </>
  );
}
