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
      userRoleUpper === "COMPTABLE"; // Fallback for old format
    const isCollaboratorOnly =
      userRoleUpper === ROLE_CODES.COLLABORATOR ||
      userRoleUpper === "COLLABORATEUR";

    const items: NavItem[] = [];

    allowedPaths.forEach((path) => {
      // Collaborator dashboard: single "Mes tasks" entry (reuses task-management components)
      if (path === "/collaborators" && isCollaboratorOnly) {
        const mesTasksConfig = NAV_CONFIG["/tasks"];
        if (mesTasksConfig) {
          items.push({
            title: mesTasksConfig.title,
            path: `${dashboardBase}/tasks`,
            icon: mesTasksConfig.icon,
          });
        }
        return;
      }

      // Skip /tasks for accountants - only show for collaborators
      if (path === "/tasks" && isAccountant) {
        return;
      }

      const config = NAV_CONFIG[path];
      if (config) {
        const segment = path.startsWith("/") ? path.slice(1) : path;
        const fullPath = segment
          ? `${dashboardBase}/${segment}`
          : dashboardBase;

        let title = config.title;
        let children: typeof items | undefined = undefined;

        // Change "Demandes" with children for accountants
        if (path === "/requests" && isAccountant) {
          title = "Demandes";
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

        // Change "Collaborateurs" with children for accountants
        if (path === "/collaborators" && isAccountant) {
          title = "Collaborateurs";
          children = [
            {
              title: "Mes collaborateurs",
              path: fullPath,
              icon: config.icon,
            },
            {
              title: "Gestion des tâches",
              path: `${fullPath}/task-management`,
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

    // Collaborators always see "Mes tasks" (allowed by role even without /collaborators permission)
    if (isCollaboratorOnly) {
      const hasTasksEntry = items.some(
        (item) => item.path === `${dashboardBase}/tasks`,
      );
      if (!hasTasksEntry) {
        const tasksConfig = NAV_CONFIG["/tasks"];
        if (tasksConfig) {
          items.push({
            title: tasksConfig.title,
            path: `${dashboardBase}/tasks`,
            icon: tasksConfig.icon,
          });
        }
      }
    }

    return items;
  }, [features, dashboardBase, user]);

  return navItems;
}
