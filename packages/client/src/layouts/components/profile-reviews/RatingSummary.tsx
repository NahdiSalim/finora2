import React from "react";
import { Box, Rating, Stack, Typography, useTheme } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";

import type { RatingDistributionItem } from "./types";
import { StyledPaper } from "./StyledPaper";

function RatingDistributionBar({
  item,
  total,
}: {
  item: RatingDistributionItem;
  total: number;
}) {
  const theme = useTheme();
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
}

export function RatingSummary({
  averageRating,
  totalReviews,
  distribution,
}: {
  averageRating: number;
  totalReviews: number;
  distribution: RatingDistributionItem[];
}) {
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
          />
        ))}
      </Stack>
    </StyledPaper>
  );
}
