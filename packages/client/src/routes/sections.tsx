import type { RouteObject } from "react-router";
import { Outlet } from "react-router-dom";
import { lazy, Suspense } from "react";
import Box from "@mui/material/Box";

import DotSpinner from "src/components/common/DotSpinner";

import { DashboardLayout } from "src/layouts/dashboard";

import AuthGuard from "src/guard/AuthGuard";
import PermissionGuard from "src/guard/PermissionGuard";
import DefaultRedirect from "src/components/default-redirect";
import RoleView from "src/sections/roles";
import RoleFormRouter from "src/sections/roles/RoleFormRouter";
import AuthLayout from "src/sections/auth/sign-in-view/Auth-Layout";

// ----------------------------------------------------------------------

export const UserPage = lazy(() => import("src/pages/users"));
export const CollaboratorPage = lazy(() => import("src/pages/collaborators"));
export const ClientPage = lazy(() => import("src/pages/clients"));
export const ProfilePage = lazy(() => import("src/pages/profile"));

export const UserFormPage = lazy(
  () => import("src/sections/user/user-forms/index"),
);
export const DocumentValidationPage = lazy(
  () => import("src/sections/user/document-validation/index"),
);
export const SignInPage = lazy(() => import("src/pages/sign-in"));
export const RegisterPage = lazy(() => import("src/pages/register"));
export const VisitorPage = lazy(() => import("src/pages/visitor"));
export const EntryPointPage = lazy(() =>
  import("src/components/entry-point").then((m) => ({ default: m.default })),
);

export const ForgotPasswordPage = lazy(
  () => import("src/pages/forgot-password"),
);
export const ResetPasswordPage = lazy(() => import("src/pages/reset-password"));
export const Page404 = lazy(() => import("src/pages/page-not-found"));
export const PageForbidden = lazy(() => import("src/pages/page-forbidden"));
export const CheckEmailPage = lazy(() => import("src/pages/check-email"));

// ----------------------------------------------------------------------

const renderFallback = () => (
  <Box
    sx={{
      display: "flex",
      flex: "1 1 auto",
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <DotSpinner size={40} />
  </Box>
);

function DashboardWrapper() {
  return (
    <AuthGuard>
      <DashboardLayout>
        <Suspense fallback={renderFallback()}>
          <Outlet />
        </Suspense>
      </DashboardLayout>
    </AuthGuard>
  );
}

// ----------------------------------------------------------------------

export const routesSection: RouteObject[] = [
  {
    path: "/",
    element: (
      <Suspense fallback={renderFallback()}>
        <EntryPointPage />
      </Suspense>
    ),
  },
  {
    path: "dashboard",
    Component: DashboardWrapper,
    children: [
      {
        index: true,
        element: <DefaultRedirect />,
      },
      {
        path: "users",
        element: (
          <PermissionGuard requiredPath="/archive">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "collaborators",
        element: (
          <PermissionGuard requiredPath="/collaborators">
            <CollaboratorPage />
          </PermissionGuard>
        ),
      },
      {
        path: "clients",
        element: (
          <PermissionGuard requiredPath="/clients">
            <ClientPage />
          </PermissionGuard>
        ),
      },
      {
        path: "dashboard",
        element: (
          <PermissionGuard requiredPath="/dashboard">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "documents",
        element: (
          <PermissionGuard requiredPath="/documents">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "documents/:id",
        element: (
          <PermissionGuard requiredPath="/documents/:id">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "meetings",
        element: (
          <PermissionGuard requiredPath="/meetings">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "meetings/:id",
        element: (
          <PermissionGuard requiredPath="/meetings/:id">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "requests",
        element: (
          <PermissionGuard requiredPath="/requests">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "requests/:id",
        element: (
          <PermissionGuard requiredPath="/requests/:id">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "messages",
        element: (
          <PermissionGuard requiredPath="/messages">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "messages/:id",
        element: (
          <PermissionGuard requiredPath="/messages/:id">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "banks",
        element: (
          <PermissionGuard requiredPath="/banks">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "network",
        element: (
          <PermissionGuard requiredPath="/network">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "profile",
        element: (
          <PermissionGuard requiredPath="/profile">
            <ProfilePage />
          </PermissionGuard>
        ),
      },
      {
        path: "profile/edit",
        element: (
          <PermissionGuard requiredPath="/profile/edit">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: "user/new",
        element: (
          <PermissionGuard requiredPath="/users">
            <UserFormPage />
          </PermissionGuard>
        ),
      },
      {
        path: "user/edit/:id",
        element: (
          <PermissionGuard requiredPath="/users">
            <UserFormPage />
          </PermissionGuard>
        ),
      },
      {
        path: "user/:id/documents",

        element: (
          <PermissionGuard requiredPath="/users">
            <DocumentValidationPage />
          </PermissionGuard>
        ),
      },
      {
        path: "roles",
        element: (
          <PermissionGuard requiredPath="/roles">
            <RoleView />
          </PermissionGuard>
        ),
      },
      {
        path: "role/new",
        element: (
          <PermissionGuard requiredPath="/roles">
            <RoleFormRouter />
          </PermissionGuard>
        ),
      },
      {
        path: "role/edit/:id",
        element: (
          <PermissionGuard requiredPath="/roles">
            <RoleFormRouter />
          </PermissionGuard>
        ),
      },
    ],
  },

  // Auth routes (sans protection)
  {
    path: "visitor",
    element: <VisitorPage />,
  },
  {
    path: "sign-in",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <SignInPage />,
      },
    ],
  },
  {
    path: "register",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: "check-email",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <CheckEmailPage />,
      },
    ],
  },

  {
    path: "forgot-password",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <ForgotPasswordPage />,
      },
    ],
  },
  {
    path: "reset-password",
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <ResetPasswordPage />,
      },
    ],
  },
  // Error pages
  { path: "403", element: <PageForbidden /> },
  { path: "404", element: <Page404 /> },
  { path: "*", element: <Page404 /> },
];
