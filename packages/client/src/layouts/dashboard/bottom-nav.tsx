import { useLocation, useNavigate } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Paper,
} from "@mui/material";
import {
  MessageSquareMore,
  Calendar,
  Users,
  User,
  FileText,
  List,
  Folder,
  ClipboardList,
} from "lucide-react";
import { useTheme, alpha } from "@mui/material/styles";
import { useBoolean } from "minimal-shared/hooks";
import { NavMobile } from "./nav";
import { useNavigation } from "src/hooks/useNavigation";
import { useDashboardBase, getRoleSlug } from "src/hooks/useDashboardBase";
import { useVerifyUserQuery } from "src/lib/services/authApi";

// ----------------------------------------------------------------------

function useDashboardTabs() {
  const base = useDashboardBase();

  // CLIENT: Demandes · Documents · Messagerie · Profil
  const CLIENT_TABS = [
    { label: "Demandes", path: `${base}/requests`, icon: <List size={20} /> },
    {
      label: "Documents",
      path: `${base}/documents`,
      icon: <FileText size={20} />,
    },
    {
      label: "Messagerie",
      path: `${base}/messages`,
      icon: <MessageSquareMore size={20} />,
    },
    { label: "Profil", path: `${base}/profile`, icon: <User size={20} /> },
  ];

  // ACCOUNTANT: Clients · Collaborateurs · Rendez-vous · Messagerie
  const ACCOUNTANT_TABS = [
    { label: "Clients", path: `${base}/clients`, icon: <Users size={20} /> },
    {
      label: "Collaborateurs",
      path: `${base}/collaborators`,
      icon: <ClipboardList size={20} />,
    },
    {
      label: "Rendez-vous",
      path: `${base}/meetings`,
      icon: <Calendar size={20} />,
    },
    {
      label: "Messagerie",
      path: `${base}/messages`,
      icon: <MessageSquareMore size={20} />,
    },
  ];

  // COLLABORATOR: Tâches · Documents · Messagerie  (3 tabs only)
  const COLLABORATOR_TABS = [
    { label: "Tâches", path: `${base}/tasks`, icon: <Folder size={20} /> },
    {
      label: "Documents",
      path: `${base}/documents`,
      icon: <FileText size={20} />,
    },
    {
      label: "Messagerie",
      path: `${base}/messages`,
      icon: <MessageSquareMore size={20} />,
    },
  ];

  return { CLIENT_TABS, ACCOUNTANT_TABS, COLLABORATOR_TABS };
}

// ----------------------------------------------------------------------

export function BottomNav() {
  const theme = useTheme();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const navItems = useNavigation();
  const { data: userData } = useVerifyUserQuery();

  const {
    value: drawerOpen,
    onTrue: openDrawer,
    onFalse: closeDrawer,
  } = useBoolean();

  const { CLIENT_TABS, ACCOUNTANT_TABS, COLLABORATOR_TABS } =
    useDashboardTabs();

  // Derive role from verified user data
  const rawRole =
    typeof userData?.role === "object"
      ? userData.role?.code
      : (userData?.role as string | undefined);
  const roleSlug = getRoleSlug(rawRole);

  const tabs =
    roleSlug === "client"
      ? CLIENT_TABS
      : roleSlug === "collaborateur"
        ? COLLABORATOR_TABS
        : ACCOUNTANT_TABS; // comptable + admin

  const directPaths = tabs.map((t) => t.path);

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
