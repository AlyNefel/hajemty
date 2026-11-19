/**
 * Pure review statistics, shared by the public page, the dashboard and the ranking. It has no
 * imports so it can be unit-tested with plain `node --test`.
 */
export type ReviewStats = {
  average: number; // 0 when there are no reviews, otherwise rounded to 1 decimal
  count: number;
  /** distribution[0] = number of 1★ … distribution[4] = number of 5★ */
  distribution: [number, number, number, number, number];
  replied: number;
  responseRate: number; // 0..1
};

export function reviewStats(reviews: { rating: number; reply?: unknown; status?: string }[]): ReviewStats {
  const visible = reviews.filter((r) => r.status !== "hidden");
  const distribution: ReviewStats["distribution"] = [0, 0, 0, 0, 0];
  let sum = 0;
  let replied = 0;
  for (const r of visible) {
    const star = Math.min(5, Math.max(1, Math.round(r.rating)));
    distribution[star - 1]++;
    sum += star;
    if (r.reply) replied++;
  }
  const count = visible.length;
  return {
    average: count ? Math.round((sum / count) * 10) / 10 : 0,
    count,
    distribution,
    replied,
    responseRate: count ? replied / count : 0,
  };
}

/**
 * Bayesian average used for ranking (docs/06-analytics.md §7.4): pulls low-volume centers toward
 * the platform prior `m`, so one 5★ review never outranks 300 reviews at 4.8★.
 */
export const bayesianRating = (average: number, count: number, m = 4.2, C = 10) => (C * m + average * count) / (C + count);
