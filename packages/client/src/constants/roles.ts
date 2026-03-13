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
