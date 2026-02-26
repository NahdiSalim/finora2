import { CONFIG } from "src/config-global";
import CollaboratorView from "src/sections/collaborator/collaborator-view";

export default function Page() {
  return (
    <>
      <title>{`Collaborators - ${CONFIG.appName}`}</title>

      <CollaboratorView />
    </>
  );
}
