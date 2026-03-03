import { Stack } from "@mui/material";

import { HeaderSection } from "src/layouts/core/header-section";
import Logo from "src/components/common/Logo";
import CustomButton from "src/components/common/CustomButton";
import { useRouter } from "src/routes/hooks/use-router";

// ----------------------------------------------------------------------

export function PublicNavbar() {
  const router = useRouter();

  return (
    <HeaderSection
      disableElevation
      disableOffset
      layoutQuery="md"
      slots={{
        leftArea: <Logo variant="primary" />,
        rightArea: (
          <Stack direction="row" spacing={1.5}>
            <CustomButton
              variant="outlined"
              color="info"
              onClick={() => router.push("/register")}
              size="medium"
            >
              S&apos;inscrire
            </CustomButton>

            <CustomButton
              variant="contained"
              color="secondary"
              onClick={() => router.push("/sign-in")}
              size="medium"
              sx={{
                px: 2.5,
              }}
            >
              Se connecter
            </CustomButton>
          </Stack>
        ),
      }}
      slotProps={{
        container: {
          maxWidth: false,
        },
      }}
      sx={[
        (theme) => ({
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",

          bgcolor: "transparent",
          "& .MuiToolbar-root": {
            maxWidth: "1440px",
            margin: "8px auto 0",
            bgcolor: "#FFFFFF",
            borderRadius: 24,
            paddingInline: theme.spacing(2),
            paddingBlock: theme.spacing(1.25),
            boxShadow: "0px 10px 25px rgba(15, 23, 42, 0.08)",
            [theme.breakpoints.down("sm")]: {
              borderRadius: 16,
              paddingInline: theme.spacing(1.5),
            },
          },
        }),
      ]}
    />
  );
}
