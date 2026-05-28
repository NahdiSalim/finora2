// src/sections/auth/AuthSlider.tsx

import { useEffect, useState } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import Logo from "src/components/common/Logo";

const slides = [
  {
    title: "The all-in-one platform",
    description:
      "Manage your accounting, tasks, documents and keep everything organized.",
  },
  {
    title: "Simplify your workflow",
    description: "Streamline your business processes with our intuitive tools.",
  },
  {
    title: "Stay organized",
    description: "Keep all your important documents secure and accessible.",
  },
];

export default function AuthSlider() {
  const theme = useTheme();
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");
  const [isAnimating, setIsAnimating] = useState(false);

  const handleNext = () => {
    if (isAnimating) return;
    setDirection("right");
    setIsAnimating(true);
    setIndex((prev) => (prev + 1) % slides.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handleDotClick = (i: number) => {
    if (isAnimating || i === index) return;
    setDirection(i > index ? "right" : "left");
    setIsAnimating(true);
    setIndex(i);
    setTimeout(() => setIsAnimating(false), 500);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 3000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        p: 4,
        color: theme.palette.common.white,
        background: "url('/assets/bg-slider.svg') center/cover no-repeat",
      }}
    >
      {/* Logo */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <Logo variant="primary" size={160} isOnDark />
      </Box>

      {/* Content */}
      <Box
        sx={{
          position: "relative",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 4,
          alignItems: "center",
        }}
      >
        {/* Title with Animation */}
        <Box
          key={`title-${index}`}
          sx={{
            animation: "fadeSlideIn 0.6s ease-out",
            "@keyframes fadeSlideIn": {
              "0%": {
                opacity: 0,
                transform:
                  direction === "right"
                    ? "translateX(30px)"
                    : "translateX(-30px)",
              },
              "100%": {
                opacity: 1,
                transform: "translateX(0)",
              },
            },
          }}
        >
          <Typography
            sx={{
              fontWeight: theme.typography.fontWeightBold,
              fontSize: theme.typography.h6.fontSize,
              background: `linear-gradient(135deg, ${theme.palette.common.white} 0%, rgba(255,255,255,0.8) 100%)`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {slides[index].title}
          </Typography>
        </Box>

        {/* Image with Scale Animation */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            maxWidth: 480,
          }}
        >
          <Box
            key={`image-${index}`}
            component="img"
            src="/assets/dash.svg"
            alt="Dashboard"
            sx={{
              width: "100%",
              maxWidth: 480,
              borderRadius: "16px",
              //boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              animation: "scaleIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
              "@keyframes scaleIn": {
                "0%": {
                  opacity: 0,
                  transform: "scale(0.9)",
                },
                "100%": {
                  opacity: 1,
                  transform: "scale(1)",
                },
              },
            }}
          />
        </Box>

        {/* Description with Delay Animation */}
        <Box
          key={`desc-${index}`}
          sx={{
            animation: "fadeIn 0.6s ease-out 0.2s both",
            "@keyframes fadeIn": {
              "0%": {
                opacity: 0,
                transform: "translateY(10px)",
              },
              "100%": {
                opacity: 1,
                transform: "translateY(0)",
              },
            },
          }}
        >
          <Typography
            variant="body1"
            sx={{
              opacity: 0.9,
              maxWidth: 300,
            }}
          >
            {slides[index].description}
          </Typography>
        </Box>
      </Box>

      {/* Modern Indicators */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 1,
          }}
        >
          {slides.map((_, i) => (
            <Box
              key={i}
              onClick={() => handleDotClick(i)}
              sx={{
                position: "relative",
                width: i === index ? 32 : 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  i === index
                    ? theme.palette.common.white
                    : "rgba(255, 255, 255, 0.3)",
                cursor: "pointer",
                transition: theme.transitions.create(["all"], {
                  duration: theme.transitions.duration.standard,
                  easing: theme.transitions.easing.easeInOut,
                }),
                overflow: "hidden",
                "&:hover": {
                  backgroundColor:
                    i === index
                      ? theme.palette.common.white
                      : "rgba(255, 255, 255, 0.5)",
                  transform: "scale(1.1)",
                },
                // Progress bar for active slide
                ...(i === index && {
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: "100%",
                    backgroundColor: "rgba(255, 255, 255, 0.3)",
                    animation: "progress 3000ms linear",
                    "@keyframes progress": {
                      "0%": { transform: "translateX(-100%)" },
                      "100%": { transform: "translateX(0)" },
                    },
                  },
                }),
              }}
            />
          ))}
        </Box>
      </Box>
    </Box>
  );
}
