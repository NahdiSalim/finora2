import { useMemo } from "react";
import { useVerifyUserQuery } from "src/lib/services/authApi";

/** Slug utilisé dans l’URL pour chaque rôle (dashboard/:roleSlug/...) */
export const ROLE_SLUGS = {
  comptable: "comptable",
  client: "client",
  collaborateur: "collaborateur",
  admin: "admin",
} as const;

export type RoleSlug = (typeof ROLE_SLUGS)[keyof typeof ROLE_SLUGS];

const FALLBACK_SLUG: RoleSlug = "comptable";

/**
 * Retourne le slug URL à partir du code rôle (API ou enum).
 */
export function getRoleSlug(roleCode: string | undefined | null): RoleSlug {
  if (!roleCode) return FALLBACK_SLUG;
  const code = roleCode.toLowerCase();
  if (code === "accountant" || code.includes("comptable"))
    return ROLE_SLUGS.comptable;
  if (code === "client") return ROLE_SLUGS.client;
  if (code === "collaborator" || code === "collaborateur")
    return ROLE_SLUGS.collaborateur;
  if (code === "admin" || code === "administrator" || code.includes("admin"))
    return ROLE_SLUGS.admin;
  return FALLBACK_SLUG;
}

/**
 * Base du dashboard avec le rôle dans l’URL : /dashboard/comptable, /dashboard/client, etc.
 */
export function useDashboardBase(): string {
  const { data: userData } = useVerifyUserQuery();
  return useMemo(() => {
    const role = typeof userData?.role === "object" ? userData.role : null;
    const roleCode =
      role?.code ?? (typeof userData?.role === "string" ? userData.role : "");
    const slug = getRoleSlug(roleCode);
    return `/dashboard/${slug}`;
  }, [userData?.role]);
}
