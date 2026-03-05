import { CONFIG } from "src/config-global";
import NetworkAccountantProfileView from "src/sections/network/accountant-profile-view";

export default function Page() {
  return (
    <>
      <title>{`Profil comptable - ${CONFIG.appName}`}</title>

      <NetworkAccountantProfileView />
    </>
  );
}
