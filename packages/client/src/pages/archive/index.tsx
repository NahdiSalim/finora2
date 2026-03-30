import { CONFIG } from "src/config-global";
import ArchiveView from "src/sections/archive/archive-view";
import ArchiveDetailsView from "src/sections/archive/archive-details";
import { useAppSelector } from "src/hooks/use-redux";

function getRoleCode(role: unknown): string | null {
  if (role == null) return null;
  if (
    typeof role === "object" &&
    "code" in role &&
    typeof (role as { code: string }).code === "string"
  ) {
    return (role as { code: string }).code;
  }
  if (typeof role === "string") return role;
  return null;
}

/** Client → ses documents archivés directement. Comptable → liste des clients puis détail. */
export default function Page() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const roleCode = getRoleCode(role);
  const isClient = roleCode?.toUpperCase() === "CLIENT";

  return (
    <>
      <title>{`Archive - ${CONFIG.appName}`}</title>
      {isClient ? <ArchiveDetailsView /> : <ArchiveView />}
    </>
  );
}
