import React, { useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Stack,
  Avatar,
  Tooltip,
  useTheme,
  Box,
  Rating,
  Zoom,
  Fade,
  Grow,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import VerifiedIcon from "@mui/icons-material/Verified";
import CustomButton from "../common/CustomButton";
import CustomChip from "../common/CustomChip";
import { motion } from "framer-motion";

// ----------------------------------------------------------------------

export interface Accountant {
  name: string;
  initials: string;
  avatarColor: string;
  yearsExperience: number;
  location: string;
  rating: number;
  reviews: number;
  tags: string[];
  profilePhotoUrl?: string;
  title: string;
  description: string;
  featured?: boolean;
  verified?: boolean;
}

interface AccountantCardProps {
  data: Accountant;
  highlighted?: boolean;
  index?: number;
}

// ----------------------------------------------------------------------

// Animation variants for framer-motion
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
    },
  }),
  hover: {
    y: -8,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1],
    },
  },
};

const tagVariants = {
  hidden: { scale: 0.8, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: {
      duration: 0.3,
    },
  },
  hover: {
    scale: 1.05,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
};

export function AccountantCard({
  data,
  highlighted = false,
  index = 0,
}: AccountantCardProps) {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    name,
    initials,
    avatarColor,
    yearsExperience,
    location,
    rating,
    reviews,
    tags,
    profilePhotoUrl,
    title,
    description,
    featured,
    verified = false,
  } = data;

  const isHighlighted = highlighted || featured;

  return (
    <motion.div
      custom={index}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      variants={cardVariants}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      style={{ height: "100%" }}
    >
      <Card
        sx={{
          height: "100%",
          borderRadius: 3,
          position: "relative",
          overflow: "visible",
          background: isHighlighted
            ? `linear-gradient(135deg, ${theme.palette.secondary.light} 0%, ${theme.palette.background.paper} 100%)`
            : theme.palette.background.paper,
          border: isHighlighted
            ? `2px solid ${theme.palette.secondary.main}`
            : `1px solid ${theme.palette.divider}`,
          boxShadow: isHovered
            ? theme.shadows[12]
            : isHighlighted
              ? theme.shadows[4]
              : theme.shadows[1],
          transition: "box-shadow 0.3s ease-in-out",
        }}
      >
        {/* Featured Badge with animation */}
        <Zoom in style={{ transitionDelay: "0.2s" }}>
          <Box
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 10,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            {verified && (
              <Tooltip title="Verified Professional" arrow>
                <VerifiedIcon
                  sx={{
                    fontSize: 20,
                    color: theme.palette.primary.main,
                    filter: `drop-shadow(0 2px 4px ${theme.palette.primary.main}40)`,
                  }}
                />
              </Tooltip>
            )}
            {featured && <CustomChip label="Featured" />}
          </Box>
        </Zoom>

        <CardContent sx={{ p: 3 }}>
          {/* Header row with animated avatar */}
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={profilePhotoUrl}
              alt={name}
              sx={{
                bgcolor: avatarColor,
                fontWeight: 600,
                borderRadius: 2,
                width: 56,
                height: 56,
              }}
            >
              {!profilePhotoUrl && initials}
            </Avatar>

            <Stack spacing={0.5} sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Tooltip title={name} arrow TransitionComponent={Zoom}>
                  <Typography
                    variant="body1"
                    fontWeight={600}
                    sx={{
                      maxWidth: 140,
                      color: isHighlighted
                        ? theme.palette.secondary.main
                        : "text.primary",
                    }}
                  >
                    {name}
                  </Typography>
                </Tooltip>
                <Fade in={verified}>
                  <VerifiedIcon
                    sx={{
                      fontSize: 16,
                      color: theme.palette.primary.main,
                      opacity: verified ? 1 : 0,
                    }}
                  />
                </Fade>
              </Box>

              <Tooltip title={title} arrow TransitionComponent={Zoom}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    fontWeight: 500,
                    maxWidth: 160,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {title}
                </Typography>
              </Tooltip>
            </Stack>
          </Stack>

          {/* Description with expand animation */}
          <Box sx={{ mt: 2 }}>
            <motion.div
              animate={{ height: isExpanded ? "auto" : "3em" }}
              transition={{ duration: 0.3 }}
              style={{ overflow: "hidden" }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  lineHeight: 1.6,
                  display: "-webkit-box",
                  WebkitLineClamp: isExpanded ? "unset" : 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {description}
              </Typography>
            </motion.div>
            {description.length > 100 && (
              <Typography
                variant="caption"
                color="primary"
                sx={{
                  mt: 0.5,
                  cursor: "pointer",
                  fontWeight: 600,
                  display: "inline-block",
                  "&:hover": { textDecoration: "underline" },
                }}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? "Show less" : "Read more"}
              </Typography>
            )}
          </Box>

          {/* Tags with staggered animation */}
          {tags.length > 0 && (
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              sx={{ mt: 2, gap: 0.5 }}
            >
              {tags.map((tag, idx) => (
                <motion.div
                  key={tag}
                  variants={tagVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  transition={{ delay: 0.3 + idx * 0.05 }}
                >
                  <CustomChip label={tag} />
                </motion.div>
              ))}
            </Stack>
          )}

          {/* Info row with animated icons */}
          <Stack
            direction="row"
            spacing={2}
            alignItems="center"
            flexWrap="wrap"
            sx={{ mt: 2 }}
          >
            <motion.div
              whileHover={{ scale: 1.05, x: 2 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <AccessTimeIcon
                  sx={{
                    fontSize: 18,
                    color: theme.palette.primary.main,
                    opacity: 0.8,
                  }}
                />
                <Typography variant="caption" fontWeight={500}>
                  {yearsExperience} {yearsExperience > 1 ? "years" : "year"}{" "}
                  exp.
                </Typography>
              </Stack>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.05, x: 2 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ minWidth: 0 }}
              >
                <PlaceOutlinedIcon
                  sx={{
                    fontSize: 18,
                    color: theme.palette.primary.main,
                    opacity: 0.8,
                  }}
                />
                <Tooltip title={location} arrow TransitionComponent={Zoom}>
                  <Typography
                    variant="caption"
                    fontWeight={500}
                    noWrap
                    sx={{
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {location}
                  </Typography>
                </Tooltip>
              </Stack>
            </motion.div>
          </Stack>

          {/* Rating with animation */}
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ mt: 1.5 }}
          >
            <Rating
              value={rating}
              precision={0.1}
              size="small"
              readOnly
              sx={{
                "& .MuiRating-iconFilled": {
                  color: theme.palette.warning.main,
                  filter: isHovered ? "brightness(1.1)" : "none",
                  transition: "filter 0.2s ease",
                },
              }}
            />
            <Typography variant="caption" fontWeight={600}>
              {rating.toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ({reviews} {reviews > 1 ? "reviews" : "review"})
            </Typography>
          </Stack>

          {/* Action buttons with animations */}
          <Grow in timeout={500}>
            <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ flex: 1 }}
              >
                <CustomButton
                  variant="contained"
                  color="primary"
                  fullWidth
                  startIcon={<CalendarTodayIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: isHovered
                      ? `0 8px 16px ${theme.palette.primary.main}40`
                      : "none",
                    transition: "box-shadow 0.3s ease",
                  }}
                >
                  Schedule
                </CustomButton>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ flex: 1 }}
              >
                <CustomButton
                  variant="outlined"
                  color="info"
                  fullWidth
                  startIcon={<ChatBubbleOutlineIcon />}
                  sx={{
                    borderRadius: 2,
                    textTransform: "none",
                    fontWeight: 600,
                    borderWidth: 2,
                    "&:hover": {
                      borderWidth: 2,
                    },
                  }}
                >
                  Message
                </CustomButton>
              </motion.div>
            </Stack>
          </Grow>
        </CardContent>
      </Card>
    </motion.div>
  );
}
