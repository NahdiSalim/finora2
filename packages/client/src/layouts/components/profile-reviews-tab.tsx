import React from "react";
import { Box, Skeleton, Stack, Typography } from "@mui/material";

import { useGetAccountantReviewsQuery } from "src/lib/services/reviewsApi";

import { ReviewCard } from "./profile-reviews/ReviewCard";
import { RatingSummary } from "./profile-reviews/RatingSummary";
import { StyledPaper } from "./profile-reviews/StyledPaper";
import { SubmitReviewForm } from "./profile-reviews/SubmitReviewForm";
import { computeDistribution } from "./profile-reviews/utils";

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
