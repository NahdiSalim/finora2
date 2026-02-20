// src/sections/auth/AuthSlider.tsx

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

const slides = [
  {
    title: 'The all-in-one platform',
    description: 'Manage your accounting, tasks, documents and keep everything organized.',
  },
  {
    title: 'Simplify your workflow',
    description: 'Streamline your business processes with our intuitive tools.',
  },
  {
    title: 'Stay organized',
    description: 'Keep all your important documents secure and accessible.',
  },
];

export default function AuthSlider() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        p: 4,
        color: '#fff',
        background: "url('public/assets/bg-slider.svg') center/cover no-repeat",
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box component="img" src="/assets/logo-finora.png" alt="Logo" sx={{ maxWidth: 160 }} />
      </Box>

      {/* Content */}
      <Box
        sx={{
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 18,
          }}
        >
          {slides[index].title}
        </Typography>

        <Box
          component="img"
          src="/assets/dash-slider.png"
          alt="Dashboard"
          sx={{
            maxWidth: 260,
            borderRadius: '16px',
          }}
        />

        <Typography
          sx={{
            fontSize: 14,
            opacity: 0.9,
            maxWidth: 300,
          }}
        >
          {slides[index].description}
        </Typography>
      </Box>

      {/* Indicators */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          gap: 1,
        }}
      >
        {slides.map((_, i) => (
          <Box
            key={i}
            onClick={() => setIndex(i)}
            sx={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
          />
        ))}
      </Box>
    </Box>
  );
}
