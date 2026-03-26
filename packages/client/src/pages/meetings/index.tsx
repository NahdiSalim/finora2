import { CONFIG } from "src/config-global";
import MeetingsView from "src/sections/meetings/meetings-view";

export default function MeetingsPage() {
  return (
    <>
      <title>{`Rendez-vous - ${CONFIG.appName}`}</title>
      <MeetingsView />
    </>
  );
}
