import React from 'react';
import type { CircularProgressProps } from '@mui/material';
import { Box, useTheme, CircularProgress } from '@mui/material';

interface DotSpinnerProps extends Omit<CircularProgressProps, 'children'> {
  speed?: string;
}

const DotSpinner: React.FC<DotSpinnerProps> = ({
  size = 44,
  speed = '1s',
  color,
  sx,
  ...props
}) => {
  const theme = useTheme();
  const sizeValue = typeof size === 'number' ? `${size}px` : size;
  const spinnerColor = color || theme.palette.secondary.main;

  const dotStyles = {
    position: 'absolute',
    top: 0,
    left: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-start',
    height: '100%',
    width: '100%',
    '&::before': {
      content: '""',
      height: '18%',
      width: '18%',
      borderRadius: '50%',
      backgroundColor: spinnerColor,
      transform: 'scale(0)',
      opacity: 0.5,
      animation: `pulse0112 calc(${speed} * 1.111) ease-in-out infinite`,
    },
  };

  return (
    <>
      <style>
        {`
          @keyframes pulse0112 {
            0%, 100% {
              transform: scale(0);
              opacity: 0.5;
            }
            50% {
              transform: scale(1);
              opacity: 1;
            }
          }
        `}
      </style>
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          height: sizeValue,
          width: sizeValue,
          ...sx,
        }}
      >
        <CircularProgress
          size={size}
          sx={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
          }}
          {...props}
        />

        <Box sx={{ ...dotStyles }} />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(45deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.875)` },
          }}
        />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(90deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.75)` },
          }}
        />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(135deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.625)` },
          }}
        />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(180deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.5)` },
          }}
        />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(225deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.375)` },
          }}
        />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(270deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.25)` },
          }}
        />
        <Box
          sx={{
            ...dotStyles,
            transform: 'rotate(315deg)',
            '&::before': { ...dotStyles['&::before'], animationDelay: `calc(${speed} * -0.125)` },
          }}
        />
      </Box>
    </>
  );
};

export default DotSpinner;
