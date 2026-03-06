import { useMemo } from "react";
import { usePermissions } from "./usePermissions";
import type { NavItem } from "src/layouts/nav-config-dashboard";
import { NAV_CONFIG } from "src/layouts/nav-config-dashboard";

// ----------------------------------------------------------------------

export function useNavigation() {
  const { features } = usePermissions();

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

    const dashboardBase = "/dashboard";
    allowedPaths.forEach((path) => {
      const config = NAV_CONFIG[path];
      if (config) {
        const fullPath = path.startsWith(dashboardBase)
          ? path
          : dashboardBase + (path.startsWith("/") ? path : `/${path}`);
        items.push({
          title: config.title,
          path: fullPath,
          icon: config.icon,
        });
      } else {
        console.warn(`No navigation config found for path: ${path}`);
      }
    });

    // const pathOrder = ['/', '/users', '/roles', '/products', '/reports/dashboard'];
    // items.sort((a, b) => {
    //   const indexA = pathOrder.indexOf(a.path);
    //   const indexB = pathOrder.indexOf(b.path);

    //   // Si les deux sont dans pathOrder, trier selon l'ordre
    //   if (indexA !== -1 && indexB !== -1) {
    //     return indexA - indexB;
    //   }
    //   // Si un seul est dans pathOrder, le mettre en premier
    //   if (indexA !== -1) return -1;
    //   if (indexB !== -1) return 1;
    //   // Sinon, garder l'ordre alphabétique
    //   return a.title.localeCompare(b.title);
    // });

    return items;
  }, [features]);

  return navItems;
}
