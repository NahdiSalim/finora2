import { CONFIG } from 'src/config-global';

import { SignInView } from 'src/sections/auth/sign-in-view';

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Connexion - ${CONFIG.appName}`}</title>

      <SignInView />
    </>
  );
}
