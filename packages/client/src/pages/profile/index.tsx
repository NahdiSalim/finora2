import { CONFIG } from "src/config-global";
import AccountantView from "src/sections/profile/accountant-view";

export default function Page() {
  return (
    <>
      <title>{`Profil - ${CONFIG.appName}`}</title>

      <AccountantView />
    </>
  );
}
