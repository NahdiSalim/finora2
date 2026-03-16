import { CONFIG } from "src/config-global";
import DocumentsView from "src/sections/documents/documents";
import DocumentDetailsView from "src/sections/documents/document-details";
import { useAppSelector } from "src/hooks/use-redux";

/** Client → ses documents directement. Comptable → liste des clients puis détail. */
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

export default function Page() {
  const role = useAppSelector((state) => state.auth.user?.role);
  const roleCode = getRoleCode(role);
  const isClient = roleCode?.toUpperCase() === "CLIENT";

  return (
    <>
      <title>{`Documents - ${CONFIG.appName}`}</title>
      {isClient ? <DocumentDetailsView /> : <DocumentsView />}
    </>
  );
}
