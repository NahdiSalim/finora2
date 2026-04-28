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
    const allowedPaths = new Set<string>();

    if (features && features.length > 0) {
      features.forEach((feature) => {
        feature.pages.forEach((page) => {
          allowedPaths.add(page.route);
        });
      });
    }

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
    const isClient = userRoleUpper === ROLE_CODES.CLIENT;

    // 👇 ajout temporaire pour afficher Messagerie en dev
    if (import.meta.env.DEV) {
      allowedPaths.add("/messages");
      // Factures, Devis and Suppliers are only for clients
      if (isClient) {
        allowedPaths.add("/factures");
        allowedPaths.add("/devis");
        allowedPaths.add("/suppliers");
        allowedPaths.add("/products");
      }
    }

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

      // Skip /factures for non-clients - only show for clients
      if (path === "/factures" && !isClient) {
        return;
      }

      // Skip /devis for non-clients - only show for clients
      if (path === "/devis" && !isClient) {
        return;
      }

      // Skip /suppliers for non-clients - only show for clients
      if (path === "/suppliers" && !isClient) {
        return;
      }

      // Skip /products for non-clients - only show for clients
      if (path === "/products" && !isClient) {
        return;
      }

      // For clients: skip individual factures/devis/suppliers/products — they are grouped below
      if (
        isClient &&
        (path === "/factures" ||
          path === "/devis" ||
          path === "/suppliers" ||
          path === "/products")
      ) {
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

    // For clients: inject grouped "Finances" item (Fournisseurs → Produits → Factures → Devis → BC → BL)
    if (isClient) {
      const financesConfig = NAV_CONFIG["/__finances"];
      const suppliersConfig = NAV_CONFIG["/suppliers"];
      const productsConfig = NAV_CONFIG["/products"];
      const facturesConfig = NAV_CONFIG["/factures"];
      const devisConfig = NAV_CONFIG["/devis"];
      const bcConfig = NAV_CONFIG["/bons-commande"];
      const blConfig = NAV_CONFIG["/bons-livraison"];

      if (financesConfig && suppliersConfig && facturesConfig && devisConfig) {
        const hasFinancesEntry = items.some(
          (item) => item.title === financesConfig.title,
        );
        if (!hasFinancesEntry) {
          items.push({
            title: financesConfig.title,
            path: `${dashboardBase}/suppliers`,
            icon: financesConfig.icon,
            children: [
              {
                title: suppliersConfig.title,
                path: `${dashboardBase}/suppliers`,
                icon: suppliersConfig.icon,
              },
              ...(productsConfig
                ? [
                    {
                      title: productsConfig.title,
                      path: `${dashboardBase}/products`,
                      icon: productsConfig.icon,
                    },
                  ]
                : []),
              {
                title: facturesConfig.title,
                path: `${dashboardBase}/factures`,
                icon: facturesConfig.icon,
              },
              {
                title: devisConfig.title,
                path: `${dashboardBase}/devis`,
                icon: devisConfig.icon,
              },
              ...(bcConfig
                ? [
                    {
                      title: bcConfig.title,
                      path: `${dashboardBase}/bons-commande`,
                      icon: bcConfig.icon,
                    },
                  ]
                : []),
              ...(blConfig
                ? [
                    {
                      title: blConfig.title,
                      path: `${dashboardBase}/bons-livraison`,
                      icon: blConfig.icon,
                    },
                  ]
                : []),
            ],
          });
        }
      }
    }

    // "Paramètres de l'entreprise" is only visible for CLIENT role
    const companySettingsConfig = NAV_CONFIG["/settings/company"];
    if (companySettingsConfig && isClient) {
      const hasCompanySettingsEntry = items.some(
        (item) => item.path === `${dashboardBase}/settings/company`,
      );
      if (!hasCompanySettingsEntry) {
        items.push({
          title: companySettingsConfig.title,
          path: `${dashboardBase}/settings/company`,
          icon: companySettingsConfig.icon,
        });
      }
    }

    return items;
  }, [features, dashboardBase, user]);

  return navItems;
}
