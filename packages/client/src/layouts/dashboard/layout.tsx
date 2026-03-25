import type { Breakpoint } from "@mui/material/styles";

import { merge } from "es-toolkit";
import { useBoolean } from "minimal-shared/hooks";

import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import { useTheme } from "@mui/material/styles";

import { _messages, _notifications } from "src/_mock";

import { NavMobile, NavDesktop } from "./nav";
import { layoutClasses } from "../core/classes";
import { _account } from "../nav-config-account";
import { dashboardLayoutVars } from "./css-vars";
import { useNavigation } from "src/hooks/useNavigation";
import { MainSection } from "../core/main-section";
// import { Searchbar } from '../components/searchbar';
import { MenuButton } from "../components/menu-button";
import { HeaderSection } from "../core/header-section";
import { LayoutSection } from "../core/layout-section";
import { AccountPopover } from "../components/account-popover";
// import { LanguagePopover } from '../components/language-popover';
// import { NotificationsPopover } from '../components/notifications-popover';

import type { MainSectionProps } from "../core/main-section";
import type { HeaderSectionProps } from "../core/header-section";
import type { LayoutSectionProps } from "../core/layout-section";
import { NotificationsPopover } from "../components/notifications-popover";
import { MessagesPopover } from "../components/messages-popover";
import Logo from "src/components/common/Logo";
import { GlobalFileDrawer } from "src/components/common/FileDrawer";

// ----------------------------------------------------------------------

type LayoutBaseProps = Pick<LayoutSectionProps, "sx" | "children" | "cssVars">;

export type DashboardLayoutProps = LayoutBaseProps & {
  layoutQuery?: Breakpoint;
  slotProps?: {
    header?: HeaderSectionProps;
    main?: MainSectionProps;
  };
};

export function DashboardLayout({
  sx,
  cssVars,
  children,
  slotProps,
  layoutQuery = "lg",
}: DashboardLayoutProps) {
  const theme = useTheme();

  const { value: open, onFalse: onClose, onTrue: onOpen } = useBoolean();
  const navItems = useNavigation();

  const renderHeader = () => {
    const headerSlotProps: HeaderSectionProps["slotProps"] = {
      container: {
        maxWidth: false,
      },
    };

    const headerSlots: HeaderSectionProps["slots"] = {
      topArea: (
        <Alert severity="info" sx={{ display: "none", borderRadius: 0 }}>
          This is an info Alert.
        </Alert>
      ),
      leftArea: (
        <>
          {/** @slot Nav mobile */}
          <MenuButton
            onClick={onOpen}
            sx={{
              mr: 1,
              ml: -1,
              [theme.breakpoints.up(layoutQuery)]: { display: "none" },
            }}
          />
          <NavMobile data={navItems} open={open} onClose={onClose} />

          <Logo variant="primary" />
        </>
      ),
      rightArea: (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 0, sm: 0.75 },
          }}
        >
          {/** @slot Searchbar */}
          {/* <Searchbar /> */}

          {/** @slot Language popover */}
          {/* <LanguagePopover data={_langs} /> */}

          {/** @slot messages popover */}
          <MessagesPopover data={_messages} />

          {/** @slot Notifications popover */}
          <NotificationsPopover data={_notifications} />

          {/** @slot Account drawer */}
          <AccountPopover data={_account} />
        </Box>
      ),
    };

    return (
      <HeaderSection
        disableElevation
        disableOffset
        layoutQuery={layoutQuery}
        {...slotProps?.header}
        slots={{ ...headerSlots, ...slotProps?.header?.slots }}
        slotProps={merge(headerSlotProps, slotProps?.header?.slotProps ?? {})}
        sx={[
          (themeProps) => ({
            bgcolor: themeProps.palette.common.white,
            borderRadius: 3,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            flexDirection: "row",
            m: 1.5,
            width: "calc(100% - 24px)", // 👈 accounts for mx: 1.5 (12px each side)
            height: "var(--layout-header-mobile-height)",
            [themeProps.breakpoints.up(layoutQuery)]: {
              position: "fixed",
              top: 12,
              left: 12,
              right: 12,
              m: 0,
              width: "auto",
              zIndex: "calc(var(--layout-nav-zIndex) + 1)",
            },
          }),
          ...(Array.isArray(slotProps?.header?.sx)
            ? (slotProps?.header?.sx ?? [])
            : [slotProps?.header?.sx]),
        ]}
      />
    );
  };

  const renderFooter = () => null;

  const renderMain = () => (
    <MainSection {...slotProps?.main}>
      {children}
      <GlobalFileDrawer />
    </MainSection>
  );

  return (
    <LayoutSection
      /** **************************************
       * @Header
       *************************************** */
      headerSection={renderHeader()}
      /** **************************************
       * @Sidebar
       *************************************** */
      sidebarSection={<NavDesktop data={navItems} layoutQuery={layoutQuery} />}
      /** **************************************
       * @Footer
       *************************************** */
      footerSection={renderFooter()}
      /** **************************************
       * @Styles
       *************************************** */
      cssVars={{ ...dashboardLayoutVars(theme), ...cssVars }}
      sx={[
        {
          [`& .${layoutClasses.sidebarContainer}`]: {
            [theme.breakpoints.up(layoutQuery)]: {
              pl: "var(--layout-nav-vertical-width)",
              pt: "calc(var(--layout-header-desktop-height) + 24px)",
              transition: theme.transitions.create(["padding-left"], {
                easing: "var(--layout-transition-easing)",
                duration: "var(--layout-transition-duration)",
              }),
            },
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {renderMain()}
    </LayoutSection>
  );
}
