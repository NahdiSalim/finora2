import { useAppSelector } from './use-redux';

export function usePermissions() {
  const features = useAppSelector((state) => state.auth.features);

  const hasAccessToPath = (path: string): boolean => {
    if (!features || features.length === 0) return false;

    return features.some((feature) => feature.pages.some((page) => page.route === path));
  };

  const hasAction = (
    path: string,
    actionCode: 'READ' | 'CREATE' | 'UPDATE' | 'DELETE'
  ): boolean => {
    if (!features || features.length === 0) return false;

    return features.some((feature) =>
      feature.pages.some(
        (page) => page.route === path && page.actions.some((action) => action.code === actionCode)
      )
    );
  };

  const getActionsForPath = (path: string): string[] => {
    if (!features || features.length === 0) return [];

    const actions: string[] = [];
    features.forEach((feature) => {
      feature.pages.forEach((page) => {
        if (page.route === path) {
          page.actions.forEach((action) => {
            actions.push(action.code);
          });
        }
      });
    });

    return actions;
  };

  return {
    hasAccessToPath,
    hasAction,
    getActionsForPath,
    features,
  };
}
