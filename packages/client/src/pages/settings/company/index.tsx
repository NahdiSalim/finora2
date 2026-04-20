import { CONFIG } from "src/config-global";
import CompanySettingsView from "src/sections/settings/company-view";

export default function Page() {
  return (
    <>
      <title>{`Paramètres de l'entreprise - ${CONFIG.appName}`}</title>

      <CompanySettingsView />
    </>
  );
}
