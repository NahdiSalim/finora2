import ArchiveIcon from "@mui/icons-material/Archive";
import DescriptionIcon from "@mui/icons-material/Description";
import EventIcon from "@mui/icons-material/Event";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MessageIcon from "@mui/icons-material/Message";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import HubIcon from "@mui/icons-material/Hub";
import PersonIcon from "@mui/icons-material/Person";

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const NAV_CONFIG: Record<
  string,
  { title: string; icon: React.ReactNode }
> = {
  "/archive": {
    title: "Archive",
    icon: <ArchiveIcon />,
  },
  "/dashboard": {
    title: "Dashboard",
    icon: <PersonIcon />,
  },
  "/collaborators": {
    title: "Collaborateurs",
    icon: <PersonIcon />,
  },
  "/clients": {
    title: "Clients",
    icon: <PersonIcon />,
  },

  "/documents": {
    title: "Documents",
    icon: <DescriptionIcon />,
  },

  "/meetings": {
    title: "Rendez-vous",
    icon: <EventIcon />,
  },

  "/requests": {
    title: "Demandes",
    icon: <AssignmentIcon />,
  },

  "/messages": {
    title: "Messagerie",
    icon: <MessageIcon />,
  },

  "/banks": {
    title: "Mes banques",
    icon: <AccountBalanceIcon />,
  },

  "/network": {
    title: "Réseautage",
    icon: <HubIcon />,
  },

  "/profile": {
    title: "Mon profil",
    icon: <PersonIcon />,
  },
};
