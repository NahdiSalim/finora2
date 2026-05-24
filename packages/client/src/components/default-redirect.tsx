import { Navigate, useParams } from "react-router-dom";
import { usePermissions } from "src/hooks/usePermissions";
import { useAppSelector } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";

export default function DefaultRedirect() {
  const { roleSlug } = useParams<{ roleSlug?: string }>();
  const { features } = usePermissions();
  const { user } = useAppSelector((state) => state.auth);

  const base = roleSlug ? `/dashboard/${roleSlug}` : "/dashboard";

  const firstAccessiblePath = (() => {
    if (!features || features.length === 0) {
      return "/403";
    }

    // Determine user role
    const userRole =
      typeof user?.role === "object" ? user?.role?.code : user?.role;
    const userRoleUpper = userRole?.toUpperCase();
    const isClient = userRoleUpper === ROLE_CODES.CLIENT;

    // For clients, redirect to /requests (demandes) as the default page
    if (isClient) {
      const hasRequestsAccess = features.some((feature) =>
        feature.pages.some((page) => page.route === "/requests"),
      );
      if (hasRequestsAccess) {
        return `${base}/requests`;
      }
    }

    // For other roles, use the first accessible page
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
