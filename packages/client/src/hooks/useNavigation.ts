import { useMemo } from "react";
import { usePermissions } from "./usePermissions";
import { useDashboardBase } from "./useDashboardBase";
import type { NavItem } from "src/layouts/nav-config-dashboard";
import { NAV_CONFIG } from "src/layouts/nav-config-dashboard";
import { useAppSelector } from "./use-redux";
import { ROLE_CODES } from "src/constants/roles";

// ----------------------------------------------------------------------

export function useNavigation() {
  const { features } = usePermissions();
  const dashboardBase = useDashboardBase();
  const { user } = useAppSelector((state) => state.auth);

  const navItems: NavItem[] = useMemo(() => {
    if (!features || features.length === 0) {
      return [];
    }

    const allowedPaths = new Set<string>();
    features.forEach((feature) => {
      feature.pages.forEach((page) => {
        allowedPaths.add(page.route);
      });
    });

    // Determine user role
    const userRole =
      typeof user?.role === "object" ? user?.role?.code : user?.role;
    const userRoleUpper = userRole?.toUpperCase();
    const isAccountant =
      userRoleUpper === ROLE_CODES.ACCOUNTANT ||
      userRoleUpper === ROLE_CODES.ADMINISTRATOR ||
      userRoleUpper === ROLE_CODES.COLLABORATOR ||
      userRoleUpper === "COMPTABLE"; // Fallback for old format

    const items: NavItem[] = [];

    allowedPaths.forEach((path) => {
      const config = NAV_CONFIG[path];
      if (config) {
        const segment = path.startsWith("/") ? path.slice(1) : path;
        const fullPath = segment
          ? `${dashboardBase}/${segment}`
          : dashboardBase;

        let title = config.title;
        let children: typeof items | undefined = undefined;

        // Change "Demandes" to "Gestion des demandes" with children for accountants
        if (path === "/requests" && isAccountant) {
          title = "G. des demandes";
          children = [
            {
              title: "Mes demandes",
              path: `${fullPath}?tab=my_requests`,
              icon: config.icon,
            },
            {
              title: "Demandes des clients",
              path: `${fullPath}?tab=client_requests`,
              icon: config.icon,
            },
          ];
        }

        items.push({
          title,
          path: fullPath,
          icon: config.icon,
          children,
        });
      } else {
        console.warn(`No navigation config found for path: ${path}`);
      }
    });

    return items;
  }, [features, dashboardBase, user]);

  return navItems;
}
