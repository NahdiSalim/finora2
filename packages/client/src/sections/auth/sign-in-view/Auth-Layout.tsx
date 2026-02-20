// src/layouts/AuthLayout.tsx

import { Outlet } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import AuthSlider from 'src/components/Login/AuthSlider';

export default function AuthLayout() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#F3F4F6',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 900,
          backgroundColor: '#fff',
          borderRadius: '24px',
          boxShadow: '0px 20px 40px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
          }}
        >
          {/* LEFT SLIDER */}
          <Box sx={{ width: { xs: '100%', md: '50%' } }}>
            <AuthSlider />
          </Box>

          {/* RIGHT CONTENT */}
          <Box
            sx={{
              width: { xs: '100%', md: '50%' },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ p: { xs: 4, md: 6 } }}>
              <Outlet />
            </Box>

            <Typography
              sx={{
                fontSize: 12,
                color: '#9CA3AF',
                textAlign: 'center',
                pb: 2,
              }}
            >
              © 2025 FINORA, tous les droits réservés
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
