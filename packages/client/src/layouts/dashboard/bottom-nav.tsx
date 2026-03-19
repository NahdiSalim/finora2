import { useLocation, useNavigate } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
} from "@mui/material";
import {
  LayoutGrid,
  MessageSquareMore,
  Calendar,
  Users,
  User,
} from "lucide-react";
import { useTheme, alpha } from "@mui/material/styles";
import { useAppSelector } from "src/hooks/use-redux";
import { useBoolean } from "minimal-shared/hooks";
import { NavMobile } from "./nav";
import { useNavigation } from "src/hooks/useNavigation";
import { useDashboardBase } from "src/hooks/useDashboardBase";

// ----------------------------------------------------------------------

function useDashboardTabs() {
  const base = useDashboardBase();

  const SUPERADMIN_TABS = [
    {
      label: "Dashboard",
      path: `${base}/dashboard`,
      icon: <LayoutGrid size={20} />,
    },
    {
      label: "Collaborateurs",
      path: `${base}/collaborators`,
      icon: <Users size={20} />,
    },
    { label: "Clients", path: `${base}/clients`, icon: <User size={20} /> },
    {
      label: "Messagerie",
      path: `${base}/messages`,
      icon: <MessageSquareMore size={20} />,
    },
    {
      label: "Rendez-vous",
      path: `${base}/meetings`,
      icon: <Calendar size={20} />,
    },
  ];

  const DEFAULT_TABS = [
    {
      label: "Dashboard",
      path: `${base}/dashboard`,
      icon: <LayoutGrid size={20} />,
    },
    {
      label: "Messagerie",
      path: `${base}/messages`,
      icon: <MessageSquareMore size={20} />,
    },
    {
      label: "Rendez-vous",
      path: `${base}/meetings`,
      icon: <Calendar size={20} />,
    },
    {
      label: "Collaborateurs",
      path: `${base}/collaborators`,
      icon: <Users size={20} />,
    },
    { label: "Clients", path: `${base}/clients`, icon: <User size={20} /> },
  ];

  return { SUPERADMIN_TABS, DEFAULT_TABS };
}

// ----------------------------------------------------------------------

export function BottomNav() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navItems = useNavigation();

  const {
    value: drawerOpen,
    onTrue: openDrawer,
    onFalse: closeDrawer,
  } = useBoolean();

  const { SUPERADMIN_TABS, DEFAULT_TABS } = useDashboardTabs();

  const features = useAppSelector((state) => state.auth.features);

  const isSuperAdmin =
    features?.some((f) => f.pages.some((p) => p.route === "/collaborators")) &&
    features?.some((f) => f.pages.some((p) => p.route === "/clients"));

  const tabs = isSuperAdmin ? SUPERADMIN_TABS : DEFAULT_TABS;

  const directPaths = tabs
    .filter((t) => t.path !== "__more__")
    .map((t) => t.path);

  const activeTab = directPaths.includes(pathname) ? pathname : "__more__";

  const handleChange = (_: React.SyntheticEvent, value: string) => {
    if (value === "__more__") {
      openDrawer();
    } else {
      navigate(value);
    }
  };

  return (
    <>
      <NavMobile data={navItems} open={drawerOpen} onClose={closeDrawer} />

      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          display: { xs: "block", lg: "none" },
          bgcolor: "background.paper",
          'body[data-hide-bottom-nav="true"] &': {
            display: "none",
          },
        }}
      >
        <BottomNavigation
          value={activeTab}
          onChange={handleChange}
          showLabels={false}
          sx={{
            height: 72,
            bgcolor: "background.paper",
            px: 0.5,
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              maxWidth: "none",
              flex: 1,
              py: 0.5,
              px: 0,
              color: theme.palette.text.secondary,
              transition: "color 0.2s",
            },
          }}
        >
          {tabs.map((tab) => (
            <BottomNavigationAction
              key={tab.path}
              value={tab.path}
              sx={{
                minWidth: 0,
                px: 0.25,
                "& .MuiBottomNavigationAction-label": {
                  display: "none",
                },
              }}
              icon={
                <Box
                  sx={{
                    width: "100%",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 2,
                    px: 0.5,
                    py: 0.55,
                    gap: 0.35,
                    ...(activeTab === tab.path && {
                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                    }),
                  }}
                >
                  {tab.icon}

                  <Box
                    component="span"
                    sx={{
                      display: "-webkit-box",
                      width: "100%",
                      textAlign: "center",
                      fontSize: "0.58rem",
                      lineHeight: 1.05,
                      fontWeight: 500,
                      whiteSpace: "normal",
                      overflow: "visible",
                      textOverflow: "unset",
                      wordBreak: "break-word",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      color:
                        activeTab === tab.path
                          ? theme.palette.primary.main
                          : theme.palette.text.secondary,
                    }}
                  >
                    {tab.label}
                  </Box>
                </Box>
              }
            />
          ))}
        </BottomNavigation>

        <Box
          sx={{
            height: "env(safe-area-inset-bottom, 0px)",
            bgcolor: "background.paper",
          }}
        />
      </Paper>

      <Box
        sx={{
          display: { xs: "block", lg: "none" },
          height: 72,
          'body[data-hide-bottom-nav="true"] &': {
            display: "none",
          },
        }}
      />
    </>
  );
}
