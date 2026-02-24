import React, { useState } from "react";
import {
  Avatar,
  Box,
  Rating,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import CustomButton from "src/components/common/CustomButton";
import type { ReviewItem } from "src/lib/services/reviewsApi";
import { useRespondToReviewMutation } from "src/lib/services/reviewsApi";

import { reviewToAuthorName, reviewToInitial } from "./utils";

export function ReviewCard({
  item,
  isAccountantView = false,
  onRespondSuccess,
}: {
  item: ReviewItem;
  isAccountantView?: boolean;
  onRespondSuccess?: () => void;
}) {
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
}
