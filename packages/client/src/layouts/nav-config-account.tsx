import { Iconify } from "src/components/iconify";

import type { AccountPopoverProps } from "./components/account-popover";

// ----------------------------------------------------------------------

export const _account: AccountPopoverProps["data"] = [
  {
    label: "Accueil",
    href: "/dashboard",
    icon: <Iconify width={22} icon="solar:home-angle-bold-duotone" />,
  },
  {
    label: "Profil",
    href: "/dashboard/profile",
    icon: <Iconify width={22} icon="solar:shield-keyhole-bold-duotone" />,
  },
  {
    label: "Paramètres",
    href: "#",
    icon: <Iconify width={22} icon="solar:settings-bold-duotone" />,
  },
];
