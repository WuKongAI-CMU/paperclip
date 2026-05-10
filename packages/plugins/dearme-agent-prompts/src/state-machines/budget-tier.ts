/**
 * Daily-budget tier mapping for the DearMe Ads Manager role.
 *
 * The 24h rolling create window prevents pause+replace cycles from gaming the
 * creation quota. Tiers below are anchored to dollars-per-day.
 *
 * Lineage: derived from DearMe internal ads-research; adapted to a
 * personal-brand spend curve.
 */

export interface BudgetTier {
  id: "starter" | "growth" | "scale";
  /** Inclusive upper bound for daily budget in USD that maps to this tier. */
  dailyUsdMax: number;
  /** Max ads in flight (active + pending_upload). */
  maxParallelAds: number;
  /** Max create_ad calls in any rolling 24h window. */
  rollingCreateLimit: number;
}

export const BUDGET_TIERS: ReadonlyArray<BudgetTier> = [
  { id: "starter", dailyUsdMax: 10, maxParallelAds: 2, rollingCreateLimit: 2 },
  { id: "growth", dailyUsdMax: 30, maxParallelAds: 3, rollingCreateLimit: 3 },
  {
    id: "scale",
    dailyUsdMax: Number.POSITIVE_INFINITY,
    maxParallelAds: 5,
    rollingCreateLimit: 5,
  },
];

export function pickBudgetTier(dailyUsd: number): BudgetTier {
  for (const tier of BUDGET_TIERS) {
    if (dailyUsd <= tier.dailyUsdMax) return tier;
  }
  // BUDGET_TIERS is a non-empty const array; the last entry has Infinity cap
  // so this fallback is unreachable, but the type system needs the assertion.
  const fallback = BUDGET_TIERS[BUDGET_TIERS.length - 1];
  if (!fallback) throw new Error("BUDGET_TIERS is empty");
  return fallback;
}
