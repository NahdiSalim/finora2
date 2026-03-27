import { CONFIG } from "src/config-global";

import UsersView from "src/sections/users/users-view";

export default function Page() {
  return (
    <>
      <title>{`Users - ${CONFIG.appName}`}</title>

      <UsersView />
    </>
  );
}
