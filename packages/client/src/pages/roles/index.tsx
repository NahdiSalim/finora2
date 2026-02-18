import { CONFIG } from 'src/config-global';
import RoleView from 'src/sections/roles';

export default function Page() {
  return (
    <>
      <title>{`Users - ${CONFIG.appName}`}</title>

      <RoleView />
    </>
  );
}
