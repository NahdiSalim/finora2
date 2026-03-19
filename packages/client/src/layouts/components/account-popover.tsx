import type { ButtonProps } from "@mui/material/Button";

import { useState, useCallback, useMemo } from "react";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Popover from "@mui/material/Popover";
import Divider from "@mui/material/Divider";
import MenuList from "@mui/material/MenuList";
import Typography from "@mui/material/Typography";
import Avatar from "@mui/material/Avatar";
import MenuItem, { menuItemClasses } from "@mui/material/MenuItem";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme, alpha } from "@mui/material/styles";

import { useRouter, usePathname } from "src/routes/hooks";

import { useVerifyUserQuery } from "src/lib/services/authApi";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import { store } from "src/lib/store";

// ----------------------------------------------------------------------

export type AccountPopoverProps = ButtonProps & {
  data?: {
    label: string;
    href: string;
    icon?: React.ReactNode;
    info?: React.ReactNode;
  }[];
};

export function AccountPopover({
  data = [],
  sx,
  ...other
}: AccountPopoverProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("lg"));
  const router = useRouter();
  const { data: userData } = useVerifyUserQuery();

  const pathname = usePathname();

  const [openPopover, setOpenPopover] = useState<HTMLButtonElement | null>(
    null,
  );

  const handleOpenPopover = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      setOpenPopover(event.currentTarget);
    },
    [],
  );

  const handleClosePopover = useCallback(() => {
    setOpenPopover(null);
  }, []);

  const handleClickItem = useCallback(
    (path: string) => {
      handleClosePopover();
      router.push(path);
    },
    [handleClosePopover, router],
  );

  const handleLogout = useCallback(() => {
    store.resetApp();
    handleClosePopover();
    router.push("/sign-in");
  }, [handleClosePopover, router]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const role = typeof userData?.role === "object" ? userData.role : null;
  const roleCode =
    role?.code ?? (typeof userData?.role === "string" ? userData.role : "");
  const companyName = userData?.company?.name ?? null;
  const fullName =
    userData?.firstName && userData?.lastName
      ? `${userData.firstName} ${userData.lastName}`.trim()
      : userData?.full_name || "User";

  const isAccountant =
    roleCode === "ACCOUNTANT" ||
    (typeof roleCode === "string" &&
      roleCode.toLowerCase().includes("comptable"));
  const isClient =
    roleCode === "CLIENT" ||
    (typeof roleCode === "string" && roleCode.toLowerCase() === "client");

  const displayName = isAccountant && companyName ? companyName : fullName;
  const subtitle = isAccountant
    ? "Cabinet de comptabilité"
    : isClient && companyName
      ? companyName
      : (role?.name ?? "Member");

  const email = userData?.email || "";
  const photoUrl = userData?.photoUrl || null;
  const dashboardBase = useDashboardBase();

  const menuData = useMemo(
    () =>
      data.map((opt) => ({
        ...opt,
        href: opt.href.startsWith("/dashboard")
          ? dashboardBase + opt.href.slice("/dashboard".length)
          : opt.href,
      })),
    [data, dashboardBase],
  );

  return (
    <>
      <Button
        onClick={handleOpenPopover}
        sx={{
          minWidth: isMobile ? 38 : "auto",
          width: isMobile ? 38 : "auto",
          height: isMobile ? 38 : "auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: isMobile ? 0 : 1,
          px: isMobile ? 0 : 2,
          py: isMobile ? 0 : 1,
          borderRadius: isMobile ? "50%" : 2,
          backgroundColor: "transparent",
          transition: theme.transitions.create(["background-color"]),
          flexShrink: 0,
          textTransform: "none",
          "&:hover": {
            backgroundColor: alpha(theme.palette.primary.main, 0.08),
          },
          ...sx,
        }}
        {...other}
      >
        <Avatar
          src={photoUrl ?? undefined}
          alt={displayName}
          sx={{
            width: isMobile ? 34 : 40,
            height: isMobile ? 34 : 40,
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            fontSize: isMobile ? 12 : 14,
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          {getInitials(displayName)}
        </Avatar>

        <Box
          sx={{
            display: { xs: "none", lg: "flex" },
            flexDirection: "column",
            alignItems: "flex-start",
            minWidth: 0,
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: 600,
              color: theme.palette.text.primary,
              lineHeight: 1.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: 150,
            }}
          >
            {displayName}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.text.secondary,
              lineHeight: 1.2,
            }}
          >
            {subtitle}
          </Typography>
        </Box>
      </Button>

      <Popover
        open={!!openPopover}
        anchorEl={openPopover}
        onClose={handleClosePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              width: 280,
              mt: 1,
              boxShadow: theme.shadows[8],
            },
          },
        }}
      >
        <Box
          sx={{
            p: 2.5,
            display: "flex",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Avatar
            src={photoUrl ?? undefined}
            alt={displayName}
            sx={{
              width: 48,
              height: 48,
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              fontSize: 16,
              fontWeight: 600,
            }}
          >
            {getInitials(displayName)}
          </Avatar>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 600,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {displayName}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.secondary,
                display: "block",
                mb: 0.5,
              }}
            >
              {subtitle}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.text.disabled,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {email}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderStyle: "dashed" }} />

        {data.length > 0 && (
          <>
            <MenuList
              disablePadding
              sx={{
                p: 1,
                gap: 0.5,
                display: "flex",
                flexDirection: "column",
                [`& .${menuItemClasses.root}`]: {
                  px: 1.5,
                  py: 1,
                  gap: 2,
                  borderRadius: 1,
                  color: theme.palette.text.secondary,
                  transition: theme.transitions.create([
                    "background-color",
                    "color",
                  ]),
                  "&:hover": {
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  },
                  [`&.${menuItemClasses.selected}`]: {
                    color: theme.palette.primary.main,
                    backgroundColor: alpha(theme.palette.primary.main, 0.12),
                    fontWeight: 600,
                  },
                },
              }}
            >
              {menuData.map((option) => (
                <MenuItem
                  key={option.label}
                  selected={option.href === pathname}
                  onClick={() => handleClickItem(option.href)}
                >
                  {option.icon}
                  {option.label}
                </MenuItem>
              ))}
            </MenuList>

            <Divider sx={{ borderStyle: "dashed" }} />
          </>
        )}

        <Box sx={{ p: 1.5 }}>
          <Button
            fullWidth
            variant="outlined"
            color="error"
            size="medium"
            onClick={handleLogout}
            sx={{
              borderRadius: 1,
              textTransform: "none",
              fontWeight: 600,
            }}
          >
            Se déconnecter
          </Button>
        </Box>
      </Popover>
    </>
  );
}
