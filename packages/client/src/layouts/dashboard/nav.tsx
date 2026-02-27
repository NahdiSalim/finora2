import type { Theme, SxProps, Breakpoint } from "@mui/material/styles";

import { useEffect } from "react";

import Box from "@mui/material/Box";
import ListItem from "@mui/material/ListItem";
import { useTheme } from "@mui/material/styles";
import ListItemButton from "@mui/material/ListItemButton";
import Drawer, { drawerClasses } from "@mui/material/Drawer";

import { usePathname } from "src/routes/hooks";
import { RouterLink } from "src/routes/components";

import { Scrollbar } from "src/components/scrollbar";

import type { NavItem } from "../nav-config-dashboard";
import { Search } from "lucide-react";
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
  const theme = useTheme();

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
              const isActived = item.path === pathname;

              return (
                <ListItem disableGutters disablePadding key={item.title}>
                  <ListItemButton
                    disableGutters
                    component={RouterLink}
                    href={item.path}
                    sx={[
                      () => ({
                        pl: 2,
                        py: 1,
                        gap: 2,
                        pr: 1.5,
                        borderRadius: 0.75,
                        typography: "body2",
                        fontWeight: "fontWeightMedium",
                        color: "#090B0E",
                        minHeight: 44,
                        "&:hover": {
                          bgcolor: "transparent",
                          color: theme.palette.primary.main,
                        },
                        ...(isActived && {
                          fontWeight: "fontWeightSemiBold",
                          bgcolor: theme.palette.primary.lighter,
                          color: theme.palette.primary.main,
                          "&:hover": {
                            bgcolor: theme.palette.primary.light,
                          },
                        }),
                      }),
                    ]}
                  >
                    <Box component="span" sx={{ width: 24, height: 24 }}>
                      {item.icon}
                    </Box>

                    <Box component="span" sx={{ flexGrow: 1 }}>
                      {item.title}
                    </Box>

                    {item.info && item.info}
                  </ListItemButton>
                </ListItem>
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
