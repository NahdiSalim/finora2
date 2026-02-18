import { useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardHeader,
  Checkbox,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import DotSpinner from 'src/components/common/DotSpinner';
import { useGetFeaturesInfiniteQuery } from 'src/lib/services/roleApi';
import type { Page, Action } from 'src/types/roles';

interface PermissionsSelectorProps {
  selectedFeatures: string[];
  selectedPages: string[];
  selectedActions: string[];
  onFeaturesChange: (ids: string[]) => void;
  onPagesChange: (ids: string[]) => void;
  onActionsChange: (ids: string[]) => void;
}

export default function PermissionsSelector({
  selectedFeatures,
  selectedPages,
  selectedActions,
  onFeaturesChange,
  onPagesChange,
  onActionsChange,
}: PermissionsSelectorProps) {
  const featuresLastElementRef = useRef<HTMLDivElement | null>(null);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: featuresLoading,
  } = useGetFeaturesInfiniteQuery(undefined);

  const allFeatures = data?.pages?.flatMap((page) => page.results) || [];

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = featuresLastElementRef.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const allPages: Page[] = [];
  allFeatures.forEach((feature) => {
    if (selectedFeatures.includes(feature.id) && feature.pages) {
      allPages.push(...feature.pages);
    }
  });

  const actionsByPage: { [pageName: string]: Action[] } = {};
  allPages.forEach((page) => {
    if (selectedPages.includes(page.id) && page.actions) {
      actionsByPage[page.name] = page.actions;
    }
  });

  const allActions: Action[] = [];
  allPages.forEach((page) => {
    if (selectedPages.includes(page.id) && page.actions) {
      allActions.push(...page.actions);
    }
  });

  const handleFeatureToggle = (featureId: string) => {
    const newSelection = selectedFeatures.includes(featureId)
      ? selectedFeatures.filter((id) => id !== featureId)
      : [...selectedFeatures, featureId];
    onFeaturesChange(newSelection);
  };

  const handlePageToggle = (pageId: string) => {
    const isSelected = selectedPages.includes(pageId);
    const newSelection = isSelected
      ? selectedPages.filter((id) => id !== pageId)
      : [...selectedPages, pageId];

    onPagesChange(newSelection);

    if (!isSelected) {
      const page = allPages.find((p) => p.id === pageId);
      const readAction = page?.actions?.find((a) => a.code === 'READ');
      if (readAction && !selectedActions.includes(readAction.id)) {
        onActionsChange([...selectedActions, readAction.id]);
      }
    } else {
      const page = allPages.find((p) => p.id === pageId);
      const pageActionIds = page?.actions?.map((a) => a.id) || [];
      onActionsChange(selectedActions.filter((id) => !pageActionIds.includes(id)));
    }
  };

  const handleActionToggle = (actionId: string) => {
    const action = allActions.find((a) => a.id === actionId);
    if (action?.code === 'READ' && selectedActions.includes(actionId)) {
      return;
    }

    const newSelection = selectedActions.includes(actionId)
      ? selectedActions.filter((id) => id !== actionId)
      : [...selectedActions, actionId];
    onActionsChange(newSelection);
  };

  return (
    <Box sx={{ display: 'flex', gap: 2, height: '60vh' }}>
      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardHeader title="Modules" />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {featuresLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <DotSpinner />
            </Box>
          ) : allFeatures.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No modules available
              </Typography>
            </Box>
          ) : (
            <List dense>
              {allFeatures.map((feature) => (
                <ListItem key={feature.id} disablePadding>
                  <ListItemButton onClick={() => handleFeatureToggle(feature.id)}>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedFeatures.includes(feature.id)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText primary={feature.name} secondary={feature.description} />
                  </ListItemButton>
                </ListItem>
              ))}

              {hasNextPage && (
                <div ref={featuresLastElementRef}>
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                    {isFetchingNextPage && <DotSpinner size={20} />}
                  </Box>
                </div>
              )}
            </List>
          )}
        </Box>
      </Card>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardHeader title="Pages" />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {selectedFeatures.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Select a module to see pages
              </Typography>
            </Box>
          ) : allPages.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No pages available
              </Typography>
            </Box>
          ) : (
            <List dense>
              {allPages.map((page) => (
                <ListItem key={page.id} disablePadding>
                  <ListItemButton onClick={() => handlePageToggle(page.id)}>
                    <ListItemIcon>
                      <Checkbox
                        edge="start"
                        checked={selectedPages.includes(page.id)}
                        tabIndex={-1}
                        disableRipple
                      />
                    </ListItemIcon>
                    <ListItemText primary={page.name} secondary={page.path} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </Card>

      <Card sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <CardHeader title="Actions" />
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {selectedPages.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Select a page to see actions
              </Typography>
            </Box>
          ) : allActions.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No actions available
              </Typography>
            </Box>
          ) : (
            <List dense>
              {Object.entries(actionsByPage).map(([pageName, actions]) => (
                <Box key={pageName}>
                  <ListItem
                    sx={{
                      bgcolor: 'action.hover',
                      borderBottom: 1,
                      borderColor: 'divider',
                      justifyContent: 'center',
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body1" fontWeight="bold" textAlign="center">
                          {pageName}
                        </Typography>
                      }
                    />
                  </ListItem>
                  {actions.map((action) => (
                    <ListItem key={action.id} disablePadding sx={{ pl: 2 }}>
                      <ListItemButton onClick={() => handleActionToggle(action.id)}>
                        <ListItemIcon>
                          <Checkbox
                            edge="start"
                            checked={selectedActions.includes(action.id)}
                            tabIndex={-1}
                            disableRipple
                          />
                        </ListItemIcon>
                        <ListItemText primary={action.name} secondary={action.code} />
                      </ListItemButton>
                    </ListItem>
                  ))}
                </Box>
              ))}
            </List>
          )}
        </Box>
      </Card>
    </Box>
  );
}
