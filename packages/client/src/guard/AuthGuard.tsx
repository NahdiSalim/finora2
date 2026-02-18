import type { ReactNode } from 'react';

import { Navigate } from 'react-router-dom';
import { Box } from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';
import { useVerifyUserQuery } from 'src/lib/services/authApi';
import DotSpinner from 'src/components/common/DotSpinner';

interface AuthGuardProps {
  children: ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isLoading } = useVerifyUserQuery();
  const { isAuth } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
      >
        <DotSpinner size={60} />
      </Box>
    );
  }

  if (!isAuth) {
    return <Navigate to="/sign-in" replace />;
  }

  return <>{children}</>;
}
