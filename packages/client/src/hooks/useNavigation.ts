import { useMemo } from "react";
import { usePermissions } from "./usePermissions";
import { useDashboardBase } from "./useDashboardBase";
import type { NavItem } from "src/layouts/nav-config-dashboard";
import { NAV_CONFIG } from "src/layouts/nav-config-dashboard";

// ----------------------------------------------------------------------

export function useNavigation() {
  const { features } = usePermissions();
  const dashboardBase = useDashboardBase();

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

    const items: NavItem[] = [];

    allowedPaths.forEach((path) => {
      const config = NAV_CONFIG[path];
      if (config) {
        const segment = path.startsWith("/") ? path.slice(1) : path;
        const fullPath = segment
          ? `${dashboardBase}/${segment}`
          : dashboardBase;
        items.push({
          title: config.title,
          path: fullPath,
          icon: config.icon,
        });
      } else {
        console.warn(`No navigation config found for path: ${path}`);
      }
    });

    return items;
  }, [features, dashboardBase]);

  return navItems;
}
