import type { Theme, SxProps, Breakpoint } from "@mui/material/styles";

import { useEffect, useState } from "react";

import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import { useTheme, alpha } from "@mui/material/styles";
import ListItemButton from "@mui/material/ListItemButton";
import Drawer, { drawerClasses } from "@mui/material/Drawer";
import Collapse from "@mui/material/Collapse";

import { usePathname } from "src/routes/hooks";
import { RouterLink } from "src/routes/components";
import { useLocation } from "react-router-dom";

import { Scrollbar } from "src/components/scrollbar";

import type { NavItem } from "../nav-config-dashboard";
import { Search, ChevronDown } from "lucide-react";
import CustomInput from "src/components/common/CustomInput";

// ----------------------------------------------------------------------

export type NavContentProps = {
  data: NavItem[];
  slots?: {
    topArea?: React.ReactNode;
    bottomArea?: React.ReactNode;
  };
  sx?: SxProps<Theme>;
};

export function NavDesktop({
  sx,
  data,
  slots,
  layoutQuery,
}: NavContentProps & { layoutQuery: Breakpoint }) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        pt: 1,
        px: 2.5,
        top: 12,
        left: 12,
        height: "calc(100vh - 24px)",
        display: "none",
        position: "fixed",
        flexDirection: "column",
        zIndex: "var(--layout-nav-zIndex)",
        width: "calc(var(--layout-nav-vertical-width) - 24px)",
        borderRadius: 3,
        overflow: "hidden",
        bgcolor: theme.palette.common.white,
        [theme.breakpoints.up(layoutQuery)]: {
          display: "flex",
          top: "calc(var(--layout-header-desktop-height) + 24px)",
          height: "calc(100vh - var(--layout-header-desktop-height) - 36px)",
        },
        ...sx,
      }}
    >
      <CustomInput
        backgroundColor={theme.palette.grey[50]}
        startIcon={<Search size={16} />}
        border={false}
        placeholder="Rechercher..."
      />
      <NavContent data={data} slots={slots} />
    </Box>
  );
}

// ----------------------------------------------------------------------

export function NavMobile({
  sx,
  data,
  open,
  slots,
  onClose,
}: NavContentProps & { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  useEffect(() => {
    if (open) {
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      sx={{
        [`& .${drawerClasses.paper}`]: {
          pt: 2.5,
          px: 2.5,
          overflow: "unset",
          width: "var(--layout-nav-mobile-width)",
          ...sx,
        },
      }}
    >
      <NavContent data={data} slots={slots} />
    </Drawer>
  );
}

// ----------------------------------------------------------------------

export function NavContent({ data, slots, sx }: NavContentProps) {
  const pathname = usePathname();
  const location = useLocation();
  const theme = useTheme();
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
    {},
  );

  // Auto-expand items that have active children
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const newExpanded: Record<string, boolean> = {};
    data.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some((child) => {
          const [basePath, queryString] = child.path.split("?");
          if (!pathname.startsWith(basePath)) return false;

          // If child has query params, check them
          if (queryString) {
            const params = new URLSearchParams(queryString);
            const tabParam = params.get("tab");
            const currentTab = searchParams.get("tab");
            return tabParam === currentTab;
          }

          return true;
        });
        if (hasActiveChild) {
          newExpanded[item.title] = true;
        }
      }
    });
    setExpandedItems((prev) => ({ ...prev, ...newExpanded }));
  }, [pathname, location.search, data]);

  const toggleExpand = (itemTitle: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [itemTitle]: !prev[itemTitle],
    }));
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 2,
        }}
      />

      {slots?.topArea}

      <Scrollbar fillContent>
        <Box
          component="nav"
          sx={[
            {
              display: "flex",
              flex: "1 1 auto",
              flexDirection: "column",
            },
            ...(Array.isArray(sx) ? sx : [sx]),
          ]}
        >
          <Box
            component="ul"
            sx={{
              gap: 0.5,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {data.map((item) => {
              const isActived =
                item.path === pathname ||
                (item.children &&
                  item.children.some((child) =>
                    pathname.startsWith(child.path.split("?")[0]),
                  ));
              const isExpanded = expandedItems[item.title] ?? false;
              const hasChildren = item.children && item.children.length > 0;

              return (
                <Box key={item.title}>
                  <ListItem disableGutters disablePadding>
                    <ListItemButton
                      disableGutters
                      component={hasChildren ? "div" : RouterLink}
                      href={hasChildren ? undefined : item.path}
                      onClick={
                        hasChildren ? () => toggleExpand(item.title) : undefined
                      }
                      sx={[
                        () => ({
                          pl: 2,
                          py: 1.25,
                          gap: 1.5,
                          pr: 1.5,
                          borderRadius: 2,
                          typography: "body2",
                          fontWeight: 500,
                          color: "#090B0E",
                          minHeight: 44,
                          cursor: "pointer",
                          transition: "all 0.2s ease-in-out",
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: theme.palette.primary.main,
                          },
                          ...(isActived && {
                            fontWeight: 600,
                            bgcolor: alpha(theme.palette.primary.main, 0.12),
                            color: theme.palette.primary.main,
                            "&:hover": {
                              bgcolor: alpha(theme.palette.primary.main, 0.16),
                            },
                          }),
                        }),
                      ]}
                    >
                      <Box
                        component="span"
                        sx={{ width: 20, height: 20, flexShrink: 0 }}
                      >
                        {item.icon}
                      </Box>

                      <Box
                        component="span"
                        sx={{ flexGrow: 1, fontSize: "0.9375rem" }}
                      >
                        {item.title}
                      </Box>

                      {item.info && item.info}

                      {hasChildren && (
                        <Box
                          component="span"
                          sx={{
                            width: 20,
                            height: 20,
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "transform 0.2s ease-in-out",
                            transform: isExpanded
                              ? "rotate(0deg)"
                              : "rotate(0deg)",
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown size={18} />
                          ) : (
                            <ChevronDown
                              size={18}
                              style={{ transform: "rotate(-90deg)" }}
                            />
                          )}
                        </Box>
                      )}
                    </ListItemButton>
                  </ListItem>

                  {/* Render children if they exist */}
                  {hasChildren && (
                    <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                      <Box
                        component="ul"
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                          pl: 4.5,
                          pr: 0.5,
                          mt: 0.5,
                          mb: 0.5,
                        }}
                      >
                        {item.children!.map((child) => {
                          const [basePath, queryString] = child.path.split("?");
                          const isBasePathActive =
                            pathname.startsWith(basePath);

                          // Get current search params from URL
                          const currentSearchParams = new URLSearchParams(
                            location.search,
                          );

                          // Check if query params match
                          let isChildActive = false;
                          if (isBasePathActive) {
                            if (queryString) {
                              const params = new URLSearchParams(queryString);
                              const tabParam = params.get("tab");
                              const currentTab = currentSearchParams.get("tab");
                              isChildActive = tabParam === currentTab;
                            } else {
                              isChildActive = true;
                            }
                          }

                          return (
                            <ListItem
                              disableGutters
                              disablePadding
                              key={child.title}
                            >
                              <ListItemButton
                                disableGutters
                                component={RouterLink}
                                href={child.path}
                                sx={[
                                  () => ({
                                    pl: 2,
                                    py: 1,
                                    gap: 1.5,
                                    pr: 1.5,
                                    borderRadius: 1.5,
                                    typography: "body2",
                                    fontWeight: 500,
                                    color: theme.palette.text.secondary,
                                    minHeight: 40,
                                    fontSize: "0.875rem",
                                    transition: "all 0.2s ease-in-out",
                                    "&:hover": {
                                      bgcolor: alpha(
                                        theme.palette.grey[500],
                                        0.08,
                                      ),
                                      color: theme.palette.text.primary,
                                    },
                                    ...(isChildActive && {
                                      fontWeight: 600,
                                      bgcolor: alpha(
                                        theme.palette.grey[500],
                                        0.12,
                                      ),
                                      color: theme.palette.text.primary,
                                      "&:hover": {
                                        bgcolor: alpha(
                                          theme.palette.grey[500],
                                          0.16,
                                        ),
                                      },
                                    }),
                                  }),
                                ]}
                              >
                                <Box component="span" sx={{ flexGrow: 1 }}>
                                  {child.title}
                                </Box>
                              </ListItemButton>
                            </ListItem>
                          );
                        })}
                      </Box>
                    </Collapse>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Scrollbar>

      {slots?.bottomArea}

      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {/* <NavUpgrade /> */}
      </Box>
    </>
  );
}
