import { CONFIG } from "src/config-global";
import BonLivraisonView from "src/sections/bon-livraison/bon-livraison-view";

export default function BonLivraisonPage() {
  return (
    <>
      <title>{`Bons de livraison - ${CONFIG.appName}`}</title>
      <BonLivraisonView />
    </>
  );
}
