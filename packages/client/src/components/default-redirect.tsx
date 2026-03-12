import { Navigate, useParams } from "react-router-dom";
import { usePermissions } from "src/hooks/usePermissions";

export default function DefaultRedirect() {
  const { roleSlug } = useParams<{ roleSlug?: string }>();
  const { features } = usePermissions();

  const base = roleSlug ? `/dashboard/${roleSlug}` : "/dashboard";

  const firstAccessiblePath = (() => {
    if (!features || features.length === 0) {
      return "/403";
    }

    for (const feature of features) {
      if (feature.pages && feature.pages.length > 0) {
        const route = feature.pages[0].route;
        const path = route.startsWith("/") ? route.slice(1) : route;
        return path ? `${base}/${path}` : base;
      }
    }

    return "/403";
  })();

  return <Navigate to={firstAccessiblePath} replace />;
}
