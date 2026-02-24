import React, { useState } from "react";
import { Box, Rating, TextField, Typography } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";

import CustomButton from "src/components/common/CustomButton";
import { useCreateReviewMutation } from "src/lib/services/reviewsApi";

import { StyledPaper } from "./StyledPaper";

const MAX_COMMENT_LENGTH = 500;

export function SubmitReviewForm({
  accountantId,
  onSuccess,
}: {
  accountantId: number;
  onSuccess?: () => void;
}) {
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
