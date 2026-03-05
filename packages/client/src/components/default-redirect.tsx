import { Navigate } from "react-router-dom";
import { usePermissions } from "src/hooks/usePermissions";

const DASHBOARD_BASE = "/dashboard";

export default function DefaultRedirect() {
  const { features } = usePermissions();

  const firstAccessiblePath = (() => {
    if (!features || features.length === 0) {
      return "/403";
    }

    for (const feature of features) {
      if (feature.pages && feature.pages.length > 0) {
        const route = feature.pages[0].route;
        if (route.startsWith(DASHBOARD_BASE)) return route;
        return route.startsWith("/")
          ? DASHBOARD_BASE + route
          : `${DASHBOARD_BASE}/${route}`;
      }
    }

    return "/403";
  })();

  return <Navigate to={firstAccessiblePath} replace />;
}
