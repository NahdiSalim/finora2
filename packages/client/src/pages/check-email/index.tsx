import { CONFIG } from 'src/config-global';

import { CheckEmailView } from 'src/sections/auth/Check-Email-View';

export default function Page() {
  return (
    <>
      <title>{`Check Email - ${CONFIG.appName}`}</title>

      <CheckEmailView />
    </>
  );
}
