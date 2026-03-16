import React from "react";
import { Box, Typography, useTheme, alpha } from "@mui/material";
import type { LucideIcon } from "lucide-react";

export type StrengthLevel = "weak" | "medium" | "strong";

export interface ProfileStrengthProps {
  icon: LucideIcon;
  title: string;
  caption: string;
  completedSteps: number;
  totalSteps: number;
}

const ProfileStrength: React.FC<ProfileStrengthProps> = ({
  icon: Icon,
  title,
  caption,
  completedSteps,
  totalSteps,
}) => {
  const theme = useTheme();

  const percentage = (completedSteps / totalSteps) * 100;

  // Ranges de couleur par pourcentage :
  // 0–39%   → faible  (rouge)
  // 40–79%  → moyen   (orange)
  // 80–100% → fort    (vert)
  let strength: StrengthLevel = "weak";
  if (percentage >= 80) strength = "strong";
  else if (percentage >= 40) strength = "medium";

  const strengthColors = {
    weak: "#F97373", // rouge
    medium: "#FDBA74", // orange
    strong: "#22C55E", // vert
  };

  const containerBg = alpha(strengthColors[strength], 0.08);
  const borderColor = alpha(strengthColors[strength], 0.4);

  return (
    <Box
      sx={{
        p: 3,
        borderRadius: 3,
        border: `1px solid ${borderColor}`,
        backgroundColor: containerBg,
      }}
    >
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: alpha(strengthColors[strength], 0.15),
            color: strengthColors[strength],
          }}
        >
          <Icon size={20} />
        </Box>

        <Box>
          <Typography variant="subtitle1" fontWeight={700}>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {caption}
          </Typography>
        </Box>
      </Box>

      {/* Progress Bars */}
      <Box
        sx={{
          display: "flex",
          gap: 1,
          mt: 2,
        }}
      >
        {Array.from({ length: totalSteps }).map((_, index) => {
          const filled = index < completedSteps;

          return (
            <Box
              key={index}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 2,
                backgroundColor: filled
                  ? strengthColors[strength]
                  : theme.palette.grey[300],
                transition: "background-color 0.3s ease",
              }}
            />
          );
        })}
      </Box>
    </Box>
  );
};

export default ProfileStrength;
