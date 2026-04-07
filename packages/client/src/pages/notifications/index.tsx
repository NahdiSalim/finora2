import { CONFIG } from "src/config-global";
import NotificationsView from "src/sections/notifications/notification-view";

// ----------------------------------------------------------------------

export default function Page() {
  return (
    <>
      <title>{`Notifications - ${CONFIG.appName}`}</title>
      <NotificationsView />
    </>
  );
}
