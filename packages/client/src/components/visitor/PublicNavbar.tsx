import { Stack, useTheme } from "@mui/material";

import { HeaderSection } from "src/layouts/core/header-section";
import Logo from "src/components/common/Logo";
import CustomButton from "src/components/common/CustomButton";
import { useRouter } from "src/routes/hooks/use-router";
import { useAppSelector } from "src/hooks/use-redux";

// ----------------------------------------------------------------------

export function PublicNavbar() {
  const router = useRouter();
  const theme = useTheme();
  const { isAuth } = useAppSelector((state) => state.auth);

  return (
    <HeaderSection
      disableElevation
      disableOffset
      layoutQuery="md"
      slots={{
        leftArea: <Logo variant="primary" />,

        rightArea: !isAuth ? (
          <Stack direction="row" spacing={1.5}>
            <CustomButton
              variant="outlined"
              color="info"
              onClick={() => router.push("/register")}
              size="medium"
              sx={{ boxShadow: `0px 1px 2px ${theme.palette.info.lighter}` }}
            >
              S&apos;inscrire
            </CustomButton>

            <CustomButton
              variant="contained"
              color="secondary"
              onClick={() => router.push("/sign-in")}
              size="medium"
              sx={{ px: 2.5 }}
            >
              Se connecter
            </CustomButton>
          </Stack>
        ) : null,
      }}
      slotProps={{
        container: { maxWidth: false },
      }}
    />
  );
}
