import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from 'src/hooks/usePermissions';

interface PermissionGuardProps {
  children: ReactNode;
  requiredPath: string;
}

export default function PermissionGuard({ children, requiredPath }: PermissionGuardProps) {
  const { hasAccessToPath } = usePermissions();

  if (!hasAccessToPath(requiredPath)) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
