import {
  Archive,
  Calendar,
  FileText,
  HandCoins,
  LayoutGrid,
  List,
  MessageSquareMore,
  Share2,
  User,
  Users,
} from "lucide-react";

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
    icon: <Archive />,
  },
  "/dashboard": {
    title: "Dashboard",
    icon: <LayoutGrid />,
  },
  "/collaborators": {
    title: "Collaborateurs",
    icon: <Users />,
  },

  "/documents": {
    title: "Documents",
    icon: <FileText />,
  },

  "/meetings": {
    title: "Rendez-vous",
    icon: <Calendar />,
  },

  "/requests": {
    title: "Demandes",
    icon: <List />,
  },

  "/messages": {
    title: "Messagerie",
    icon: <MessageSquareMore />,
  },

  "/banks": {
    title: "Mes banques",
    icon: <HandCoins />,
  },

  "/network": {
    title: "Réseautage",
    icon: <Share2 />,
  },

  "/profile": {
    title: "Mon profil",
    icon: <User />,
  },
};
