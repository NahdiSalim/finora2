import { CONFIG } from 'src/config-global';

import { ForgotPasswordView } from 'src/sections/auth/forgot-password-view';

export default function Page() {
  return (
    <>
      <title>{`Forgot Password - ${CONFIG.appName}`}</title>

      <ForgotPasswordView />
    </>
  );
}
