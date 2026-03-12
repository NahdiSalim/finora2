import { Navigate } from "react-router-dom";
import { useDashboardBase } from "src/hooks/useDashboardBase";

/**
 * Redirige /dashboard vers /dashboard/:roleSlug (ex. /dashboard/comptable)
 * en fonction du rôle de l'utilisateur connecté.
 */
export default function DashboardRoleRedirect() {
  const base = useDashboardBase();
  return <Navigate to={base} replace />;
}
