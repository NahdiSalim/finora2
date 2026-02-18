import { CONFIG } from 'src/config-global';

import UserView from 'src/sections/user/user-view';

export default function Page() {
  return (
    <>
      <title>{`Users - ${CONFIG.appName}`}</title>

      <UserView />
    </>
  );
}
