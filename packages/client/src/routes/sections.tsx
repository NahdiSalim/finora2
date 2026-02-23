import type { RouteObject } from 'react-router';
import { Outlet } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import Box from '@mui/material/Box';

import DotSpinner from 'src/components/common/DotSpinner';

import { AuthLayout } from 'src/layouts/auth';
import { DashboardLayout } from 'src/layouts/dashboard';

import AuthGuard from 'src/guard/AuthGuard';
import PermissionGuard from 'src/guard/PermissionGuard';
import DefaultRedirect from 'src/components/default-redirect';
import RoleView from 'src/sections/roles';
import RoleFormRouter from 'src/sections/roles/RoleFormRouter';

// ----------------------------------------------------------------------

export const UserPage = lazy(() => import('src/pages/users'));
export const UserFormPage = lazy(() => import('src/sections/user/user-forms/index'));
export const DocumentValidationPage = lazy(
  () => import('src/sections/user/document-validation/index')
);
export const SignInPage = lazy(() => import('src/pages/sign-in'));
export const RegisterPage = lazy(() => import('src/pages/register'));

export const ForgotPasswordPage = lazy(() => import('src/pages/forgot-password'));
export const ResetPasswordPage = lazy(() => import('src/pages/reset-password'));
export const Page404 = lazy(() => import('src/pages/page-not-found'));
export const PageForbidden = lazy(() => import('src/pages/page-forbidden'));
export const CheckEmailPage = lazy(() => import('src/pages/check-email'));

// ----------------------------------------------------------------------

const renderFallback = () => (
  <Box
    sx={{
      display: 'flex',
      flex: '1 1 auto',
      alignItems: 'center',
      justifyContent: 'center',
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
    path: '/',
    Component: DashboardWrapper,
    children: [
      {
        index: true,
        element: <DefaultRedirect />,
      },
      {
        path: 'users',
        element: (
          <PermissionGuard requiredPath="/users">
            <UserPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'user/new',
        element: (
          <PermissionGuard requiredPath="/users">
            <UserFormPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'user/edit/:id',
        element: (
          <PermissionGuard requiredPath="/users">
            <UserFormPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'user/:id/documents',
        element: (
          <PermissionGuard requiredPath="/users">
            <DocumentValidationPage />
          </PermissionGuard>
        ),
      },
      {
        path: 'roles',
        element: (
          <PermissionGuard requiredPath="/roles">
            <RoleView />
          </PermissionGuard>
        ),
      },
      {
        path: 'role/new',
        element: (
          <PermissionGuard requiredPath="/roles">
            <RoleFormRouter />
          </PermissionGuard>
        ),
      },
      {
        path: 'role/edit/:id',
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
    path: 'sign-in',
    element: (
      <AuthLayout>
        <SignInPage />
      </AuthLayout>
    ),
  },
  {
    path: 'register',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <RegisterPage />,
      },
    ],
  },
  {
    path: 'check-email',
    element: <AuthLayout />,
    children: [
      {
        index: true,
        element: <CheckEmailPage />,
      },
    ],
  },

  {
    path: 'forgot-password',
    element: (
      <AuthLayout>
        <ForgotPasswordPage />
      </AuthLayout>
    ),
  },
  {
    path: 'reset-password',
    element: (
      <AuthLayout>
        <ResetPasswordPage />
      </AuthLayout>
    ),
  },

  // Error pages
  { path: '403', element: <PageForbidden /> },
  { path: '404', element: <Page404 /> },
  { path: '*', element: <Page404 /> },
];
