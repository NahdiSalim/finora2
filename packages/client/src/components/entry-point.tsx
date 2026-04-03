import { Navigate } from "react-router-dom";
import { Box } from "@mui/material";
import DotSpinner from "src/components/common/DotSpinner";
import { useVerifyUserQuery } from "src/lib/services/authApi";
import { useAppDispatch } from "src/hooks/use-redux";
import { logout } from "src/lib/slices/authSlice";
import { CONFIG } from "src/config-global";
import FinoraLandingPage from "src/sections/landing";

/**
 * Entry point at "/": public for everyone.
 * - No token → show visitor page.
 * - Token present → verify with api/auth/me; if valid redirect to backoffice (/dashboard), else clear token and show visitor page.
 */
export default function EntryPoint() {
  const dispatch = useAppDispatch();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const { data, isLoading, isError, isSuccess } = useVerifyUserQuery(
    undefined,
    {
      skip: !token,
    },
  );

  if (!token) {
    return (
      <>
        <title>{`Visiteur - ${CONFIG.appName}`}</title>
        <FinoraLandingPage />
      </>
    );
  }

  if (isLoading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
        }}
      >
        <DotSpinner size={60} />
      </Box>
    );
  }

  if (isError) {
    dispatch(logout());
    return (
      <>
        <title>{`Visiteur - ${CONFIG.appName}`}</title>
        <FinoraLandingPage />
      </>
    );
  }

  if (isSuccess && data) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <title>{`Visiteur - ${CONFIG.appName}`}</title>
      <FinoraLandingPage />
    </>
  );
}
