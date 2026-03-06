import React, { useState } from "react";
import type { SxProps, Theme } from "@mui/material";
import {
  Box,
  Typography,
  Rating,
  Stack,
  Paper,
  Avatar,
  useTheme,
  Skeleton,
  TextField,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import SendIcon from "@mui/icons-material/Send";
import CustomButton from "src/components/common/CustomButton";
import {
  useGetAccountantReviewsQuery,
  useCreateReviewMutation,
  useRespondToReviewMutation,
} from "src/lib/services/reviewsApi";
import type { ReviewItem } from "src/lib/services/reviewsApi";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

// ============ Types ============
interface RatingDistributionItem {
  stars: number;
  count: number;
}

interface RatingSummaryProps {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistributionItem[];
}

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
        {item.stars} étoiles
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
        Avis
      </Typography>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 2 }}>
        <Typography variant="h3" fontWeight={600} color="text.primary">
          {totalReviews > 0 ? averageRating.toFixed(1) : "-"}
        </Typography>
        <Box>
          <Rating
            value={totalReviews > 0 ? averageRating : 0}
            precision={0.1}
            readOnly
            size="large"
            emptyIcon={
              <StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />
            }
          />
          <Typography variant="body2" color="text.secondary">
            ({totalReviews} avis)
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
function reviewToAuthorName(item: ReviewItem): string {
  const { client } = item;
  const parts = [client.firstName, client.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Client";
}

function reviewToInitial(item: ReviewItem): string {
  const name = reviewToAuthorName(item);
  return name.charAt(0).toUpperCase() || "?";
}

interface ReviewCardProps {
  item: ReviewItem;
  isAccountantView?: boolean;
  onRespondSuccess?: () => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  item,
  isAccountantView = false,
  onRespondSuccess,
}) => {
  const theme = useTheme();
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [respondToReview, { isLoading: isResponding }] =
    useRespondToReviewMutation();

  const author = reviewToAuthorName(item);
  const initial = reviewToInitial(item);
  const dateStr = format(new Date(item.createdAt), "d MMM yyyy", {
    locale: fr,
  });
  const comment = item.comment ?? "";
  const hasResponse = Boolean(item.response?.trim());

  const handleSendResponse = async () => {
    if (!replyText.trim()) return;
    try {
      await respondToReview({
        reviewId: item.id,
        response: replyText.trim(),
      }).unwrap();
      setReplyText("");
      setShowReplyInput(false);
      onRespondSuccess?.();
    } catch {
      // Error handled by API
    }
  };

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
        {initial}
      </Avatar>

      <Box sx={{ flex: 1 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
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
              {author}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {dateStr}
            </Typography>
          </Box>
          <Rating value={item.rating} readOnly size="small" />
        </Box>

        <Typography variant="body2" color="text.primary">
          {comment}
        </Typography>

        {hasResponse && (
          <Box
            sx={{
              mt: 2,
              pl: 2,
              borderLeft: 2,
              borderColor: theme.palette.primary.light,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
            >
              Réponse du cabinet
            </Typography>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {item.response}
            </Typography>
          </Box>
        )}

        {isAccountantView && !hasResponse && (
          <Box sx={{ mt: 2 }}>
            {!showReplyInput ? (
              <CustomButton
                size="small"
                variant="outlined"
                onClick={() => setShowReplyInput(true)}
              >
                Répondre
              </CustomButton>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <TextField
                  multiline
                  minRows={2}
                  placeholder="Votre réponse..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  size="small"
                  fullWidth
                />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <CustomButton
                    size="small"
                    variant="contained"
                    onClick={handleSendResponse}
                    disabled={!replyText.trim() || isResponding}
                    startIcon={<SendIcon />}
                  >
                    Envoyer
                  </CustomButton>
                  <CustomButton
                    size="small"
                    variant="text"
                    onClick={() => {
                      setShowReplyInput(false);
                      setReplyText("");
                    }}
                  >
                    Annuler
                  </CustomButton>
                </Box>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const MAX_COMMENT_LENGTH = 500;

// ============ Submit Review Form ============
interface SubmitReviewFormProps {
  accountantId: number;
  onSuccess?: () => void;
}

function SubmitReviewForm({ accountantId, onSuccess }: SubmitReviewFormProps) {
  const theme = useTheme();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [createReview, { isLoading }] = useCreateReviewMutation();

  const handleSubmit = async () => {
    if (rating < 1 || rating > 5) return;
    try {
      await createReview({
        accountantId,
        rating,
        comment: comment.trim() || undefined,
      }).unwrap();
      setRating(0);
      setComment("");
      onSuccess?.();
    } catch {
      // Error handled by API / global handler
    }
  };

  return (
    <StyledPaper>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        Partagez votre avis
      </Typography>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Rating
          value={rating}
          onChange={(_, value) => setRating(value ?? 0)}
          size="large"
          emptyIcon={<StarIcon style={{ opacity: 0.55 }} fontSize="inherit" />}
        />
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Votre commentaire :
      </Typography>
      <TextField
        multiline
        minRows={3}
        maxRows={8}
        fullWidth
        placeholder="Partagez votre expérience..."
        value={comment}
        onChange={(e) =>
          setComment(e.target.value.slice(0, MAX_COMMENT_LENGTH))
        }
        inputProps={{ maxLength: MAX_COMMENT_LENGTH }}
        sx={{ mb: 1 }}
      />
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ mb: 2, display: "block" }}
      >
        {comment.length}/{MAX_COMMENT_LENGTH} caractères
      </Typography>
      <CustomButton
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        disabled={rating < 1 || isLoading}
      >
        Soumettre mon avis
      </CustomButton>
    </StyledPaper>
  );
}

function computeDistribution(reviews: ReviewItem[]): RatingDistributionItem[] {
  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5)
      counts[r.rating] = (counts[r.rating] ?? 0) + 1;
  });
  return [5, 4, 3, 2, 1].map((stars) => ({ stars, count: counts[stars] ?? 0 }));
}

// ============ Main Component ============
interface ProfileReviewsTabProps {
  /** Current profile user id (accountant). When undefined, tab may show empty or skip fetch. */
  accountantId?: number;
  /** When true, current user is the accountant (can respond to reviews) */
  isAccountantView?: boolean;
  /** When true, show form to submit a new review (client viewing accountant profile) */
  allowSubmitReview?: boolean;
}

export default function ProfileReviewsTab({
  accountantId,
  isAccountantView = true,
  allowSubmitReview = false,
}: ProfileReviewsTabProps) {
  const { data, isLoading, isError, refetch } = useGetAccountantReviewsQuery(
    { accountantId: accountantId!, page: 1, limit: 50 },
    { skip: accountantId == null || accountantId === 0 },
  );

  const theme = useTheme();

  if (accountantId == null || accountantId === 0) {
    return (
      <StyledPaper>
        <Typography variant="body2" color="text.secondary">
          Chargement du profil…
        </Typography>
      </StyledPaper>
    );
  }

  if (isLoading) {
    return (
      <Stack spacing={3}>
        <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
        <Skeleton variant="rectangular" height={100} sx={{ borderRadius: 3 }} />
      </Stack>
    );
  }

  if (isError) {
    return (
      <StyledPaper>
        <Typography color="error">Impossible de charger les avis.</Typography>
      </StyledPaper>
    );
  }

  const reviews = data?.data ?? [];
  const totalReviews = data?.pagination?.total ?? 0;
  const averageRating = data?.averageRating ?? 0;
  const distribution = computeDistribution(reviews);

  return (
    <Stack spacing={3}>
      <RatingSummary
        averageRating={averageRating}
        totalReviews={totalReviews}
        distribution={distribution}
      />

      {allowSubmitReview && accountantId != null && (
        <SubmitReviewForm
          accountantId={accountantId}
          onSuccess={() => refetch()}
        />
      )}

      <Box sx={{ p: 2 }}>
        {reviews.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun avis pour le moment.
          </Typography>
        ) : (
          reviews.map((item) => (
            <ReviewCard
              key={item.id}
              item={item}
              isAccountantView={isAccountantView}
            />
          ))
        )}
      </Box>
    </Stack>
  );
}
