import React from "react";
import type { SxProps, Theme } from "@mui/material";
import {
  Box,
  Typography,
  Rating,
  Stack,
  Paper,
  Avatar,
  useTheme,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import CustomButton from "src/components/common/CustomButton";

// ============ Types ============
interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: string;
  userInitial?: string;
}

interface RatingDistributionItem {
  stars: number;
  count: number;
}

interface ReviewCardProps {
  review: Review;
  showReadMore?: boolean;
}

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistributionItem[];
}

// ============ Constants ============
const MOCK_REVIEWS: Review[] = [
  {
    id: 1,
    author: "You",
    rating: 5,
    comment:
      "KaiB was amazing with our cats!! This was our first time using a pet-sitting service, so we were naturally quite anxious. We took a chance on Kai and completely lucked out! We booked Kai to come twice a day for three days. Kai spent a considerable amount of time playing and engaging with our cats. She also sent us very funny and detailed reports at the end of each session...",
    date: "Jan 20, 2024",
    userInitial: "C",
  },
  {
    id: 2,
    author: "CRK",
    rating: 5,
    comment:
      "KaiB was amazing with was our first time using a pet-sitting service, so we were naturally quite anxious. We took a chance on Kai and completely lucked out! We booked Kai to come twice a day",
    date: "Jan 20, 2024",
    userInitial: "C",
  },
];

const RATING_DISTRIBUTION: RatingDistributionItem[] = [
  { stars: 5, count: 488 },
  { stars: 4, count: 74 },
  { stars: 3, count: 14 },
  { stars: 2, count: 0 },
  { stars: 1, count: 0 },
];

const AVERAGE_RATING = 4.7;

// ============ Styled Paper Component ============
const StyledPaper = ({
  children,
  sx,
}: {
  children: React.ReactNode;
  sx?: SxProps<Theme>;
}) => (
  <Paper
    sx={{
      p: 3,
      borderRadius: 3,
      border: 1,
      borderColor: "divider",
      ...sx,
    }}
  >
    {children}
  </Paper>
);

// ============ Rating Distribution Bar Component ============
const RatingDistributionBar = ({
  item,
  total,
  theme,
}: {
  item: RatingDistributionItem;
  total: number;
  theme: Theme;
}) => {
  const percentage = total > 0 ? (item.count / total) * 100 : 0;

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Typography variant="body2" sx={{ minWidth: 60 }}>
        {item.stars} stars
      </Typography>
      <Box
        sx={{
          flex: 1,
          height: 8,
          bgcolor: theme.palette.grey[200],
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${percentage}%`,
            height: "100%",
            bgcolor: theme.palette.warning.main,
          }}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 40 }}>
        {item.count}
      </Typography>
    </Box>
  );
};

// ============ Rating Summary Component ============
const RatingSummary: React.FC<RatingSummaryProps> = ({
  averageRating,
  totalReviews,
  distribution,
}) => {
  const theme = useTheme();

  return (
    <StyledPaper>
      <Typography variant="h5" fontWeight={600} gutterBottom>
        Employee Reviews
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h3" fontWeight={600} color="text.primary">
          {averageRating}
        </Typography>
        <Box>
          <Rating
            value={averageRating}
            precision={0.1}
            readOnly
            size="large"
            emptyIcon={
              <StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />
            }
          />
          <Typography variant="body2" color="text.secondary">
            ({totalReviews} Reviews)
          </Typography>
        </Box>
      </Box>

      <Stack spacing={1} sx={{ mt: 3 }}>
        {distribution.map((item) => (
          <RatingDistributionBar
            key={item.stars}
            item={item}
            total={totalReviews}
            theme={theme}
          />
        ))}
      </Stack>
    </StyledPaper>
  );
};

// ============ Review Card Component ============
const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  showReadMore = true,
}) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        backgroundColor: theme.palette.grey[50],
        p: 2,
        mb: 1,
        borderRadius: 3,
      }}
    >
      <Avatar
        sx={{
          bgcolor: theme.palette.primary.main,
          color: theme.palette.common.white,
        }}
      >
        {review.userInitial || review.author.charAt(0)}
      </Avatar>

      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {review.author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {review.date}
            </Typography>
          </Box>
          <Rating value={review.rating} readOnly size="small" sx={{ mb: 1 }} />
        </Box>

        <Typography variant="body2" color="text.primary">
          {review.comment}
          {showReadMore && review.comment.length > 100 && (
            <CustomButton component="span" variant="text" color="primary">
              Read More
            </CustomButton>
          )}
        </Typography>
      </Box>
    </Box>
  );
};

// ============ Main Component ============
export default function ProfileReviewsTab() {
  const totalReviews = RATING_DISTRIBUTION.reduce(
    (sum, item) => sum + item.count,
    0,
  );

  return (
    <Stack spacing={3}>
      <RatingSummary
        averageRating={AVERAGE_RATING}
        totalReviews={totalReviews}
        distribution={RATING_DISTRIBUTION}
      />

      <Box sx={{ p: 2 }}>
        {MOCK_REVIEWS.map((review) => (
          <ReviewCard key={review.id} review={review} />
        ))}
      </Box>
    </Stack>
  );
}
