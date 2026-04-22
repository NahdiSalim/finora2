import {
  Archive,
  Calendar,
  FileBadge2,
  FileText,
  FileCheck2,
  Folder,
  HandCoins,
  LayoutGrid,
  List,
  MessageSquareMore,
  Share2,
  Store,
  User,
  Users,
  Briefcase,
} from "lucide-react";

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
  children?: NavItem[];
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
    title: "Tableau de bord",
    icon: <LayoutGrid />,
  },
  "/collaborators": {
    title: "Collaborateurs",
    icon: <Users />,
  },
  "/clients": {
    title: "Clients",
    icon: <Users />,
  },
  "/users": {
    title: "Users",
    icon: <Users />,
  },

  "/documents": {
    title: "Documents",
    icon: <FileText />,
  },
  "/factures": {
    title: "Factures",
    icon: <FileBadge2 />,
  },
  "/devis": {
    title: "Devis",
    icon: <FileCheck2 />,
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

  "/tasks": {
    title: "Mes tâches",
    icon: <Folder />,
  },

  "/suppliers": {
    title: "Fournisseurs",
    icon: <Store />,
  },

  "/bons-commande": {
    title: "Bons de commande",
    icon: <FileText />,
  },

  "/bons-livraison": {
    title: "Bons de livraison",
    icon: <FileCheck2 />,
  },

  "/__finances": {
    title: "Finances",
    icon: <Briefcase />,
  },
};
