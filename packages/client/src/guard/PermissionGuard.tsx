import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "src/hooks/usePermissions";
import { useAppSelector } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";

interface PermissionGuardProps {
  children: ReactNode;
  requiredPath: string;
  /** If set, allow access when user has this role (e.g. collaborator can access their tasks without requiredPath) */
  allowForRole?: keyof typeof ROLE_CODES;
  /** Optional list of accepted role codes (supports legacy API values like "COLLABORATEUR") */
  allowForRoleCodes?: string[];
}

export default function PermissionGuard({
  children,
  requiredPath,
  allowForRole,
  allowForRoleCodes,
}: PermissionGuardProps) {
  const { hasAccessToPath } = usePermissions();
  const { user } = useAppSelector((state) => state.auth);

  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const userRoleUpper = userRole?.toUpperCase();

  const normalizedAllowedRoleCodes = [
    ...(allowForRole != null ? [ROLE_CODES[allowForRole]] : []),
    ...(allowForRoleCodes ?? []),
  ]
    .filter(Boolean)
    .map((r) => r.toUpperCase());

  const allowedByRole =
    normalizedAllowedRoleCodes.length > 0 &&
    !!userRoleUpper &&
    normalizedAllowedRoleCodes.includes(userRoleUpper);
  const allowedByPermission = hasAccessToPath(requiredPath);

  if (!allowedByRole && !allowedByPermission) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
