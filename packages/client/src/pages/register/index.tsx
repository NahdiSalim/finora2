import { CONFIG } from "src/config-global";

import { RegisterView } from "src/sections/auth/register-view";

export default function Page() {
  return (
    <>
      <title>{`RegisterView - ${CONFIG.appName}`}</title>

      <RegisterView />
    </>
  );
}
