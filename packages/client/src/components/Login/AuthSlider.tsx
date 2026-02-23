// src/sections/auth/AuthSlider.tsx

import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';

const slides = [
  {
    title: 'The all-in-one platform',
    description:
      'Manage your accounting, tasks, documents and keep everything organized, secure, and stress-free.',
  },
  {
    title: 'Simplify your workflow',
    description:
      'Streamline your business processes with our intuitive tools and automated solutions.',
  },
  {
    title: 'Stay organized',
    description:
      'Keep all your important documents and data in one secure, easily accessible place.',
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
        borderRadius: 3,
        background: "url('public/assets/bg-slider.svg') center/cover no-repeat",
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
        <Box
          component="img"
          src="public/assets/logo-finora.png"
          alt="Logo"
          sx={{ maxWidth: 160 }}
        />
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
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>{slides[index].title}</Typography>

        {/* Images Container */}
        <Box
          sx={{
            position: 'relative',
            width: 260,
          }}
        >
          {/* Dashboard */}
          <Box
            component="img"
            src="public/assets/dash-slider.png"
            alt="Dashboard"
            sx={{
              width: '100%',
              borderRadius: 3,
            }}
          />

          {/* Folder Overlay */}
          <Box
            component="img"
            src="public/assets/folder-slider.png"
            alt="Folder"
            sx={{
              position: 'absolute',
              right: -20,
              bottom: -20,
              width: 80,
              borderRadius: 2,
              boxShadow: '0 8px 20px rgba(0,0,0,0.2)',
            }}
          />
        </Box>

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
      <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
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
