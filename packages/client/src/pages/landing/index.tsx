import { CONFIG } from "src/config-global";
import FinoraLandingPage from "src/sections/landing";

export default function LandingPage() {
  return (
    <>
      <title>{`Accueil - ${CONFIG.appName}`}</title>
      <FinoraLandingPage />
    </>
  );
}
