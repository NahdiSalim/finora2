import { Navigate } from 'react-router-dom';
import { usePermissions } from 'src/hooks/usePermissions';

export default function DefaultRedirect() {
  const { features } = usePermissions();

  const firstAccessiblePath = (() => {
    if (!features || features.length === 0) {
      return '/403';
    }

    for (const feature of features) {
      if (feature.pages && feature.pages.length > 0) {
        return feature.pages[0].route;
      }
    }

    return '/403';
  })();

  return <Navigate to={firstAccessiblePath} replace />;
}
