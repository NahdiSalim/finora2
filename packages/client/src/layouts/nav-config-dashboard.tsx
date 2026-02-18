import PeopleIcon from '@mui/icons-material/People';
import SecurityIcon from '@mui/icons-material/Security';

// ----------------------------------------------------------------------

export type NavItem = {
  title: string;
  path: string;
  icon: React.ReactNode;
  info?: React.ReactNode;
};

export const NAV_CONFIG: Record<string, { title: string; icon: React.ReactNode }> = {
  '/users': {
    title: 'Users Management',
    icon: <PeopleIcon />,
  },
  '/roles': {
    title: 'Roles & Permissions',
    icon: <SecurityIcon />,
  },
};
