/** Loyalty tiers (docs/02-database.md · loyaltyLedger). Pure, so it is safe on the client and in tests. */
export const TIERS = [
  { tier: "Bronze", min: 0, color: "#c8875a" },
  { tier: "Silver", min: 500, color: "#c9cdd6" },
  { tier: "Gold", min: 2000, color: "#e5c07b" },
  { tier: "VIP", min: 6000, color: "#d97a86" },
] as const;

export const POINTS_PER_DT = 1;
export const POINTS_PER_REVIEW = 50;

/** Points = 1 per dinar of completed visits + 50 per verified review. */
export function loyaltyFor(completedSpendMillimes: number, reviewCount: number) {
  const points = Math.floor(completedSpendMillimes / 1000) * POINTS_PER_DT + reviewCount * POINTS_PER_REVIEW;
  const idx = TIERS.reduce((acc, t, i) => (points >= t.min ? i : acc), 0);
  const next = TIERS[idx + 1];
  return {
    points,
    tier: TIERS[idx],
    next: next ? { tier: next.tier, missing: next.min - points, progress: (points - TIERS[idx].min) / (next.min - TIERS[idx].min) } : null,
  };
}
