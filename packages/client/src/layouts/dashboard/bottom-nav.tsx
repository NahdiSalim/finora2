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

// ----------------------------------------------------------------------

const SUPERADMIN_TABS = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutGrid size={22} /> },
  {
    label: "Collaborateurs",
    path: "/collaborators",
    icon: <Users size={22} />,
  },
  { label: "Clients", path: "/clients", icon: <User size={22} /> },
  {
    label: "Messagerie",
    path: "/messages",
    icon: <MessageSquareMore size={22} />,
  },
  { label: "Rendez-vous", path: "/meetings", icon: <Calendar size={22} /> },
];

const DEFAULT_TABS = [
  { label: "Dashboard", path: "/dashboard", icon: <LayoutGrid size={22} /> },
  {
    label: "Messagerie",
    path: "/messages",
    icon: <MessageSquareMore size={22} />,
  },
  { label: "Rendez-vous", path: "/meetings", icon: <Calendar size={22} /> },
  {
    label: "Collaborateurs",
    path: "/collaborators",
    icon: <Users size={22} />,
  },
  { label: "Clients", path: "/clients", icon: <User size={22} /> },
];

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

  // Determine role — superadmin has access to both /collaborators and /clients
  const features = useAppSelector((state) => state.auth.features);
  const isSuperAdmin =
    features?.some((f) => f.pages.some((p) => p.route === "/collaborators")) &&
    features?.some((f) => f.pages.some((p) => p.route === "/clients"));

  const tabs = isSuperAdmin ? SUPERADMIN_TABS : DEFAULT_TABS;

  // Match active tab — "Plus" is active when current path isn't a direct tab
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
      {/* Drawer triggered by "Plus" tab */}
      <NavMobile data={navItems} open={drawerOpen} onClose={closeDrawer} />

      {/* Bottom navigation bar */}
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: theme.zIndex.appBar,
          borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          display: { xs: "block", lg: "none" }, // hide on desktop
        }}
      >
        <BottomNavigation
          value={activeTab}
          onChange={handleChange}
          sx={{
            height: 64,
            bgcolor: "background.paper",
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              gap: 0.5,
              py: 1,
              color: theme.palette.text.secondary,
              transition: "color 0.2s",
              "& .MuiBottomNavigationAction-label": {
                fontSize: "0.7rem",
                fontWeight: 500,
                opacity: 1,
                "&.Mui-selected": {
                  fontSize: "0.7rem",
                },
              },
              "&.Mui-selected": {
                color: theme.palette.primary.main,
              },
            },
          }}
        >
          {tabs.map((tab) => (
            <BottomNavigationAction
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 2,
                transition: "background-color 0.2s",
                ...(activeTab === tab.path && {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                }),
              }}
              key={tab.path}
              label={tab.label}
              value={tab.path}
              icon={<Box>{tab.icon}</Box>}
            />
          ))}
        </BottomNavigation>

        {/* Safe area spacer for iOS */}
        <Box
          sx={{
            height: "env(safe-area-inset-bottom, 0px)",
            bgcolor: "background.paper",
          }}
        />
      </Paper>

      {/* Push page content up so it's not hidden behind the nav */}
      <Box sx={{ display: { xs: "block", lg: "none" }, height: 64 }} />
    </>
  );
}
