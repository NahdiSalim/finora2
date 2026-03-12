import type { ReviewItem } from "src/lib/services/reviewsApi";
import type { RatingDistributionItem } from "./types";

export function reviewToAuthorName(item: ReviewItem): string {
  const { client } = item;
  const parts = [client.firstName, client.lastName].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : "Client";
}

export function reviewToInitial(item: ReviewItem): string {
  const name = reviewToAuthorName(item);
  return name.charAt(0).toUpperCase() || "?";
}

export function computeDistribution(
  reviews: ReviewItem[],
): RatingDistributionItem[] {
  const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5)
      counts[r.rating] = (counts[r.rating] ?? 0) + 1;
  });
  return [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: counts[stars] ?? 0,
  }));
}
