import { CONFIG } from 'src/config-global';

import { ResetPasswordView } from 'src/sections/auth/reset-password-view';

export default function Page() {
  return (
    <>
      <title>{`Reset Password - ${CONFIG.appName}`}</title>

      <ResetPasswordView />
    </>
  );
}
