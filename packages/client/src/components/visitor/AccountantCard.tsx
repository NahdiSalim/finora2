import {
  Avatar,
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import StarIcon from "@mui/icons-material/Star";
import { useState } from "react";
import CustomButton from "src/components/common/CustomButton";

// ----------------------------------------------------------------------

export type Accountant = {
  name: string;
  initials: string;
  avatarColor: string;
  yearsExperience: number;
  location: string;
  rating: number;
  reviews: number;
  tags: string[];
  featured?: boolean;
  profilePhotoUrl?: string;
  title?: string;
  description?: string;
};

type AccountantCardProps = {
  data: Accountant;
};

export function AccountantCard({ data }: AccountantCardProps) {
  const {
    name,
    initials,
    avatarColor,
    yearsExperience,
    location,
    rating,
    reviews,
    tags,
    featured,
    profilePhotoUrl,
    title = "Expert comptable",
    description = "Mollit in laborum tempor Lorem incididunt irure. Aute eu ex ad sunt. Pariatur sint culpa do incididunt eiusmod eiusmod culpa.",
  } = data;

  const [imageError, setImageError] = useState(false);

  const showImage = profilePhotoUrl && !imageError;
  const ratingValue = Number.isFinite(rating) ? rating : 0;
  const reviewsValue = Number.isFinite(reviews) ? reviews : 0;

  return (
    <Card
      sx={{
        position: "relative",
        height: "100%",
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        boxShadow: "0px 10px 20px rgba(15, 23, 42, 0.05)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {featured && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            right: 0,
            px: 0.75,
            py: 0.5,
            borderBottomLeftRadius: 12,
            borderTopRightRadius: 12,
            bgcolor: "#F97316",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <StarIcon sx={{ fontSize: 16, color: "#FFFFFF" }} />
        </Box>
      )}

      <CardContent sx={{ pb: 1.5 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: avatarColor,
            }}
          >
            {showImage ? (
              <Box
                component="img"
                src={profilePhotoUrl}
                alt={name}
                sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setImageError(true)}
              />
            ) : (
              <Avatar
                sx={{
                  bgcolor: "transparent",
                  width: 40,
                  height: 40,
                  fontWeight: 700,
                  fontSize: 14,
                }}
              >
                {initials}
              </Avatar>
            )}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontWeight: 600,
                fontSize: 14,
                color: "#111827",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {name}
            </Typography>
            <Typography
              sx={{
                fontSize: 12,
                color: "#6B7280",
              }}
            >
              {title}
            </Typography>
          </Box>
        </Stack>

        <Typography
          sx={{
            mt: 1.5,
            mb: 1.5,
            fontSize: 13,
            color: "#6B7280",
            overflow: "hidden",
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 3,
          }}
        >
          {description}
        </Typography>

        <Stack
          direction="row"
          spacing={1.5}
          alignItems="center"
          sx={{ mb: 1 }}
          flexWrap="wrap"
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            <AccessTimeIcon sx={{ fontSize: 14, color: "#3B82F6" }} />
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              {yearsExperience} years exp.
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.5} alignItems="center">
            <PlaceOutlinedIcon sx={{ fontSize: 14, color: "#3B82F6" }} />
            <Typography sx={{ fontSize: 12, color: "#6B7280" }}>
              {location}
            </Typography>
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} flexWrap="wrap">
          {(tags ?? []).map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              sx={{
                borderRadius: 999,
                bgcolor: "#EEF2FF",
                color: "#4338CA",
                fontSize: 11,
              }}
            />
          ))}
        </Stack>

        <Stack
          direction="row"
          spacing={0.5}
          alignItems="center"
          sx={{ mt: 1.5 }}
        >
          <Stack direction="row" spacing={0.25} alignItems="center">
            {Array.from({ length: 5 }).map((_, index) => {
              const filled = index < Math.round(ratingValue);
              return (
                <StarIcon
                  key={index}
                  sx={{
                    fontSize: 16,
                    color: filled ? "#FACC15" : "#E5E7EB",
                  }}
                />
              );
            })}
          </Stack>
          <Typography sx={{ fontSize: 13, fontWeight: 600, ml: 1 }}>
            {ratingValue.toFixed(1)} ({reviewsValue} reviews)
          </Typography>
        </Stack>
      </CardContent>

      <CardActions
        sx={{
          mt: "auto",
          px: 2,
          pb: 2,
          pt: 0,
          display: "flex",
          gap: 1,
        }}
      >
        <CustomButton fullWidth variant="outlined" color="info" size="medium">
          Schedule
        </CustomButton>
        <CustomButton fullWidth variant="outlined" color="info" size="medium">
          Message
        </CustomButton>
      </CardActions>
    </Card>
  );
}
