export const ROLE_CODES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  ADMINISTRATOR: "ADMINISTRATOR",
  ACCOUNTANT: "ACCOUNTANT",
  COLLABORATOR: "COLLABORATOR",
  FOURNISSEUR: "FOURNISSEUR",
  SHOP: "SHOP",
  CLIENT: "CLIENT",
  BACKOFFICE: "BACKOFFICE",
} as const;

export const ROLE_TYPE_CODES = {
  ADMIN_TYPE: "ADMIN_TYPE",

  BUSINESS_TYPE: "BUSINESS_TYPE",
} as const;

export const isSuperAdminRole = (roleCode?: string | null): boolean => {
  return roleCode === ROLE_CODES.SUPER_ADMIN;
};

/** Aligné sur le serveur : GET /accountant/profile/me exige RoleCode.ACCOUNTANT uniquement. */
export function canFetchMyAccountantProfile(roleCode?: string | null): boolean {
  const code = roleCode?.toUpperCase() ?? "";
  return code === ROLE_CODES.ACCOUNTANT || code === "COMPTABLE";
}
